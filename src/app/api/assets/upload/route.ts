import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { assets } from "@/db/schema";

async function getSessionUser(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  return session?.user || null;
}

export async function POST(request: Request) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { pathname, url, name, mimeType, size, projectId } = body;

  if (!url || !name) {
    return NextResponse.json({ error: "url and name required" }, { status: 400 });
  }

  const kind = mimeType?.startsWith("video/")
    ? "video"
    : mimeType?.startsWith("image/")
      ? "image"
      : mimeType?.startsWith("audio/")
        ? "audio"
        : "reference";

  const assetId = crypto.randomUUID();

  await db.insert(assets).values({
    id: assetId,
    userId: user.id,
    projectId: projectId || null,
    kind,
    source: "uploaded",
    name,
    blobUrl: url,
    blobPathname: pathname,
    mimeType,
    width: null,
    height: null,
    durationSec: null,
    metadata: { size },
    approved: false,
    createdAt: new Date(),
  });

  return NextResponse.json({
    assetId,
    url,
    pathname,
    kind,
    name,
    mimeType,
    size,
  });
}
