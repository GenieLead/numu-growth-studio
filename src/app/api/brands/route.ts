import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { brands } from "@/db/schema";
import { eq, and, desc, isNull } from "drizzle-orm";

async function getSessionUser(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  return session?.user || null;
}

export async function GET(request: Request) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userBrands = await db
    .select()
    .from(brands)
    .where(and(eq(brands.userId, user.id), isNull(brands.deletedAt)))
    .orderBy(desc(brands.updatedAt));

  return NextResponse.json({ brands: userBrands });
}

export async function POST(request: Request) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { name, positioning, personality, visualSystem, toneOfVoice, values, rules } = body;

  if (!name) return NextResponse.json({ error: "Name required" }, { status: 400 });

  const id = crypto.randomUUID();
  const now = new Date();

  await db.insert(brands).values({
    id,
    userId: user.id,
    name,
    positioning: positioning || null,
    personality: personality || null,
    visualSystem: visualSystem || null,
    toneOfVoice: toneOfVoice || null,
    values: values || null,
    rules: rules || null,
    createdAt: now,
    updatedAt: now,
  });

  const brand = await db.select().from(brands).where(eq(brands.id, id)).limit(1);
  return NextResponse.json({ brand: brand[0] });
}

export async function PATCH(request: Request) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { id, name, positioning, personality, visualSystem, toneOfVoice, values, rules } = body;
  if (!id) return NextResponse.json({ error: "Brand ID required" }, { status: 400 });

  const existing = await db
    .select()
    .from(brands)
    .where(and(eq(brands.id, id), eq(brands.userId, user.id), isNull(brands.deletedAt)))
    .limit(1);

  if (existing.length === 0) return NextResponse.json({ error: "Brand not found" }, { status: 404 });

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (name !== undefined) updates.name = name;
  if (positioning !== undefined) updates.positioning = positioning;
  if (personality !== undefined) updates.personality = personality;
  if (visualSystem !== undefined) updates.visualSystem = visualSystem;
  if (toneOfVoice !== undefined) updates.toneOfVoice = toneOfVoice;
  if (values !== undefined) updates.values = values;
  if (rules !== undefined) updates.rules = rules;

  await db.update(brands).set(updates).where(eq(brands.id, id));
  return NextResponse.json({ success: true });
}

export async function DELETE(request: Request) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Brand ID required" }, { status: 400 });

  const existing = await db
    .select()
    .from(brands)
    .where(and(eq(brands.id, id), eq(brands.userId, user.id), isNull(brands.deletedAt)))
    .limit(1);

  if (existing.length === 0) return NextResponse.json({ error: "Brand not found" }, { status: 404 });

  const now = new Date();
  await db.update(brands).set({ deletedAt: now, updatedAt: now }).where(eq(brands.id, id));

  return NextResponse.json({ success: true });
}
