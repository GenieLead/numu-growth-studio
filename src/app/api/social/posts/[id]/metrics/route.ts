import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { socialPosts, performanceSnapshots } from "@/db/schema";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";

async function getSessionUser(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  return session?.user || null;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const post = await db.select().from(socialPosts).where(eq(socialPosts.id, id)).limit(1);
  if (!post.length) return NextResponse.json({ error: "Post not found" }, { status: 404 });

  const snapshots = await db.select().from(performanceSnapshots).where(eq(performanceSnapshots.socialPostId, id));
  return NextResponse.json({ post: post[0], snapshots });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();

  const snapshotId = randomUUID();
  await db.insert(performanceSnapshots).values({
    id: snapshotId,
    socialPostId: id,
    capturedAt: new Date().toISOString(),
    metrics: body.metrics || {},
    normalizedScore: body.normalizedScore || null,
  });

  return NextResponse.json({ snapshotId });
}
