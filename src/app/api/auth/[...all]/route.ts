import { auth } from "@/lib/auth";
import { toNextHandler } from "better-auth/next-js";

const handler = toNextHandler(auth);

export { handler as GET, handler as POST };
