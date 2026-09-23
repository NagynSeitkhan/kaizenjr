import { NextRequest } from "next/server";
import { prisma } from "@course-dashboard/db";
import { redirectAfterAction } from "@/lib/redirect";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.taskStatus.update({ where: { taskId: id }, data: { state: "PENDING" } });
  return redirectAfterAction(new URL("/history?restored=1", req.url));
}
