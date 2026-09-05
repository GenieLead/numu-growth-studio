import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { assets } from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";

async function getSessionUser(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  return session?.user || null;
}

export async function GET(request: Request) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("projectId");
  const category = searchParams.get("category");

  const whereClause = category
    ? and(eq(assets.userId, user.id), eq(assets.category, category))
    : eq(assets.userId, user.id);

  const allAssets = await db.select().from(assets).where(whereClause).orderBy(desc(assets.createdAt));

  const filtered = projectId
    ? allAssets.filter((a) => a.projectId === projectId)
    : allAssets;

  // Filter out deleted
  const active = filtered.filter((a) => !a.deletedAt);

  return NextResponse.json({ assets: active });
}

export async function PATCH(request: Request) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { id, name, kind, approved, category } = body;
  if (!id) return NextResponse.json({ error: "Asset ID required" }, { status: 400 });

  const updates: any = {};
  if (name !== undefined) updates.name = name;
  if (kind !== undefined) updates.kind = kind;
  if (approved !== undefined) updates.approved = approved;
  if (category !== undefined) updates.category = category;

  await db.update(assets).set(updates).where(eq(assets.id, id));
  return NextResponse.json({ success: true });
}

export async function DELETE(request: Request) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Asset ID required" }, { status: 400 });

  await db.update(assets).set({ deletedAt: new Date() }).where(eq(assets.id, id));
  return NextResponse.json({ success: true });
}
