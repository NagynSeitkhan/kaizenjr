import { prisma } from "@course-dashboard/db";

export type RecurrenceValue = "NONE" | "DAILY" | "WEEKLY" | "MONTHLY";

// Simple calendar-math advance, not a full RRULE engine - deliberately, since
// the only cases this app needs are "every day/week/month". MONTHLY uses
// Date's own month rollover (e.g. Jan 31 -> Mar 3), a known quirk that's rare
// enough in practice not to be worth a date library for a single-user app.
export function nextOccurrenceDate(date: Date, recurrence: RecurrenceValue): Date {
  const next = new Date(date);
  if (recurrence === "DAILY") next.setDate(next.getDate() + 1);
  else if (recurrence === "WEEKLY") next.setDate(next.getDate() + 7);
  else if (recurrence === "MONTHLY") next.setMonth(next.getMonth() + 1);
  return next;
}

// Shared by the dashboard "Mark done" button and the Telegram "✅ Done"
// callback - a task advances when you actually finish it, not on a fixed
// schedule (contrast with recurring deadlines, which advance on a timer in
// apps/worker/src/jobs/advanceRecurring.ts since there's no "done" action
// for a deadline). Marks the task itself done first regardless of
// recurrence, then spawns the next occurrence only if one is configured.
export async function completeTaskAndAdvance(taskId: string): Promise<void> {
  const task = await prisma.task.findUnique({ where: { id: taskId } });

  await prisma.taskStatus.update({ where: { taskId }, data: { state: "DONE" } });

  if (task?.recurrence && task.recurrence !== "NONE" && task.dueAt) {
    const newTask = await prisma.task.create({
      data: {
        title: task.title,
        context: task.context,
        dueAt: nextOccurrenceDate(task.dueAt, task.recurrence),
        urgent: task.urgent,
        recurrence: task.recurrence,
        sourceType: "MANUAL",
        sourceRef: crypto.randomUUID(),
        mentionedAt: new Date(),
      },
    });
    await prisma.taskStatus.create({ data: { taskId: newTask.id, state: "PENDING", source: "manual" } });
  }
}
