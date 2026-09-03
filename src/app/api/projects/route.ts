import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { projects } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

async function getSessionUser(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  return session?.user || null;
}

export async function GET(request: Request) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userProjects = await db
    .select()
    .from(projects)
    .where(eq(projects.userId, user.id))
    .orderBy(desc(projects.updatedAt));

  return NextResponse.json({ projects: userProjects });
}

export async function POST(request: Request) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const id = crypto.randomUUID();
  const now = new Date();

  await db.insert(projects).values({
    id,
    userId: user.id,
    title: body.title || "Untitled",
    status: "draft",
    creditsSpent: 0,
    createdAt: now,
    updatedAt: now,
  });

  const project = await db.select().from(projects).where(eq(projects.id, id)).limit(1);
  return NextResponse.json({ project: project[0] });
}

export async function PATCH(request: Request) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { id, ...updates } = body;
  if (!id) return NextResponse.json({ error: "Project ID required" }, { status: 400 });

  await db.update(projects).set({ ...updates, updatedAt: new Date() }).where(eq(projects.id, id));
  return NextResponse.json({ success: true });
}

export async function DELETE(request: Request) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Project ID required" }, { status: 400 });

  await db.update(projects).set({ deletedAt: new Date() }).where(eq(projects.id, id));
  return NextResponse.json({ success: true });
}
