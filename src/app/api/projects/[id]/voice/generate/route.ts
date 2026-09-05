import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { projects } from "@/db/schema";
import { eq } from "drizzle-orm";
import { generateVoice } from "@/lib/sound/voice-director";

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
  const project = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);
  if (!project.length || project[0].userId !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await request.json();
  const { text, voice, language, emotion } = body;

  if (!text) return NextResponse.json({ error: "text required" }, { status: 400 });

  try {
    const result = await generateVoice(user.id, { text, voice, language, emotion });
    return NextResponse.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Voice generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
