import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { entityAssets, entities, brands } from "@/db/schema";
import { eq, and } from "drizzle-orm";

async function getSessionUser(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  return session?.user || null;
}

async function verifyEntityOwnership(entityId: string, userId: string) {
  const entity = await db
    .select({ brandId: entities.brandId })
    .from(entities)
    .where(eq(entities.id, entityId))
    .limit(1);
  if (entity.length === 0) return false;

  const brand = await db
    .select()
    .from(brands)
    .where(and(eq(brands.id, entity[0].brandId), eq(brands.userId, userId)))
    .limit(1);
  return brand.length > 0;
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: entityId } = await params;
  const owns = await verifyEntityOwnership(entityId, user.id);
  if (!owns) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const assets = await db
    .select()
    .from(entityAssets)
    .where(eq(entityAssets.entityId, entityId));

  return NextResponse.json({ assets });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: entityId } = await params;
  const owns = await verifyEntityOwnership(entityId, user.id);
  if (!owns) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await request.json();
  const { assetId, role } = body;
  if (!assetId || !role) {
    return NextResponse.json({ error: "assetId and role required" }, { status: 400 });
  }

  const existing = await db
    .select()
    .from(entityAssets)
    .where(and(eq(entityAssets.entityId, entityId), eq(entityAssets.assetId, assetId)))
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(entityAssets)
      .set({ role })
      .where(and(eq(entityAssets.entityId, entityId), eq(entityAssets.assetId, assetId)));
    return NextResponse.json({ success: true });
  }

  await db.insert(entityAssets).values({
    entityId,
    assetId,
    role,
    approved: true,
  });

  return NextResponse.json({ success: true });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: entityId } = await params;
  const owns = await verifyEntityOwnership(entityId, user.id);
  if (!owns) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { searchParams } = new URL(request.url);
  const assetId = searchParams.get("assetId");
  if (!assetId) return NextResponse.json({ error: "assetId required" }, { status: 400 });

  await db
    .delete(entityAssets)
    .where(and(eq(entityAssets.entityId, entityId), eq(entityAssets.assetId, assetId)));

  return NextResponse.json({ success: true });
}
