import { NextResponse } from "next/server";
import { db } from "@/db";
import { generations, projects, session } from "@/db/schema";
import { eq, and, gt } from "drizzle-orm";
import { routeGeneration, type TaskType } from "@/lib/generation-router";

async function getUserFromRequest(request: Request) {
  // Extract session token from cookie
  const cookieHeader = request.headers.get("cookie") || "";
  const sessionMatch = cookieHeader.match(/better-auth\.session_token=([^;]+)/);
  if (!sessionMatch) return null;

  const token = sessionMatch[1];
  const now = new Date();

  // Look up session in DB
  const sessions = await db
    .select()
    .from(session)
    .where(and(eq(session.token, token), gt(session.expiresAt, now)))
    .limit(1);

  if (sessions.length === 0) return null;

  // Get user
  const users = await db
    .select()
    .from((await import("@/db/schema")).user)
    .where(eq((await import("@/db/schema")).user.id, sessions[0].userId))
    .limit(1);

  return users.length > 0 ? users[0] : null;
}

export async function POST(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();

  const {
    projectId,
    task_type,
    prompt,
    reference_urls,
    asset_urls,
    settings,
  } = body;

  if (!projectId || !task_type || !prompt) {
    return NextResponse.json(
      { error: "projectId, task_type, and prompt required" },
      { status: 400 }
    );
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

  try {
    console.log("[Generate] task:", task_type, "prompt length:", prompt?.length);

    const result = await routeGeneration(user.id, {
      taskType: task_type as TaskType,
      prompt,
      referenceImageUrls: reference_urls || [],
      characterImageUrl: asset_urls?.character || undefined,
      productImageUrl: asset_urls?.product || undefined,
      locationImageUrl: asset_urls?.location || undefined,
      duration: settings?.duration,
      resolution: settings?.resolution,
      aspectRatio: settings?.aspect_ratio,
    });

    const genId = crypto.randomUUID();
    await db.insert(generations).values({
      id: genId,
      projectId,
      model: result.model,
      provider: result.provider,
      intent: task_type.toUpperCase(),
      compiledPrompt: prompt,
      requestPayload: body,
      openrouterJobId: result.provider === "openrouter" ? result.taskId : null,
      pollingUrl:
        result.provider === "dashscope"
          ? `dashscope:${result.taskId}`
          : `https://openrouter.ai/api/v1/videos/${result.taskId}`,
      status: "pending",
      estimatedCost: result.estimatedCost || 0,
      maxApprovedCost: 0,
      createdAt: new Date(),
    });

    return NextResponse.json({
      generationId: genId,
      provider: result.provider,
      taskId: result.taskId,
      model: result.model,
      status: "pending",
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Generation failed";
    console.error("[Generate error]:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
