import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { scenes as scenesTable, projects } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { randomUUID } from "crypto";

async function getSessionUser(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  return session?.user || null;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: projectId } = await params;
  const project = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);
  if (!project.length || project[0].userId !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const rows = await db.select().from(scenesTable).where(eq(scenesTable.projectId, projectId)).orderBy(asc(scenesTable.orderIndex));
  return NextResponse.json({ scenes: rows });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: projectId } = await params;
  const project = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);
  if (!project.length || project[0].userId !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await request.json();
  const id = randomUUID();

  await db.insert(scenesTable).values({
    id,
    projectId,
    orderIndex: body.orderIndex || 0,
    title: body.title || "Untitled Scene",
    durationSec: body.durationSec || 10,
    state: body.state || { storyState: "beginning", cameraDirection: "", lightingState: "", audioState: "" },
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  return NextResponse.json({ scene: { id } });
}
