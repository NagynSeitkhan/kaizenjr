import { NextResponse } from "next/server";
import { getAuthUrl } from "@course-dashboard/shared";

export async function GET() {
  return NextResponse.redirect(getAuthUrl());
}
