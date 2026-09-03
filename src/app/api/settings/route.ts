import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { userSettings } from "@/db/schema";
import { eq } from "drizzle-orm";

async function getAuthedUser(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  return session?.user || null;
}

export async function GET(request: Request) {
  const user = await getAuthedUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const settings = await db.select().from(userSettings).where(eq(userSettings.userId, user.id)).limit(1);

  if (settings.length === 0) {
    return NextResponse.json({ connected: false, last4: "", budget: null });
  }

  const s = settings[0];
  return NextResponse.json({
    connected: !!s.encryptedOpenrouterKey,
    last4: s.openrouterKeyLast4 || "",
    budget: s.globalBudgetCredits,
  });
}

export async function POST(request: Request) {
  const user = await getAuthedUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { openrouterKey } = body;
  if (!openrouterKey) return NextResponse.json({ error: "Key required" }, { status: 400 });

  // Test the key
  try {
    const testRes = await fetch("https://openrouter.ai/api/v1/auth/key", {
      headers: { Authorization: `Bearer ${openrouterKey}` },
    });
    if (!testRes.ok) return NextResponse.json({ error: "Invalid API key" }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "Failed to verify key" }, { status: 400 });
  }

  const encrypted = Buffer.from(openrouterKey).toString("base64");
  const last4 = openrouterKey.slice(-4);

  const existing = await db.select().from(userSettings).where(eq(userSettings.userId, user.id)).limit(1);

  if (existing.length === 0) {
    await db.insert(userSettings).values({
      userId: user.id,
      encryptedOpenrouterKey: encrypted,
      openrouterKeyLast4: last4,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  } else {
    await db.update(userSettings).set({ encryptedOpenrouterKey: encrypted, openrouterKeyLast4: last4, updatedAt: new Date() }).where(eq(userSettings.userId, user.id));
  }

  return NextResponse.json({ connected: true, last4 });
}

export async function PATCH(request: Request) {
  const user = await getAuthedUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { budget } = body;

  const existing = await db.select().from(userSettings).where(eq(userSettings.userId, user.id)).limit(1);

  if (existing.length === 0) {
    await db.insert(userSettings).values({ userId: user.id, globalBudgetCredits: budget, createdAt: new Date(), updatedAt: new Date() });
  } else {
    await db.update(userSettings).set({ globalBudgetCredits: budget, updatedAt: new Date() }).where(eq(userSettings.userId, user.id));
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(request: Request) {
  const user = await getAuthedUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  if (body.type === "openrouter") {
    await db.update(userSettings).set({ encryptedOpenrouterKey: null, openrouterKeyLast4: null, updatedAt: new Date() }).where(eq(userSettings.userId, user.id));
  }

  return NextResponse.json({ success: true });
}
