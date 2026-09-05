import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { autopilotPrograms, brands } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { randomUUID } from "crypto";

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

  const brand = await db.select().from(brands).where(and(eq(brands.id, brandId), eq(brands.userId, user.id))).limit(1);
  if (!brand.length) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const programs = await db.select().from(autopilotPrograms).where(eq(autopilotPrograms.brandId, brandId));
  return NextResponse.json({ programs });
}

export async function POST(request: Request) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { brandId, objective, channels, outputTypes, approvalLevel, monthlyBudget, weeklyBudget } = body;

  if (!brandId || !objective) return NextResponse.json({ error: "brandId and objective required" }, { status: 400 });

  const brand = await db.select().from(brands).where(and(eq(brands.id, brandId), eq(brands.userId, user.id))).limit(1);
  if (!brand.length) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const id = randomUUID();
  await db.insert(autopilotPrograms).values({
    id,
    brandId,
    objective,
    policy: {
      channels: channels || ["instagram"],
      outputTypes: outputTypes || ["image", "video"],
      approvalLevel: approvalLevel || "concept",
      experimentationPct: 20,
    },
    budget: {
      monthlyCredits: monthlyBudget || 10,
      weeklyCredits: weeklyBudget || 3,
      perAssetMax: 2,
      reservePct: 10,
    },
    status: "paused",
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  return NextResponse.json({ program: { id } });
}

export async function PATCH(request: Request) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  if (!body.id) return NextResponse.json({ error: "id required" }, { status: 400 });

  await db.update(autopilotPrograms).set({
    ...(body.status !== undefined && { status: body.status }),
    ...(body.objective !== undefined && { objective: body.objective }),
    ...(body.policy !== undefined && { policy: body.policy }),
    ...(body.budget !== undefined && { budget: body.budget }),
    updatedAt: new Date(),
  }).where(eq(autopilotPrograms.id, body.id));

  return NextResponse.json({ ok: true });
}
