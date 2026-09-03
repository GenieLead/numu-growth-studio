import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { messages } from "@/db/schema";
import { eq, asc } from "drizzle-orm";

async function getSessionUser(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  return session?.user || null;
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: projectId } = await params;

  const projectMessages = await db
    .select()
    .from(messages)
    .where(eq(messages.projectId, projectId))
    .orderBy(asc(messages.createdAt));

  return NextResponse.json({ messages: projectMessages });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: projectId } = await params;
  const body = await request.json();
  const { role, content } = body;

  if (!role || !content) {
    return NextResponse.json({ error: "role and content required" }, { status: 400 });
  }

  const id = crypto.randomUUID();

  await db.insert(messages).values({
    id,
    projectId,
    role,
    content,
    createdAt: new Date(),
  });

  return NextResponse.json({ id });
}
