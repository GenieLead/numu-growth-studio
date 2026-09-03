import { auth } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    return Response.json({ user: session.user, session: session.session });
  } catch {
    return Response.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const url = new URL(request.url);
    const path = url.pathname.replace("/api/auth", "");

    // Handle sign in
    if (path === "/sign-in/email") {
      const body = await request.json();
      const result = await auth.api.signInEmail({
        body: {
          email: body.email,
          password: body.password,
        },
        headers: request.headers,
      });
      return Response.json(result);
    }

    // Handle sign up
    if (path === "/sign-up/email") {
      const body = await request.json();
      const result = await auth.api.signUpEmail({
        body: {
          email: body.email,
          password: body.password,
          name: body.name,
        },
        headers: request.headers,
      });
      return Response.json(result);
    }

    // Handle sign out
    if (path === "/sign-out") {
      await auth.api.signOut({
        headers: request.headers,
      });
      return Response.json({ success: true });
    }

    // Handle get session
    if (path === "/get-session") {
      const session = await auth.api.getSession({
        headers: request.headers,
      });
      return Response.json({ data: session });
    }

    return Response.json({ error: "Not found" }, { status: 404 });
  } catch (error: any) {
    return Response.json(
      { error: error.message || "Internal error" },
      { status: 500 }
    );
  }
}
