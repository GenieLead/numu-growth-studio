import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { brands, knowledgeItems } from "@/db/schema";
import { eq, and, desc, isNull } from "drizzle-orm";

async function getSessionUser(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  return session?.user || null;
}

async function verifyBrandOwnership(brandId: string, userId: string) {
  const brand = await db
    .select()
    .from(brands)
    .where(and(eq(brands.id, brandId), eq(brands.userId, userId), isNull(brands.deletedAt)))
    .limit(1);
  return brand.length > 0 ? brand[0] : null;
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const brand = await verifyBrandOwnership(id, user.id);
  if (!brand) return NextResponse.json({ error: "Brand not found" }, { status: 404 });

  const items = await db
    .select()
    .from(knowledgeItems)
    .where(and(eq(knowledgeItems.brandId, id), isNull(knowledgeItems.deletedAt)))
    .orderBy(desc(knowledgeItems.createdAt));

  return NextResponse.json({ knowledgeItems: items });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const brand = await verifyBrandOwnership(id, user.id);
  if (!brand) return NextResponse.json({ error: "Brand not found" }, { status: 404 });

  const body = await request.json();
  const { sourceType, title, rawAssetId, textContent, trustLevel, metadata } = body;

  if (!sourceType || !title) {
    return NextResponse.json({ error: "sourceType and title required" }, { status: 400 });
  }

  const itemId = crypto.randomUUID();

  await db.insert(knowledgeItems).values({
    id: itemId,
    brandId: id,
    sourceType,
    title,
    rawAssetId: rawAssetId || null,
    textContent: textContent || null,
    trustLevel: trustLevel || "user",
    metadata: metadata || null,
    createdAt: new Date(),
  });

  const item = await db.select().from(knowledgeItems).where(eq(knowledgeItems.id, itemId)).limit(1);
  return NextResponse.json({ knowledgeItem: item[0] });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const brand = await verifyBrandOwnership(id, user.id);
  if (!brand) return NextResponse.json({ error: "Brand not found" }, { status: 404 });

  const { searchParams } = new URL(request.url);
  const itemId = searchParams.get("itemId");
  if (!itemId) return NextResponse.json({ error: "Item ID required" }, { status: 400 });

  const existing = await db
    .select()
    .from(knowledgeItems)
    .where(and(eq(knowledgeItems.id, itemId), eq(knowledgeItems.brandId, id), isNull(knowledgeItems.deletedAt)))
    .limit(1);

  if (existing.length === 0) return NextResponse.json({ error: "Knowledge item not found" }, { status: 404 });

  await db.update(knowledgeItems).set({ deletedAt: new Date() }).where(eq(knowledgeItems.id, itemId));

  return NextResponse.json({ success: true });
}
