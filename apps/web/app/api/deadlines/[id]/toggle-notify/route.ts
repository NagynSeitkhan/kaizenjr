import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@course-dashboard/db";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const deadline = await prisma.deadline.findUnique({ where: { id } });
  if (deadline) {
    await prisma.deadline.update({
      where: { id },
      data: { notifyEnabled: !deadline.notifyEnabled },
    });
  }
  return NextResponse.redirect(new URL("/", req.url));
}
