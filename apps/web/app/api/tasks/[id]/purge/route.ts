import { NextRequest } from "next/server";
import { prisma } from "@course-dashboard/db";
import { redirectAfterAction } from "@/lib/redirect";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.taskStatus.deleteMany({ where: { taskId: id } });
  await prisma.task.delete({ where: { id } });
  return redirectAfterAction(new URL("/trash?purged=1", req.url));
}
