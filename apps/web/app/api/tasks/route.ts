import { NextRequest } from "next/server";
import { prisma } from "@course-dashboard/db";
import { parseUserLocalDateTime } from "@course-dashboard/shared";
import { redirectAfterAction } from "@/lib/redirect";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const title = String(formData.get("title") ?? "").trim();
  const context = String(formData.get("context") ?? "").trim();
  const dueDateRaw = String(formData.get("dueDate") ?? "");
  const dueTimeRaw = String(formData.get("dueTime") ?? "");

  if (!title) {
    return redirectAfterAction(new URL("/?formError=Title is required", req.url));
  }

  // Due date is optional for tasks (unlike deadlines) - the fields are only
  // present in the submitted form at all if the user opened the "add a due
  // date" toggle on the client, so an absent pair just means no reminder.
  let dueAt: Date | null = null;
  if (dueDateRaw && dueTimeRaw) {
    dueAt = parseUserLocalDateTime(`${dueDateRaw}T${dueTimeRaw}`);
    if (!dueAt) {
      return redirectAfterAction(new URL("/?formError=Invalid due date", req.url));
    }
  }

  try {
    const task = await prisma.task.create({
      data: {
        title,
        context: context || null,
        dueAt,
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
