import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { generations } from "@/db/schema";
import { eq } from "drizzle-orm";
import { pollGeneration } from "@/lib/generation-router";
import { getOpenRouterKey } from "@/lib/openrouter";

async function getSessionUser(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  return session?.user || null;
}

export async function GET(request: Request) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const generationId = searchParams.get("generationId");
  if (!generationId) {
    return NextResponse.json({ error: "generationId required" }, { status: 400 });
  }

  const gen = await db
    .select()
    .from(generations)
    .where(eq(generations.id, generationId))
    .limit(1);

  if (gen.length === 0) {
    return NextResponse.json({ error: "Generation not found" }, { status: 404 });
  }

  const generation = gen[0];
  const provider = generation.provider as "dashscope" | "openrouter";

  // Get the appropriate API key
  let apiKey: string;
  if (provider === "dashscope") {
    apiKey = process.env.DASHSCOPE_API_KEY || "";
    if (!apiKey) {
      return NextResponse.json({ error: "DashScope key not configured" }, { status: 500 });
    }
  } else {
    const orKey = await getOpenRouterKey(user.id);
    if (!orKey) {
      return NextResponse.json({ error: "OpenRouter key not connected" }, { status: 400 });
    }
    apiKey = orKey;
  }

  // Extract task ID from pollingUrl or openrouterJobId
  let taskId: string;
  if (provider === "dashscope") {
    taskId = generation.pollingUrl?.replace("dashscope:", "") || "";
  } else {
    taskId = generation.openrouterJobId || "";
  }

  if (!taskId) {
    return NextResponse.json({ error: "No task ID found" }, { status: 400 });
  }

  try {
    const result = await pollGeneration(provider, apiKey, taskId);

    // Update generation record
    await db
      .update(generations)
      .set({
        status: result.status === "completed" ? "completed" : result.status === "failed" ? "failed" : "processing",
        ...(result.error ? { errorMessage: result.error } : {}),
        ...(result.status === "completed" ? { completedAt: new Date() } : {}),
      })
      .where(eq(generations.id, generationId));

    return NextResponse.json({
      status: result.status,
      videoUrl: result.videoUrl,
      error: result.error,
      cost: "cost" in result ? result.cost : undefined,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Poll failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
