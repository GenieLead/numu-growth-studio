import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { put } from "@vercel/blob";
import { db } from "@/db";
import { assets } from "@/db/schema";

async function getSessionUser(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  return session?.user || null;
}

export async function POST(request: Request) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const projectId = formData.get("projectId") as string | null;

  if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });

  if (file.size > 100 * 1024 * 1024) {
    return NextResponse.json({ error: "File too large (max 100MB)" }, { status: 400 });
  }

  const ext = file.name.split(".").pop() || "bin";
  const path = `${user.id}/${projectId || "general"}/${crypto.randomUUID()}.${ext}`;

  const blob = await put(path, file, {
    access: "private",
    contentType: file.type,
  });

  const proxyUrl = `/api/assets/proxy?url=${encodeURIComponent(blob.url)}`;

  const assetId = crypto.randomUUID();
  const kind = file.type.startsWith("video/")
    ? "video"
    : file.type.startsWith("image/")
      ? "image"
      : file.type.startsWith("audio/")
        ? "audio"
        : "reference";

  await db.insert(assets).values({
    id: assetId,
    userId: user.id,
    projectId: projectId || null,
    kind,
    source: "uploaded",
    name: file.name,
    blobUrl: proxyUrl,
    blobPathname: blob.pathname,
    mimeType: file.type,
    metadata: { size: file.size },
    approved: false,
    createdAt: new Date(),
  });

  return NextResponse.json({
    assetId,
    url: proxyUrl,
    pathname: blob.pathname,
    kind,
    name: file.name,
    mimeType: file.type,
    size: file.size,
  });
}
