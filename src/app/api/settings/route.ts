import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { userSettings } from "@/db/schema";
import { eq } from "drizzle-orm";

// Simple encryption for MVP (production should use proper AES-256-GCM)
function encryptKey(key: string): string {
  return Buffer.from(key).toString("base64");
}

function decryptKey(encrypted: string): string {
  return Buffer.from(encrypted, "base64").toString("utf-8");
}

export async function GET() {
  const session = await auth.api.getSession({
    headers: new Headers(),
  });

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const settings = await db
    .select()
    .from(userSettings)
    .where(eq(userSettings.userId, session.user.id))
    .limit(1);

  if (settings.length === 0) {
    return NextResponse.json({
      connected: false,
      last4: "",
      budget: null,
    });
  }

  const s = settings[0];
  return NextResponse.json({
    connected: !!s.encryptedOpenrouterKey,
    last4: s.openrouterKeyLast4 || "",
    budget: s.globalBudgetCredits,
  });
}

export async function POST(request: Request) {
  const session = await auth.api.getSession({
    headers: new Headers(),
  });

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { openrouterKey } = body;

  if (!openrouterKey) {
    return NextResponse.json({ error: "Key required" }, { status: 400 });
  }

  // Test the key
  try {
    const testRes = await fetch("https://openrouter.ai/api/v1/auth/key", {
      headers: {
        Authorization: `Bearer ${openrouterKey}`,
      },
    });

    if (!testRes.ok) {
      return NextResponse.json(
        { error: "Invalid API key" },
        { status: 400 }
      );
    }
  } catch {
    return NextResponse.json(
      { error: "Failed to verify key" },
      { status: 400 }
    );
  }

  const encrypted = encryptKey(openrouterKey);
  const last4 = openrouterKey.slice(-4);

  // Upsert settings
  const existing = await db
    .select()
    .from(userSettings)
    .where(eq(userSettings.userId, session.user.id))
    .limit(1);

  if (existing.length === 0) {
    await db.insert(userSettings).values({
      userId: session.user.id,
      encryptedOpenrouterKey: encrypted,
      openrouterKeyLast4: last4,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  } else {
    await db
      .update(userSettings)
      .set({
        encryptedOpenrouterKey: encrypted,
        openrouterKeyLast4: last4,
        updatedAt: new Date(),
      })
      .where(eq(userSettings.userId, session.user.id));
  }

  return NextResponse.json({ connected: true, last4 });
}

export async function PATCH(request: Request) {
  const session = await auth.api.getSession({
    headers: new Headers(),
  });

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { budget } = body;

  const existing = await db
    .select()
    .from(userSettings)
    .where(eq(userSettings.userId, session.user.id))
    .limit(1);

  if (existing.length === 0) {
    await db.insert(userSettings).values({
      userId: session.user.id,
      globalBudgetCredits: budget,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  } else {
    await db
      .update(userSettings)
      .set({
        globalBudgetCredits: budget,
        updatedAt: new Date(),
      })
      .where(eq(userSettings.userId, session.user.id));
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(request: Request) {
  const session = await auth.api.getSession({
    headers: new Headers(),
  });

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { type } = body;

  if (type === "openrouter") {
    await db
      .update(userSettings)
      .set({
        encryptedOpenrouterKey: null,
        openrouterKeyLast4: null,
        updatedAt: new Date(),
      })
      .where(eq(userSettings.userId, session.user.id));
  }

  return NextResponse.json({ success: true });
}
