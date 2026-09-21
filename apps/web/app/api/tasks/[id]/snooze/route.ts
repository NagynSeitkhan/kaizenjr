import { NextRequest } from "next/server";
import { prisma } from "@course-dashboard/db";
import { redirectAfterAction } from "@/lib/redirect";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const task = await prisma.task.findUnique({ where: { id } });
  if (task?.dueAt) {
    const newDueAt = new Date(task.dueAt.getTime() + 24 * 60 * 60 * 1000);
    await prisma.$transaction([
      prisma.notificationLog.deleteMany({
        where: { dedupKey: { in: [`task:${id}:T24H`, `task:${id}:T2H`, `task:${id}:T10M`, `task:${id}:T0`] } },
      }),
      prisma.task.update({ where: { id }, data: { dueAt: newDueAt, nagAcknowledgedAt: null } }),
    ]);
  }
  return redirectAfterAction(new URL("/", req.url));
}
