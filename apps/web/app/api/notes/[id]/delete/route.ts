import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@course-dashboard/db";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.note.delete({ where: { id } });
  return NextResponse.redirect(new URL("/notes?deleted=1", req.url));
}
