import { auth } from "@/lib/auth";
import { db } from "@/db";
import { messages } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { callDirector, type ChatMessage, type ContentPart } from "@/lib/openrouter";

async function getSessionUser(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  return session?.user || null;
}

export async function POST(request: Request) {
  const user = await getSessionUser(request);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { projectId, content } = body;

  if (!projectId || !content) {
    return Response.json({ error: "projectId and content required" }, { status: 400 });
  }

  // Save user message
  const userMsgId = crypto.randomUUID();
  await db.insert(messages).values({
    id: userMsgId,
    projectId,
    role: "user",
    content,
    createdAt: new Date(),
  });

  // Fetch full conversation history
  const history = await db
    .select()
    .from(messages)
    .where(eq(messages.projectId, projectId))
    .orderBy(asc(messages.createdAt));

  // Build OpenRouter messages — include images in every message that has them
  const recentHistory = history.slice(-20);
  const openRouterMessages: ChatMessage[] = recentHistory.map((m) => {
    const role = m.role as "user" | "assistant";
    const msgContent = m.content;

    // If content has attachments with images, send them as multimodal
    if (typeof msgContent === "object" && msgContent !== null) {
      const contentObj = msgContent as any;
      const text = contentObj.text || "";
      const attachments = contentObj.attachments || [];

      if (attachments.length > 0) {
        const parts: ContentPart[] = [];

        // Add all images first
        for (const att of attachments) {
          if (att.mimeType?.startsWith("image/") && att.url) {
            parts.push({
              type: "image_url",
              image_url: { url: att.url },
            });
          }
        }

        // Add text with reference labels
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

    // Save assistant message
    const assistantMsgId = crypto.randomUUID();
    await db.insert(messages).values({
      id: assistantMsgId,
      projectId,
      role: "assistant",
      content: response.text,
      createdAt: new Date(),
    });

    return Response.json({
      text: response.text,
      model: response.model,
      messageId: assistantMsgId,
    });
  } catch (error: any) {
    return Response.json({
      error: error.message || "Failed to get response",
    }, { status: 500 });
  }
}
