import { NextRequest } from "next/server";
import { prisma } from "@course-dashboard/db";
import { redirectAfterAction } from "@/lib/redirect";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const deadline = await prisma.deadline.findUnique({ where: { id } });
  if (deadline) {
    await prisma.deadline.update({
      where: { id },
      data: { notifyEnabled: !deadline.notifyEnabled },
    });
  }
  return redirectAfterAction(new URL("/", req.url));
}
