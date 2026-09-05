import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { brands, tasteReferences } from "@/db/schema";
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

  const refs = await db
    .select()
    .from(tasteReferences)
    .where(eq(tasteReferences.brandId, id))
    .orderBy(desc(tasteReferences.createdAt));

  return NextResponse.json({ tasteReferences: refs });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const brand = await verifyBrandOwnership(id, user.id);
  if (!brand) return NextResponse.json({ error: "Brand not found" }, { status: 404 });

  const body = await request.json();
  const { assetId, url, roles, notes, preferenceWeight } = body;

  const refId = crypto.randomUUID();

  await db.insert(tasteReferences).values({
    id: refId,
    brandId: id,
    assetId: assetId || null,
    url: url || null,
    roles: roles || null,
    notes: notes || null,
    preferenceWeight: preferenceWeight ?? 1.0,
    createdAt: new Date(),
  });

  const ref = await db.select().from(tasteReferences).where(eq(tasteReferences.id, refId)).limit(1);
  return NextResponse.json({ tasteReference: ref[0] });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const brand = await verifyBrandOwnership(id, user.id);
  if (!brand) return NextResponse.json({ error: "Brand not found" }, { status: 404 });

  const { searchParams } = new URL(request.url);
  const refId = searchParams.get("refId");
  if (!refId) return NextResponse.json({ error: "Reference ID required" }, { status: 400 });

  const existing = await db
    .select()
    .from(tasteReferences)
    .where(and(eq(tasteReferences.id, refId), eq(tasteReferences.brandId, id)))
    .limit(1);

  if (existing.length === 0) return NextResponse.json({ error: "Taste reference not found" }, { status: 404 });

  await db.delete(tasteReferences).where(eq(tasteReferences.id, refId));

  return NextResponse.json({ success: true });
}
