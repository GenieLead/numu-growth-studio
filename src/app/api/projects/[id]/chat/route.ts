import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { messages, projects, generationPlans } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { callDirector, type ChatMessage, type ContentPart } from "@/lib/openrouter";

async function getSessionUser(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  return session?.user || null;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: projectId } = await params;
  const body = await request.json();
  const { content } = body;

  if (!content) {
    return NextResponse.json({ error: "content required" }, { status: 400 });
  }

  // Verify project ownership
  const project = await db
    .select()
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1);
  if (!project.length || project[0].userId !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Fetch full conversation history
  const history = await db
    .select()
    .from(messages)
    .where(eq(messages.projectId, projectId))
    .orderBy(asc(messages.createdAt));

  // Build OpenRouter messages — include images in every message that has them
  const recentHistory = history.slice(-30);
  const openRouterMessages: ChatMessage[] = recentHistory.map((m) => {
    const role = m.role as "user" | "assistant";
    const msgContent = m.content;

    if (typeof msgContent === "object" && msgContent !== null) {
      const contentObj = msgContent as any;
      const text = contentObj.text || "";
      const attachments = contentObj.attachments || [];

      if (attachments.length > 0) {
        const parts: ContentPart[] = [];

        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
        for (const att of attachments) {
          if (att.mimeType?.startsWith("image/") && att.url) {
            const fullUrl = att.url.startsWith("http") || att.url.startsWith("data:")
              ? att.url
              : `${baseUrl}${att.url}`;
            parts.push({
              type: "image_url",
              image_url: { url: fullUrl },
            });
          }
        }

        const videos = attachments.filter((a: any) => a.mimeType?.startsWith("video/"));
        if (videos.length > 0) {
          const videoLabels = videos.map((v: any) => {
            const label = v.customName || v.name || "video reference";
            return `[Video uploaded: "${label}" — user should describe motion/pacing]`;
          }).join("\n");
          parts.push({ type: "text", text: videoLabels });
        }

        const refLabels = attachments
          .filter((a: any) => a.customName)
          .map((a: any) => `@${a.customName} (${a.kind || "reference"})`)
          .join(", ");

        const fullText = refLabels
          ? `[References: ${refLabels}]\n${text}`
          : text;

        parts.push({ type: "text", text: fullText });

        return { role, content: parts };
      }

      return { role, content: text };
    }

    return { role, content: String(msgContent) };
  });

  // Call Director AI
  try {
    const response = await callDirector(user.id, openRouterMessages);
    let responseText = response.text;
    let generationPlan = null;

    // Try to find and parse generation plan JSON from the response
    // The Director may output it in various formats
    const jsonPatterns = [
      /\{"task_type"[\s\S]*?"prompt"[\s\S]*?\}/,
      /\{"tasktype"[\s\S]*?"prompt"[\s\S]*?\}/,
    ];

    for (const pattern of jsonPatterns) {
      const match = responseText.match(pattern);
      if (match) {
        try {
          // Find the matching closing brace
          let braceCount = 0;
          let endIdx = 0;
          for (let i = 0; i < match[0].length; i++) {
            if (match[0][i] === "{") braceCount++;
            if (match[0][i] === "}") braceCount--;
            if (braceCount === 0) { endIdx = i + 1; break; }
          }
          const jsonStr = match[0].substring(0, endIdx);
          const raw = JSON.parse(jsonStr);

          // Normalize and save
          const planData = {
            task_type: raw.task_type || raw.tasktype || "reference_to_video",
            prompt: raw.prompt || "",
            reference_urls: raw.reference_urls || raw.referenceurls || [],
            asset_urls: {
              character: raw.asset_urls?.character || raw.asseturls?.character || null,
              product: raw.asset_urls?.product || raw.asseturls?.product || null,
              location: raw.asset_urls?.location || raw.asseturls?.location || null,
            },
            settings: {
              duration: raw.settings?.duration || 10,
              resolution: raw.settings?.resolution || "720p",
              aspect_ratio: raw.settings?.aspect_ratio || raw.settings?.aspectratio || "16:9",
            },
            estimated_credits: raw.estimated_credits || raw.estimatedcredits || 0,
          };

          // Save to generation_plans table
          const planId = crypto.randomUUID();
          await db.insert(generationPlans).values({
            id: planId,
            projectId,
            taskType: planData.task_type,
            prompt: planData.prompt,
            referenceUrls: planData.reference_urls,
            assetUrls: planData.asset_urls,
            settings: planData.settings,
            estimatedCredits: planData.estimated_credits,
            status: "pending",
            createdAt: new Date(),
          });

          generationPlan = { id: planId, ...planData };

          // Remove all JSON-like content from displayed text
          responseText = responseText
            .replace(/<generation_plan>[\s\S]*?<\/generation_plan>/g, "")
            .replace(/```[\s\S]*?```/g, "")
            .replace(/\{"task_type"[\s\S]*?\}/g, "")
            .replace(/\{"tasktype"[\s\S]*?\}/g, "")
            .trim();
          break;
        } catch (e) {
          console.error("Failed to parse generation plan:", e);
        }
      }
    }

    // If we still have leftover JSON tags, strip them
    responseText = responseText
      .replace(/<generation_plan>[\s\S]*/g, "")
      .replace(/```json[\s\S]*/g, "")
      .trim();

    // Save assistant message
    const assistantMsgId = crypto.randomUUID();
    await db.insert(messages).values({
      id: assistantMsgId,
      projectId,
      role: "assistant",
      content: responseText || "Ready to generate.",
      generationPlanId: generationPlan?.id || null,
      createdAt: new Date(),
    });

    return NextResponse.json({
      text: responseText || "Ready to generate.",
      model: response.model,
      messageId: assistantMsgId,
      generationPlan,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to get response";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
