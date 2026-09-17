import { NextRequest } from "next/server";
import { prisma } from "@course-dashboard/db";
import { redirectAfterAction } from "@/lib/redirect";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // Restoring re-enables notifications too - a deadline you deliberately
  // muted before trashing it is an edge case; "bring it back working" is
  // the more useful default, and it's a one-click toggle to mute again.
  await prisma.deadline.update({ where: { id }, data: { deletedAt: null, notifyEnabled: true } });
  return redirectAfterAction(new URL("/trash?restored=1", req.url));
}
