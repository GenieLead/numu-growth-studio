import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { projects } from "@/db/schema";
import { eq } from "drizzle-orm";
import { generateMusicPrompt } from "@/lib/sound/music-director";

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
  const project = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);
  if (!project.length || project[0].userId !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { mood, genre, duration, bpm, instrumentation } = body;

  if (!mood || !duration) return NextResponse.json({ error: "mood and duration required" }, { status: 400 });

  const prompt = await generateMusicPrompt({ mood, genre, duration, bpm, instrumentation });

  return NextResponse.json({
    prompt,
    status: "pending",
    message: "Music generation prompt prepared. Integration with music provider coming soon.",
  });
}
