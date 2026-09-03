import { auth } from "@/lib/auth";
import { toNextHandler } from "better-auth/next";

export const { GET, POST } = toNextHandler(auth);
