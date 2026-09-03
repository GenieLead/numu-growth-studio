import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { projects } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET() {
  const session = await auth.api.getSession({
    headers: new Headers(),
  });

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userProjects = await db
    .select()
    .from(projects)
    .where(eq(projects.userId, session.user.id))
    .orderBy(desc(projects.updatedAt));

  return NextResponse.json({ projects: userProjects });
}

export async function POST(request: Request) {
  const session = await auth.api.getSession({
    headers: new Headers(),
  });

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { title } = body;

  const id = crypto.randomUUID();
  const now = new Date();

  await db.insert(projects).values({
    id,
    userId: session.user.id,
    title: title || "Untitled",
    status: "draft",
    creditsSpent: 0,
    createdAt: now,
    updatedAt: now,
  });

  const project = await db
    .select()
    .from(projects)
    .where(eq(projects.id, id))
    .limit(1);

  return NextResponse.json({ project: project[0] });
}

export async function PATCH(request: Request) {
  const session = await auth.api.getSession({
    headers: new Headers(),
  });

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { id, ...updates } = body;

  if (!id) {
    return NextResponse.json({ error: "Project ID required" }, { status: 400 });
  }

  await db
    .update(projects)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(projects.id, id));

  return NextResponse.json({ success: true });
}

export async function DELETE(request: Request) {
  const session = await auth.api.getSession({
    headers: new Headers(),
  });

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Project ID required" }, { status: 400 });
  }

  await db
    .update(projects)
    .set({ deletedAt: new Date() })
    .where(eq(projects.id, id));

  return NextResponse.json({ success: true });
}
