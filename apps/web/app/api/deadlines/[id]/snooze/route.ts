import { NextRequest } from "next/server";
import { prisma } from "@course-dashboard/db";
import { redirectAfterAction } from "@/lib/redirect";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const deadline = await prisma.deadline.findUnique({ where: { id } });
  if (deadline) {
    const newDueAt = new Date(deadline.dueAt.getTime() + 24 * 60 * 60 * 1000);
    await prisma.$transaction([
      // Clear prior T24H/T2H sends for this deadline so the reminder can
      // fire again relative to the new due time - the dedup key is per
      // deadline+kind, not per specific due date, so without this a
      // snoozed deadline would silently never remind again.
      prisma.notificationLog.deleteMany({ where: { deadlineId: id, kind: { in: ["T24H", "T2H"] } } }),
      prisma.deadline.update({ where: { id }, data: { dueAt: newDueAt } }),
    ]);
  }
  return redirectAfterAction(new URL("/", req.url));
}
