import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { audioTracks } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { put } from "@vercel/blob";

async function getSessionUser(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  return session?.user || null;
}

// GET — fetch all audio tracks for a project
export async function GET(request: Request) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("projectId");
  if (!projectId) {
    return NextResponse.json({ error: "projectId required" }, { status: 400 });
  }

  const tracks = await db
    .select()
    .from(audioTracks)
    .where(eq(audioTracks.projectId, projectId))
    .orderBy(asc(audioTracks.startTimeSec));

  return NextResponse.json({ tracks });
}

// POST — save a recorded/generated audio track
export async function POST(request: Request) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const projectId = formData.get("projectId") as string | null;
  const kind = formData.get("kind") as string | null; // voiceover | music | sfx | etc.
  const name = formData.get("name") as string | null;
  const startTime = parseFloat(formData.get("startTime") as string || "0");

  if (!file || !projectId) {
    return NextResponse.json({ error: "file and projectId required" }, { status: 400 });
  }

  const ext = file.name.split(".").pop() || "wav";
  const path = `${user.id}/${projectId}/audio/${crypto.randomUUID()}.${ext}`;

  const blob = await put(path, file, {
    access: "private",
    contentType: file.type || "audio/wav",
  });

  const proxyUrl = `/api/assets/proxy?url=${encodeURIComponent(blob.url)}`;

  const trackId = crypto.randomUUID();
  await db.insert(audioTracks).values({
    id: trackId,
    projectId,
    kind: kind || "voiceover",
    name: name || file.name,
    blobUrl: proxyUrl,
    blobPathname: blob.pathname,
    mimeType: file.type || "audio/wav",
    startTimeSec: startTime,
    volume: 1.0,
    createdAt: new Date(),
  });

  return NextResponse.json({
    trackId,
    url: proxyUrl,
    kind: kind || "voiceover",
    name: name || file.name,
  });
}

// DELETE — remove an audio track
export async function DELETE(request: Request) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const trackId = searchParams.get("id");
  if (!trackId) {
    return NextResponse.json({ error: "trackId required" }, { status: 400 });
  }

  await db.delete(audioTracks).where(eq(audioTracks.id, trackId));
  return NextResponse.json({ success: true });
}
