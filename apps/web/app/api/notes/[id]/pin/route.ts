import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@course-dashboard/db";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const note = await prisma.note.findUnique({ where: { id } });
  if (note) {
    await prisma.note.update({ where: { id }, data: { pinned: !note.pinned } });
  }
  return NextResponse.redirect(new URL("/notes", req.url));
}
