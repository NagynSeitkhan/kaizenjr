import { NextRequest } from "next/server";
import { prisma } from "@course-dashboard/db";
import { redirectAfterAction } from "@/lib/redirect";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.$transaction([
    prisma.notificationLog.deleteMany({ where: { deadlineId: id } }),
    prisma.deadline.delete({ where: { id } }),
  ]);
  return redirectAfterAction(new URL("/", req.url));
}
