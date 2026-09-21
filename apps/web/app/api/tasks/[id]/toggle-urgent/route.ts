import { NextRequest } from "next/server";
import { prisma } from "@course-dashboard/db";
import { redirectAfterAction } from "@/lib/redirect";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const task = await prisma.task.findUnique({ where: { id } });
  if (task) {
    await prisma.task.update({
      where: { id },
      data: { urgent: !task.urgent, nagAcknowledgedAt: null },
    });
  }
  return redirectAfterAction(new URL("/", req.url));
}
