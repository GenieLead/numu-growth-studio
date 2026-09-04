import { NextResponse } from "next/server";
import { db } from "@/db";
import { generations, projects, session as sessionTable, user as userTable } from "@/db/schema";
import { eq, and, gt } from "drizzle-orm";
import { routeGeneration, type TaskType } from "@/lib/generation-router";
import crypto from "crypto";

const AUTH_SECRET = process.env.BETTER_AUTH_SECRET || "";

async function getUserFromRequest(request: Request) {
  const cookieHeader = request.headers.get("cookie") || "";
  const sessionMatch = cookieHeader.match(/better-auth\.session_token=([^;]+)/);
  if (!sessionMatch) return null;

  const rawValue = sessionMatch[1];
  const now = new Date();

  // Try raw value first
  let sessions = await db.select().from(sessionTable).where(and(eq(sessionTable.token, rawValue), gt(sessionTable.expiresAt, now))).limit(1);

  // If not found, try unsigning
  if (sessions.length === 0 && rawValue.includes(".")) {
    const value = rawValue.split(".")[0];
    const expectedSig = crypto.createHmac("sha256", AUTH_SECRET).update(value).digest("base64url");
    if (rawValue.split(".")[1] === expectedSig) {
      sessions = await db.select().from(sessionTable).where(and(eq(sessionTable.token, value), gt(sessionTable.expiresAt, now))).limit(1);
    }
  }

  if (sessions.length === 0) return null;
  const users = await db.select().from(userTable).where(eq(userTable.id, sessions[0].userId)).limit(1);
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
