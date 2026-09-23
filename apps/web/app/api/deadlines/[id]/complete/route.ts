import { NextRequest } from "next/server";
import { prisma } from "@course-dashboard/db";
import { redirectAfterAction } from "@/lib/redirect";

// Distinct from delete: a completed deadline stays in normal storage (shows
// up in History instead of Trash) and just stops reminding/nagging about it
// - unlike delete, this is meant for "I did this, keep the record" rather
// than "get rid of it".
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.deadline.update({ where: { id }, data: { completedAt: new Date() } });
  return redirectAfterAction(new URL("/?done=deadline", req.url));
}
