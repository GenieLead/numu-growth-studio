const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export const authClient = {
  async signIn(email: string, password: string) {
    const res = await fetch(`${BASE_URL}/api/auth/sign-in/email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
      credentials: "include",
    });
    const data = await res.json();
    return { data: data?.user ? { user: data.user } : null, error: data?.error ? { message: data.error } : null };
  },

  async signUp(name: string, email: string, password: string) {
    const res = await fetch(`${BASE_URL}/api/auth/sign-up/email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
      credentials: "include",
    });
    const data = await res.json();
    return { data: data?.user ? { user: data.user } : null, error: data?.error ? { message: data.error } : null };
  },

  async signOut() {
    await fetch(`${BASE_URL}/api/auth/sign-out`, {
      method: "POST",
      credentials: "include",
    });
  },

  async getSession() {
    const res = await fetch(`${BASE_URL}/api/auth/get-session`, {
      credentials: "include",
    });
    const data = await res.json();
    return data?.data || null;
  },
};
