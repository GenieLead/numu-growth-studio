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

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { id: projectId } = await params;
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

  // Fetch conversation history
  const history = await db
    .select()
    .from(messages)
    .where(eq(messages.projectId, projectId))
    .orderBy(asc(messages.createdAt));

  // Build OpenRouter messages — only recent images
  const recentHistory = history.slice(-20);
  let lastAttachmentMsgIdx = -1;
  for (let i = recentHistory.length - 1; i >= 0; i--) {
    const c = recentHistory[i].content as any;
    if (c?.attachments?.length > 0) { lastAttachmentMsgIdx = i; break; }
  }

  const openRouterMessages: ChatMessage[] = recentHistory.map((m, idx) => {
    const role = m.role as "user" | "assistant";
    const msgContent = m.content;
    if (typeof msgContent === "object" && msgContent !== null) {
      const contentObj = msgContent as any;
      const text = contentObj.text || "";
      const attachments = contentObj.attachments || [];
      const showImages = idx === lastAttachmentMsgIdx;
      if (attachments.length > 0 && showImages) {
        const parts: ContentPart[] = [];
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
        for (const att of attachments) {
          if (att.mimeType?.startsWith("image/") && att.url) {
            const fullUrl = att.url.startsWith("http") ? att.url : `${baseUrl}${att.url}`;
            parts.push({ type: "image_url", image_url: { url: fullUrl } });
          }
        }
        const videos = attachments.filter((a: any) => a.mimeType?.startsWith("video/"));
        if (videos.length > 0) {
          parts.push({ type: "text", text: videos.map((v: any) => `[Video: "${v.customName || v.name}"]`).join("\n") });
        }
        const refLabels = attachments.filter((a: any) => a.customName).map((a: any) => `@${a.customName}`).join(", ");
        if (refLabels) parts.push({ type: "text", text: `[Refs: ${refLabels}]\n${text}` });
        else parts.push({ type: "text", text });
        return { role, content: parts };
      }
      return { role, content: text };
    }
    return { role, content: String(msgContent) };
  });

  try {
    const response = await callDirector(user.id, openRouterMessages);
    let responseText = response.text;
    let generationPlan = null;

    // Try to extract plan from Director response
    const rawPlan = extractPlanFromText(responseText);
    if (rawPlan) {
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
      generationPlan = await savePlan(projectId, planData);
    }

    // If no plan in response, always build from context when user confirms
    if (!generationPlan) {
      const userText = (typeof content === "string" ? content : (content as any)?.text || "").toLowerCase();
      const isConfirming = ["generate", "yes", "go ahead", "do it", "make it", "lets go", "let's go", "confirm", "ok", "sure"].some(
        (w) => userText.includes(w)
      );

      if (isConfirming) {
        console.log("[Building plan from context]");
        const contextPlan = buildPlanFromContext(history, projectId);
        generationPlan = await savePlan(projectId, contextPlan);
      }
    }

    responseText = cleanResponseText(responseText);

    const assistantMsgId = crypto.randomUUID();
    await db.insert(messages).values({
      id: assistantMsgId,
      projectId,
      role: "assistant",
      content: responseText || "Ready to generate.",
      generationPlanId: generationPlan?.id || null,
      createdAt: new Date(),
    });

    console.log("[Response sent] plan:", !!generationPlan, "text:", responseText.substring(0, 80));

    return NextResponse.json({
      text: responseText || "Ready to generate.",
      model: response.model,
      messageId: assistantMsgId,
      generationPlan,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to get response";
    console.error("[Chat error]:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function extractPlanFromText(text: string): any {
  const patterns = [
    /\{[\s\S]*?"task_type"[\s\S]*?"prompt"[\s\S]*?\}/,
    /\{[\s\S]*?"tasktype"[\s\S]*?"prompt"[\s\S]*?\}/,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      let braceCount = 0;
      let endIdx = 0;
      for (let i = 0; i < match[0].length; i++) {
        if (match[0][i] === "{") braceCount++;
        if (match[0][i] === "}") braceCount--;
        if (braceCount === 0) { endIdx = i + 1; break; }
      }
      try {
        return JSON.parse(match[0].substring(0, endIdx));
      } catch { continue; }
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

function buildPlanFromContext(history: any[], projectId: string): any {
  const allAttachments: any[] = [];
  const allTexts: string[] = [];

  for (const msg of history) {
    const c = msg.content as any;
    if (typeof c === "object" && c !== null) {
      if (c.text) allTexts.push(c.text);
      if (c.attachments) allAttachments.push(...c.attachments);
    } else if (typeof c === "string") {
      allTexts.push(c);
    }
  }

  const allImages = allAttachments.filter((a) => a.mimeType?.startsWith("image/"));
  const userText = allTexts.join(" ").toLowerCase();

  let analysisText = "";
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i].role === "assistant") {
      const content = history[i].content;
      const text = typeof content === "string" ? content : (content as any)?.text || "";
      if (text.length > 100) { analysisText = text; break; }
    }
  }

  const durationMatch = analysisText.match(/(\d+\.?\d*)\s*(?:second|sec|s\b)/i);
  const duration = durationMatch ? parseFloat(durationMatch[1]) : 10;
  const isVertical = userText.includes("vertical") || userText.includes("9:16") || userText.includes("portrait");
  const aspectRatio = isVertical ? "9:16" : "16:9";

  const prompt = analysisText.length > 50
    ? `Reproduce the reference video style and pacing. ${analysisText.replace(/\n+/g, " ").substring(0, 800)}`
    : `Create a professional video ad following the reference style. Duration: ${duration}s, format: ${aspectRatio}.`;

  const refUrls = [...new Set(allImages.map((a) => a.url).filter(Boolean))];

  return {
    task_type: "reference_to_video",
    prompt,
    reference_urls: refUrls,
    asset_urls: { character: null, product: null, location: null },
    settings: { duration, resolution: "720p", aspect_ratio: aspectRatio },
    estimated_credits: 1.5,
  };
}

async function savePlan(projectId: string, planData: any) {
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
  return { id: planId, ...planData };
}
