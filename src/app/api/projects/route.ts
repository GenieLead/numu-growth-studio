import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { projects, messages } from "@/db/schema";
import { eq, desc, isNull, and } from "drizzle-orm";

async function getSessionUser(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  return session?.user || null;
}

export async function GET(request: Request) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const brandId = searchParams.get("brandId");

  const whereClause = brandId
    ? and(eq(projects.userId, user.id), eq(projects.brandId, brandId))
    : eq(projects.userId, user.id);

  const userProjects = await db
    .select()
    .from(projects)
    .where(whereClause)
    .orderBy(desc(projects.updatedAt));

  // Filter out soft-deleted projects
  const active = userProjects.filter((p) => !p.deletedAt);
  return NextResponse.json({ projects: active });
}

export async function POST(request: Request) {
  const clonedRequest = request.clone();
  let body: any;
  try {
    body = await clonedRequest.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const session = await auth.api.getSession({ headers: request.headers });
  const user = session?.user || null;
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { title, duplicateFromId, remixFromId } = body;

  if (duplicateFromId) {
    const source = await db.select().from(projects).where(eq(projects.id, duplicateFromId)).limit(1);
    if (source.length === 0) return NextResponse.json({ error: "Source not found" }, { status: 404 });

    const newId = crypto.randomUUID();
    const now = new Date();

    await db.insert(projects).values({
      id: newId,
      userId: user.id,
      title: `${source[0].title} (copy)`,
      status: "draft",
      productionGraph: source[0].productionGraph,
      targetBudgetCredits: source[0].targetBudgetCredits,
      creditsSpent: 0,
      createdAt: now,
      updatedAt: now,
    });

    const sourceMessages = await db.select().from(messages).where(eq(messages.projectId, duplicateFromId));
    for (const m of sourceMessages) {
      await db.insert(messages).values({
        id: crypto.randomUUID(),
        projectId: newId,
        role: m.role,
        content: m.content,
        createdAt: m.createdAt,
      });
    }

    const project = await db.select().from(projects).where(eq(projects.id, newId)).limit(1);
    return NextResponse.json({ project: project[0] });
  }

  if (remixFromId) {
    const source = await db.select().from(projects).where(eq(projects.id, remixFromId)).limit(1);
    if (source.length === 0) return NextResponse.json({ error: "Source not found" }, { status: 404 });

    const newId = crypto.randomUUID();
    const now = new Date();

    await db.insert(projects).values({
      id: newId,
      userId: user.id,
      title: `${source[0].title} (remix)`,
      status: "draft",
      productionGraph: source[0].productionGraph,
      parentProjectId: source[0].id,
      creditsSpent: 0,
      createdAt: now,
      updatedAt: now,
    });

    const project = await db.select().from(projects).where(eq(projects.id, newId)).limit(1);
    return NextResponse.json({ project: project[0] });
  }

  const id = crypto.randomUUID();
  const now = new Date();

  await db.insert(projects).values({
    id,
    userId: user.id,
    title: title || "Untitled",
    status: "draft",
    creditsSpent: 0,
    createdAt: now,
    updatedAt: now,
  });

  const project = await db.select().from(projects).where(eq(projects.id, id)).limit(1);
  return NextResponse.json({ project: project[0] });
}

export async function PATCH(request: Request) {
  const clonedRequest = request.clone();
  let body: any;
  try {
    body = await clonedRequest.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const session = await auth.api.getSession({ headers: request.headers });
  const user = session?.user || null;
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, title } = body;
  if (!id) return NextResponse.json({ error: "Project ID required" }, { status: 400 });

  const updates: any = { updatedAt: new Date() };
  if (title !== undefined) updates.title = title;

  await db.update(projects).set(updates).where(eq(projects.id, id));
  return NextResponse.json({ success: true });
}

export async function DELETE(request: Request) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Project ID required" }, { status: 400 });

  // Hard delete — remove from DB entirely
  await db.delete(messages).where(eq(messages.projectId, id));
  await db.delete(projects).where(eq(projects.id, id));

  return NextResponse.json({ success: true });
}
