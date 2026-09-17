import { prisma } from "@course-dashboard/db";

const RETENTION_DAYS = 30;

// Safe to run on the same frequent poll as everything else - it's just a
// "delete anything older than the cutoff" query, idempotent and cheap when
// there's nothing to purge. Trash isn't meant to grow forever, but 30 days
// is a generous enough window that this should never race a user who's
// still deciding whether to restore something.
export async function purgeOldTrash(): Promise<void> {
  const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000);

  const [notes, deadlines] = await Promise.all([
    prisma.note.deleteMany({ where: { deletedAt: { lt: cutoff } } }),
    (async () => {
      const toDelete = await prisma.deadline.findMany({
        where: { deletedAt: { lt: cutoff } },
        select: { id: true },
      });
      if (toDelete.length === 0) return { count: 0 };
      const ids = toDelete.map((d) => d.id);
      await prisma.notificationLog.deleteMany({ where: { deadlineId: { in: ids } } });
      return prisma.deadline.deleteMany({ where: { id: { in: ids } } });
    })(),
  ]);

  const tasksToDelete = await prisma.task.findMany({
    where: { deletedAt: { lt: cutoff } },
    select: { id: true },
  });
  let taskCount = 0;
  if (tasksToDelete.length > 0) {
    const ids = tasksToDelete.map((t) => t.id);
    await prisma.taskStatus.deleteMany({ where: { taskId: { in: ids } } });
    const result = await prisma.task.deleteMany({ where: { id: { in: ids } } });
    taskCount = result.count;
  }

  if (notes.count || deadlines.count || taskCount) {
    console.log(
      `[purgeOldTrash] removed ${notes.count} notes, ${taskCount} tasks, ${deadlines.count} deadlines older than ${RETENTION_DAYS} days`
    );
  }
}
