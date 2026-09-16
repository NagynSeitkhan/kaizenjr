import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@course-dashboard/db";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.$transaction([
    prisma.notificationLog.deleteMany({ where: { deadlineId: id } }),
    prisma.deadline.delete({ where: { id } }),
  ]);
  return NextResponse.redirect(new URL("/", req.url));
}
