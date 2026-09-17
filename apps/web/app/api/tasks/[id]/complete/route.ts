import { NextRequest } from "next/server";
import { prisma } from "@course-dashboard/db";
import { redirectAfterAction } from "@/lib/redirect";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.taskStatus.update({
    where: { taskId: id },
    data: { state: "DONE" },
  });
  return redirectAfterAction(new URL("/?done=1", req.url));
}
