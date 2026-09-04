import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { messages, projects, generationPlans } from "@/db/schema";
import { eq, asc, desc } from "drizzle-orm";
import { callDirector, type ChatMessage, type ContentPart } from "@/lib/openrouter";

async function getSessionUser(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  return session?.user || null;
}

function extractPlanFromText(text: string): any {
  // Try to find JSON object with task_type or tasktype
  const patterns = [
    /\{[\s\S]*?"task_type"[\s\S]*?"prompt"[\s\S]*?\}/,
    /\{[\s\S]*?"tasktype"[\s\S]*?"prompt"[\s\S]*?\}/,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      // Find matching closing brace
      let braceCount = 0;
      let endIdx = 0;
      for (let i = 0; i < match[0].length; i++) {
        if (match[0][i] === "{") braceCount++;
        if (match[0][i] === "}") braceCount--;
        if (braceCount === 0) { endIdx = i + 1; break; }
      }
      const jsonStr = match[0].substring(0, endIdx);
      try {
        return JSON.parse(jsonStr);
      } catch {
        continue;
      }
    }
  }
  return null;
}

function cleanResponseText(text: string): string {
  return text
    .replace(/<generation_plan>[\s\S]*?<\/generation_plan>/g, "")
    .replace(/```[\s\S]*?```/g, "")
    .replace(/\{"task_type"[\s\S]*?\}/g, "")
    .replace(/\{"tasktype"[\s\S]*?\}/g, "")
    .replace(/<[^>]*generation[^>]*>/g, "")
    .trim();
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

  // Build OpenRouter messages — only include images from most recent message
  const recentHistory = history.slice(-20);

  // Find the last message with attachments
  let lastAttachmentMsgIdx = -1;
  for (let i = recentHistory.length - 1; i >= 0; i--) {
    const c = recentHistory[i].content as any;
    if (c?.attachments?.length > 0) {
      lastAttachmentMsgIdx = i;
      break;
    }
  }

  const openRouterMessages: ChatMessage[] = recentHistory.map((m, idx) => {
    const role = m.role as "user" | "assistant";
    const msgContent = m.content;

    if (typeof msgContent === "object" && msgContent !== null) {
      const contentObj = msgContent as any;
      const text = contentObj.text || "";
      const attachments = contentObj.attachments || [];

      // Only include images from the most recent message with attachments
      const showImages = idx === lastAttachmentMsgIdx;

      if (attachments.length > 0 && showImages) {
        const parts: ContentPart[] = [];
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
        for (const att of attachments) {
          if (att.mimeType?.startsWith("image/") && att.url) {
            const fullUrl = att.url.startsWith("http") || att.url.startsWith("data:")
              ? att.url : `${baseUrl}${att.url}`;
            parts.push({ type: "image_url", image_url: { url: fullUrl } });
          }
        }
        const videos = attachments.filter((a: any) => a.mimeType?.startsWith("video/"));
        if (videos.length > 0) {
          const videoLabels = videos.map((v: any) => {
            const label = v.customName || v.name || "video reference";
            return `[Video: "${label}"]`;
          }).join("\n");
          parts.push({ type: "text", text: videoLabels });
        }
        const refLabels = attachments
          .filter((a: any) => a.customName)
          .map((a: any) => `@${a.customName} (${a.kind || "ref"})`)
          .join(", ");
        const fullText = refLabels ? `[Refs: ${refLabels}]\n${text}` : text;
        parts.push({ type: "text", text: fullText });
        return { role, content: parts };
      }

      // For older messages, only include text (no images)
      return { role, content: text };
    }
    return { role, content: String(msgContent) };
  });

  // Call Director AI
  try {
    const response = await callDirector(user.id, openRouterMessages);
    let responseText = response.text;

    console.log("[Director raw response length]:", responseText.length);
    console.log("[Director raw response start]:", responseText.substring(0, 500));

    // Try to extract plan from response
    let generationPlan = null;
    const rawPlan = extractPlanFromText(responseText);

    if (rawPlan) {
      console.log("[Plan found in response]");
      const planData = {
        task_type: rawPlan.task_type || rawPlan.tasktype || "reference_to_video",
        prompt: rawPlan.prompt || "",
        reference_urls: rawPlan.reference_urls || rawPlan.referenceurls || [],
        asset_urls: {
          character: rawPlan.asset_urls?.character || rawPlan.asseturls?.character || null,
          product: rawPlan.asset_urls?.product || rawPlan.asseturls?.product || null,
          location: rawPlan.asset_urls?.location || rawPlan.asseturls?.location || null,
        },
        settings: {
          duration: rawPlan.settings?.duration || 10,
          resolution: rawPlan.settings?.resolution || "720p",
          aspect_ratio: rawPlan.settings?.aspect_ratio || rawPlan.settings?.aspectratio || "16:9",
        },
        estimated_credits: rawPlan.estimated_credits || rawPlan.estimatedcredits || 0,
      };

      // Save to DB
      const planId = crypto.randomUUID();
      await db.insert(generationPlans).values({
        id: planId,
        projectId,
        taskType: planData.task_type,
        prompt: planData.prompt,
        referenceUrls: planData.reference_urls as any,
        assetUrls: planData.asset_urls as any,
        settings: planData.settings as any,
        estimatedCredits: planData.estimated_credits,
        status: "pending",
        createdAt: new Date(),
      } as any);

      generationPlan = { id: planId, ...planData };
    } else {
      console.log("[No plan found in response]");
      // Check if user is confirming a previous plan
      const userText = (typeof content === "string" ? content : (content as any)?.text || "").toLowerCase();
      const isConfirming = ["generate", "yes", "go ahead", "do it", "make it", "lets go", "let's go"].some(
        (w) => userText.includes(w)
      );

      if (isConfirming) {
        // Look for the most recent pending plan in this project
        const lastPlan = await db
          .select()
          .from(generationPlans)
          .where(eq(generationPlans.projectId, projectId))
          .orderBy(desc(generationPlans.createdAt))
          .limit(1);

        if (lastPlan.length > 0 && lastPlan[0].status === "pending") {
          console.log("[Using previous plan]:", lastPlan[0].id);
          const assetUrls = lastPlan[0].assetUrls as any;
          const settings = lastPlan[0].settings as any;
          generationPlan = {
            id: lastPlan[0].id,
            task_type: lastPlan[0].taskType,
            prompt: lastPlan[0].prompt,
            reference_urls: lastPlan[0].referenceUrls,
            asset_urls: {
              character: assetUrls?.character || null,
              product: assetUrls?.product || null,
              location: assetUrls?.location || null,
            },
            settings: {
              duration: settings?.duration || 10,
              resolution: settings?.resolution || "720p",
              aspect_ratio: settings?.aspect_ratio || "16:9",
            },
            estimated_credits: lastPlan[0].estimatedCredits || 0,
          };
        }
      }
    }

    // Clean displayed text
    responseText = cleanResponseText(responseText);

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

    console.log("[Response sent] plan:", !!generationPlan, "text length:", responseText.length);

    return NextResponse.json({
      text: responseText || "Ready to generate.",
      model: response.model,
      messageId: assistantMsgId,
      generationPlan,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to get response";
    console.error("[Chat error]:", message);
    console.error("[Chat error stack]:", error instanceof Error ? error.stack : "no stack");
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
