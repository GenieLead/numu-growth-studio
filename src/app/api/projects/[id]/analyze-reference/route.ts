import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { assets } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { analyzeImage } from "@/lib/openrouter";
import { buildAnalysisPrompt, parseAnalysisFromResponse } from "@/lib/reference/analyzer";

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
  const { assetId } = body;

  if (!assetId) return NextResponse.json({ error: "assetId required" }, { status: 400 });

  const asset = await db
    .select()
    .from(assets)
    .where(and(eq(assets.id, assetId), eq(assets.userId, user.id)))
    .limit(1);

  if (!asset.length || !asset[0].blobUrl) {
    return NextResponse.json({ error: "Asset not found" }, { status: 404 });
  }

  try {
    const analysisPrompt = buildAnalysisPrompt();
    const rawAnalysis = await analyzeImage(user.id, asset[0].blobUrl, analysisPrompt);
    const parsed = parseAnalysisFromResponse(rawAnalysis);

    return NextResponse.json({
      analysis: parsed || rawAnalysis,
      parsed: !!parsed,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Analysis failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
