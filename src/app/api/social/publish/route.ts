import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { validateForPlatform, publishToPlatform, getSupportedPlatforms } from "@/lib/social/publish-manager";
import { db } from "@/db";
import { socialPosts, assets } from "@/db/schema";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";

async function getSessionUser(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  return session?.user || null;
}

export async function POST(request: Request) {
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

  const { platform, assetId, caption, scheduleAt } = body;

  if (!platform || !assetId) {
    return NextResponse.json({ error: "platform and assetId required" }, { status: 400 });
  }

  const supported = getSupportedPlatforms();
  if (!supported.includes(platform)) {
    return NextResponse.json({ error: `Unsupported platform. Supported: ${supported.join(", ")}` }, { status: 400 });
  }

  const asset = await db.select().from(assets).where(eq(assets.id, assetId)).limit(1);
  if (!asset.length) return NextResponse.json({ error: "Asset not found" }, { status: 404 });

  const validation = await validateForPlatform(platform, {
    mimeType: asset[0].mimeType || "",
    duration: asset[0].durationSec || undefined,
    width: asset[0].width || undefined,
    height: asset[0].height || undefined,
  });

  if (!validation.valid) {
    return NextResponse.json({ error: "Asset validation failed", errors: validation.errors, warnings: validation.warnings }, { status: 400 });
  }

  const result = await publishToPlatform(platform, {
    accountId: user.id,
    assetUrl: asset[0].blobUrl || "",
    caption: caption || "",
    scheduleAt,
  });

  if (result.success && result.postId) {
    await db.insert(socialPosts).values({
      id: randomUUID(),
      userId: user.id,
      projectId: asset[0].projectId || "",
      platform,
      externalId: result.postId,
      assetUrl: asset[0].blobUrl || "",
      caption: caption || "",
      status: scheduleAt ? "scheduled" : "published",
      publishedAt: scheduleAt ? new Date(scheduleAt) : new Date(),
    });
  }

  return NextResponse.json(result);
}

export async function GET() {
  return NextResponse.json({ platforms: getSupportedPlatforms() });
}
