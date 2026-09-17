import { NextRequest } from "next/server";
import { prisma } from "@course-dashboard/db";
import { redirectAfterAction } from "@/lib/redirect";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.task.update({ where: { id }, data: { deletedAt: null } });
  return redirectAfterAction(new URL("/trash?restored=1", req.url));
}
