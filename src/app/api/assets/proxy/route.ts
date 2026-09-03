import { auth } from "@/lib/auth";
import { get } from "@vercel/blob";

async function getSessionUser(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  return session?.user || null;
}

export async function GET(request: Request) {
  const user = await getSessionUser(request);
  if (!user) return new Response("Unauthorized", { status: 401 });

  const { searchParams } = new URL(request.url);
  const url = searchParams.get("url");
  if (!url) return new Response("Missing url", { status: 400 });

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result: any = await get(url, { access: "private" });

    if (!result || result.statusCode === 304 || !result.stream) {
      return new Response("Not modified", { status: 304 });
    }

    const contentType = result.blob?.contentType || "application/octet-stream";

    return new Response(result.stream, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
