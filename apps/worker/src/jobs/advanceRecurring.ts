import { prisma } from "@course-dashboard/db";
import { nextOccurrenceDate } from "@course-dashboard/shared";

// A deadline has no "done" action (it's just a marker in time), so recurring
// deadlines advance on a schedule instead: once one is far enough past due
// that all its reminders have already fired, spawn the next occurrence and
// soft-delete this one (it lands in Trash like any other delete - still
// recoverable, still auto-purges in 30 days).
//
// Recurring TASKS advance differently, at completion time (see
// apps/web/app/api/tasks/[id]/complete/route.ts and the Telegram "done"
// callback) - a task is something you finish, not just a point in time, so
// advancing it on a schedule regardless of whether you did it would hide
// the fact that you missed one.
const PAST_DUE_BUFFER_MS = 60 * 60 * 1000;

export async function advanceRecurringDeadlines(): Promise<void> {
  const cutoff = new Date(Date.now() - PAST_DUE_BUFFER_MS);

  const overdue = await prisma.deadline.findMany({
    where: { recurrence: { not: "NONE" }, deletedAt: null, dueAt: { lt: cutoff } },
  });

  for (const d of overdue) {
    try {
      await prisma.$transaction([
        prisma.deadline.create({
          data: {
            title: d.title,
            description: d.description,
            dueAt: nextOccurrenceDate(d.dueAt, d.recurrence),
            source: d.source,
            externalId: crypto.randomUUID(),
            courseId: d.courseId,
            imageUrl: d.imageUrl,
            urgent: d.urgent,
            recurrence: d.recurrence,
          },
        }),
        prisma.deadline.update({ where: { id: d.id }, data: { deletedAt: new Date() } }),
      ]);
      console.log(`[advanceRecurring] rolled deadline "${d.title}" forward to its next occurrence`);
    } catch (err) {
      console.error(`[advanceRecurring] failed to roll deadline "${d.title}" forward:`, err);
    }
  }
}
