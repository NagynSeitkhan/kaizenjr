import { NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/session";
import { redirectAfterAction } from "@/lib/redirect";

export async function POST(req: NextRequest) {
  const res = redirectAfterAction(new URL("/login", req.url));
  res.cookies.delete(SESSION_COOKIE);
  return res;
}
