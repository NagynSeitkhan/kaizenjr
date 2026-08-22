import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, expectedSessionToken, secureCompare } from "@/lib/session";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const password = String(formData.get("password") ?? "");
  const expected = process.env.DASHBOARD_PASSWORD ?? "";

  if (!expected || !secureCompare(password, expected)) {
    return NextResponse.redirect(new URL("/login?error=1", req.url));
  }

  const res = NextResponse.redirect(new URL("/", req.url));
  res.cookies.set(SESSION_COOKIE, await expectedSessionToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}
