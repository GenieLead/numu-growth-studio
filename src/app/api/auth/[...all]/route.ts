import { auth } from "@/lib/auth";

export async function GET(request: Request) {
  // @ts-expect-error - Better Auth handler types don't match Next.js but works at runtime
  return auth.handler(request);
}

export async function POST(request: Request) {
  // @ts-expect-error - Better Auth handler types don't match Next.js but works at runtime
  return auth.handler(request);
}

export async function PUT(request: Request) {
  // @ts-expect-error - Better Auth handler types don't match Next.js but works at runtime
  return auth.handler(request);
}

export async function PATCH(request: Request) {
  // @ts-expect-error - Better Auth handler types don't match Next.js but works at runtime
  return auth.handler(request);
}

export async function DELETE(request: Request) {
  // @ts-expect-error - Better Auth handler types don't match Next.js but works at runtime
  return auth.handler(request);
}
