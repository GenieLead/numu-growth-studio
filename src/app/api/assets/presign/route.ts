import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { issueSignedToken, presignUrl } from "@vercel/blob";

async function getSessionUser(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  return session?.user || null;
}

export async function POST(request: Request) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { filename, contentType, projectId } = body;

  if (!filename) return NextResponse.json({ error: "filename required" }, { status: 400 });

  const ext = filename.split(".").pop() || "bin";
  const pathname = `${user.id}/${projectId || "general"}/${crypto.randomUUID()}.${ext}`;

  try {
    const signedToken = await issueSignedToken({
      pathname,
      operations: ["put"],
    });

    const result = await presignUrl(signedToken, {
      pathname,
      operation: "put",
      access: "private",
    });

    return NextResponse.json({
      presignedUrl: result.presignedUrl,
      pathname,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
