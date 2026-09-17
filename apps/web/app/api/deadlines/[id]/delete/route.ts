import { NextRequest } from "next/server";
import { prisma } from "@course-dashboard/db";
import { redirectAfterAction } from "@/lib/redirect";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // notifyEnabled: false is belt-and-suspenders alongside checkDeadlineReminders'
  // own deletedAt filter, so a trashed deadline can't still ping Telegram
  // while it's sitting there waiting to be restored or purged.
  await prisma.deadline.update({ where: { id }, data: { deletedAt: new Date(), notifyEnabled: false } });
  return redirectAfterAction(new URL("/", req.url));
}
