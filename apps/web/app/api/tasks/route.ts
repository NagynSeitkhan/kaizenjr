import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@course-dashboard/db";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const title = String(formData.get("title") ?? "").trim();
  const context = String(formData.get("context") ?? "").trim();

  if (!title) {
    return NextResponse.redirect(new URL("/?formError=Title is required", req.url));
  }

  const task = await prisma.task.create({
    data: {
      title,
      context: context || null,
      sourceType: "MANUAL",
      sourceRef: crypto.randomUUID(),
      mentionedAt: new Date(),
    },
  });

  await prisma.taskStatus.create({
    data: { taskId: task.id, state: "PENDING", source: "manual" },
  });

  return NextResponse.redirect(new URL("/?added=task", req.url));
}
