import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { messages, projects } from "@/db/schema";
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

  // Note: User message is saved by the frontend via /messages endpoint
  // We only need to fetch history and call the Director

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
            const fullUrl = att.url.startsWith("http") ? att.url : `${baseUrl}${att.url}`;
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

    // Check for generation plan in the response
    const planMatch = responseText.match(/<generation_plan>([\s\S]*?)<\/generation_plan>/);
    let generationPlan = null;

    if (planMatch) {
      try {
        generationPlan = JSON.parse(planMatch[1]);
        responseText = responseText
          .replace(/<generation_plan>[\s\S]*?<\/generation_plan>/, "")
          .trim();
      } catch (e) {
        console.error("Failed to parse generation plan:", e);
      }
    }

    // Save assistant message
    const assistantMsgId = crypto.randomUUID();
    await db.insert(messages).values({
      id: assistantMsgId,
      projectId,
      role: "assistant",
      content: responseText,
      createdAt: new Date(),
    });

    return NextResponse.json({
      text: responseText,
      model: response.model,
      messageId: assistantMsgId,
      generationPlan,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to get response";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
