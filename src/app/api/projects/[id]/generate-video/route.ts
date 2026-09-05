import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { generations, projects } from "@/db/schema";
import { eq } from "drizzle-orm";
import { routeGeneration, type TaskType } from "@/lib/generation-router";

async function getUserFromRequest(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    return session?.user || null;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  const bodyText = await request.text();
  let body: Record<string, unknown>;
  try {
    body = JSON.parse(bodyText);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const user = await getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const {
    projectId,
    task_type,
    prompt,
    reference_urls,
    asset_urls,
    settings,
  } = body as Record<string, any>;

  if (!projectId || !task_type || !prompt) {
    return NextResponse.json(
      { error: "projectId, task_type, and prompt required" },
      { status: 400 }
    );
  }

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
