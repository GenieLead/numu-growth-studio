import { auth } from "@/lib/auth";
import { db } from "@/db";
import { messages, projects } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { callDirector, analyzeImage, type ChatMessage } from "@/lib/openrouter";

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

  // Fetch conversation history
  const history = await db
    .select()
    .from(messages)
    .where(eq(messages.projectId, projectId))
    .orderBy(asc(messages.createdAt));

  // Build OpenRouter messages (last 20 for context window)
  const recentHistory = history.slice(-20);
  const openRouterMessages: ChatMessage[] = recentHistory.map((m) => ({
    role: m.role as "user" | "assistant",
    content: formatContentForAI(m.content),
  }));

  // If user sent images, analyze them first
  const textContent = typeof content === "string" ? content : content?.text || "";
  const attachments = typeof content === "object" && content?.attachments ? content.attachments : [];

  if (attachments.length > 0 && textContent.toLowerCase().includes("describe")) {
    // Analyze the first image
    const imageAtt = attachments.find((a: any) => a.mimeType?.startsWith("image/"));
    if (imageAtt?.url) {
      try {
        const analysis = await analyzeImage(user.id, imageAtt.url);
        // Prepend analysis context to the conversation
        openRouterMessages.push({
          role: "user",
          content: `[Image Analysis of "${imageAtt.customName || imageAtt.name}"]:\n${analysis}\n\nUser's message: ${textContent}`,
        });
      } catch (e) {
        console.error("Image analysis failed:", e);
      }
    }
  }

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

function formatContentForAI(content: any): string {
  if (typeof content === "string") return content;
  if (content?.text) {
    const parts = [content.text];
    if (content.attachments?.length) {
      const refs = content.attachments.map((a: any) => {
        const label = a.customName || a.name;
        const kind = a.kind || "reference";
        return `[Attached: ${label} (${kind}, ${a.mimeType})]`;
      });
      parts.push(refs.join("\n"));
    }
    return parts.join("\n");
  }
  return JSON.stringify(content);
}
