import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { entities, brands } from "@/db/schema";
import { eq, and } from "drizzle-orm";

async function getSessionUser(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  return session?.user || null;
}

export async function GET(request: Request) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const brandId = searchParams.get("brandId");
  if (!brandId) return NextResponse.json({ error: "brandId required" }, { status: 400 });

  const type = searchParams.get("type");

  const conditions = [eq(entities.brandId, brandId), eq(entities.status, "active")];
  if (type) conditions.push(eq(entities.type, type));

  const result = await db
    .select()
    .from(entities)
    .where(and(...conditions));

  return NextResponse.json({ entities: result });
}

export async function POST(request: Request) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { brandId, type, name, canonicalDescription, rules } = body;
  if (!brandId || !type || !name) {
    return NextResponse.json({ error: "brandId, type, and name required" }, { status: 400 });
  }

  const brand = await db
    .select()
    .from(brands)
    .where(and(eq(brands.id, brandId), eq(brands.userId, user.id)))
    .limit(1);
  if (brand.length === 0) return NextResponse.json({ error: "Brand not found" }, { status: 404 });

  const id = crypto.randomUUID();
  const now = new Date();

  await db.insert(entities).values({
    id,
    brandId,
    type,
    name,
    canonicalDescription: canonicalDescription || null,
    rules: rules || null,
    status: "active",
    createdAt: now,
    updatedAt: now,
  });

  const entity = await db.select().from(entities).where(eq(entities.id, id)).limit(1);
  return NextResponse.json({ entity: entity[0] });
}

export async function PATCH(request: Request) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { id, type, name, canonicalDescription, rules } = body;
  if (!id) return NextResponse.json({ error: "Entity ID required" }, { status: 400 });

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (type !== undefined) updates.type = type;
  if (name !== undefined) updates.name = name;
  if (canonicalDescription !== undefined) updates.canonicalDescription = canonicalDescription;
  if (rules !== undefined) updates.rules = rules;

  await db.update(entities).set(updates).where(eq(entities.id, id));
  return NextResponse.json({ success: true });
}

export async function DELETE(request: Request) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Entity ID required" }, { status: 400 });

  await db.update(entities).set({ status: "deleted", updatedAt: new Date() }).where(eq(entities.id, id));
  return NextResponse.json({ success: true });
}
