import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { head } from "@vercel/blob";

async function getSessionUser(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  return session?.user || null;
}

export async function GET(request: Request) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const pathname = searchParams.get("pathname");
  if (!pathname) return NextResponse.json({ error: "Missing pathname" }, { status: 400 });

  try {
    const blob = await head(pathname);
    return NextResponse.json({ url: blob.url });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
