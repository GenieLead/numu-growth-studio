import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { generations } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getOpenRouterKey } from "@/lib/openrouter";

async function getSessionUser(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  return session?.user || null;
}

async function openrouterFetch(apiKey: string, path: string, init: RequestInit = {}) {
  const response = await fetch(`https://openrouter.ai/api/v1${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
  });
  return response;
}

export async function POST(request: Request) {
  const clonedRequest = request.clone();
  const body = await request.json();

  const session = await auth.api.getSession({ headers: clonedRequest.headers });
  const user = session?.user || null;
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { projectId, modelId, prompt, duration, resolution, aspectRatio, generateAudio } = body;

  if (!projectId || !prompt) {
    return NextResponse.json({ error: "projectId and prompt required" }, { status: 400 });
  }

  const apiKey = await getOpenRouterKey(user.id);
  if (!apiKey) return NextResponse.json({ error: "OpenRouter key not connected" }, { status: 400 });

  // Use Seedance 2.5 as primary (supports 4-30s)
  const model = modelId || "bytedance/seedance-2.5";

  // Submit to OpenRouter — correct endpoint: POST /api/v1/videos
  try {
    const res = await openrouterFetch(apiKey, "/videos", {
      method: "POST",
      body: JSON.stringify({
        model,
        prompt,
        duration: duration || 10,
        resolution: resolution || "720p",
        aspect_ratio: aspectRatio || "16:9",
        generate_audio: generateAudio || false,
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
      model,
      provider: "openrouter",
      intent: "TEXT_TO_VIDEO",
      compiledPrompt: prompt,
      requestPayload: { model, prompt, duration, resolution, aspectRatio } as any,
      openrouterJobId: data.id || null,
      pollingUrl: data.polling_url || null,
      status: data.status || "submitted",
      estimatedCost: 0,
      maxApprovedCost: 0,
      createdAt: new Date(),
    });

    return NextResponse.json({
      generationId: genId,
      jobId: data.id,
      status: data.status || "submitted",
      pollingUrl: data.polling_url,
      model,
      duration: duration || 10,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Generation failed" }, { status: 500 });
  }
}

// Poll job status
export async function GET(request: Request) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const jobId = searchParams.get("jobId");
  const pollingUrl = searchParams.get("pollingUrl");

  if (!jobId || !pollingUrl) return NextResponse.json({ error: "jobId and pollingUrl required" }, { status: 400 });

  const apiKey = await getOpenRouterKey(user.id);
  if (!apiKey) return NextResponse.json({ error: "OpenRouter key not connected" }, { status: 400 });

  try {
    // Use GET /api/v1/videos/{job_id} for polling
    const res = await openrouterFetch(apiKey, `/videos/${jobId}`);

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json({ error: `Poll error: ${res.status} - ${err}` }, { status: 500 });
    }

    const data = await res.json();
    return NextResponse.json({
      status: data.status,
      videoUrl: data.unsigned_urls?.[0] || null,
      error: data.error || null,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
