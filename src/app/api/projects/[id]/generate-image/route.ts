import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { projects, generationPlans } from "@/db/schema";
import { eq } from "drizzle-orm";
import { generateImage } from "@/lib/image/generation-adapter";
import { randomUUID } from "crypto";

async function getSessionUser(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  return session?.user || null;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const clonedRequest = request.clone();
  let body: any;
  try {
    body = await clonedRequest.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const session = await auth.api.getSession({ headers: request.headers });
  const user = session?.user || null;
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: projectId } = await params;
  const { prompt, referenceUrls, aspectRatio, style } = body;

  if (!prompt) return NextResponse.json({ error: "prompt required" }, { status: 400 });

  const project = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);
  if (!project.length || project[0].userId !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const result = await generateImage(user.id, { prompt, referenceUrls, aspectRatio, style });
    
    const planId = randomUUID();
    await db.insert(generationPlans).values({
      id: planId,
      projectId,
      taskType: "image_generation",
      prompt,
      referenceUrls: referenceUrls || [],
      assetUrls: {},
      settings: { aspectRatio: aspectRatio || "1:1", style: style || "photorealistic" },
      estimatedCredits: 0.1,
      status: result.imageUrl ? "completed" : "failed",
      createdAt: new Date(),
    } as any);

    return NextResponse.json({
      imageUrl: result.imageUrl,
      model: result.model,
      planId,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Image generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
