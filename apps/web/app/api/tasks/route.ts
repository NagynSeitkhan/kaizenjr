import { NextRequest } from "next/server";
import { prisma } from "@course-dashboard/db";
import { redirectAfterAction } from "@/lib/redirect";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const title = String(formData.get("title") ?? "").trim();
  const context = String(formData.get("context") ?? "").trim();

  if (!title) {
    return redirectAfterAction(new URL("/?formError=Title is required", req.url));
  }

  try {
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
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown error";
    console.error("[api/tasks] create failed:", err);
    return redirectAfterAction(
      new URL(`/?formError=${encodeURIComponent(`Failed to save: ${message}`)}`, req.url)
    );
  }

  return redirectAfterAction(new URL("/?added=task", req.url));
}
