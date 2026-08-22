import { NextRequest, NextResponse } from "next/server";
import { storeTokensFromCode } from "@course-dashboard/shared";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  if (!code) {
    return NextResponse.redirect(new URL("/?googleError=missing_code", req.url));
  }

  try {
    await storeTokensFromCode(code);
    return NextResponse.redirect(new URL("/?googleConnected=1", req.url));
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown_error";
    return NextResponse.redirect(
      new URL(`/?googleError=${encodeURIComponent(message)}`, req.url)
    );
  }
}
