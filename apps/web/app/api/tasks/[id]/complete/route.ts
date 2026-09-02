import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@course-dashboard/db";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.taskStatus.update({
    where: { taskId: id },
    data: { state: "DONE" },
  });
  return NextResponse.redirect(new URL("/?done=1", req.url));
}
