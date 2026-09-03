import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { generations } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getOpenRouterKey } from "@/lib/openrouter";
import { fetchVideoModels, estimateCost } from "@/lib/video-models";

async function getSessionUser(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  return session?.user || null;
}

export async function POST(request: Request) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { projectId, modelId, prompt, referenceUrl, imageUrl, duration, aspectRatio, resolution } = body;

  if (!projectId || !prompt) {
    return NextResponse.json({ error: "projectId and prompt required" }, { status: 400 });
  }

  const apiKey = await getOpenRouterKey(user.id);
  if (!apiKey) return NextResponse.json({ error: "OpenRouter key not connected" }, { status: 400 });

  // Fetch real models from OpenRouter
  const models = await fetchVideoModels(user.id);
  const model = models.find((m) => m.id === modelId) || models[0];

  if (!model) {
    return NextResponse.json({ error: "No video models available on your OpenRouter account" }, { status: 400 });
  }

  const durationSec = duration || 10;
  const estimatedCost = estimateCost(model, durationSec);

  // Submit to OpenRouter video generation
  try {
    const res = await fetch("https://openrouter.ai/api/v1/video/generations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
        "X-Title": "NUMU Director",
      },
      body: JSON.stringify({
        model: model.id,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json({ error: `OpenRouter error: ${res.status} - ${err}` }, { status: 500 });
    }

    const data = await res.json();

    // Save generation record
    const genId = crypto.randomUUID();
    await db.insert(generations).values({
      id: genId,
      projectId,
      model: model.id,
      provider: model.provider,
      intent: "TEXT_TO_VIDEO",
      compiledPrompt: prompt,
      requestPayload: { model: model.id, prompt } as any,
      openrouterJobId: data.id || null,
      pollingUrl: data.polling_url || null,
      status: "submitted",
      estimatedCost,
      maxApprovedCost: estimatedCost,
      createdAt: new Date(),
    });

    return NextResponse.json({
      generationId: genId,
      jobId: data.id,
      status: "submitted",
      estimatedCost,
      model: model.name,
      duration: durationSec,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Generation failed" }, { status: 500 });
  }
}

export async function GET(request: Request) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("projectId");
  if (!projectId) return NextResponse.json({ error: "projectId required" }, { status: 400 });

  const gens = await db.select().from(generations).where(eq(generations.projectId, projectId));
  return NextResponse.json({ generations: gens });
}
