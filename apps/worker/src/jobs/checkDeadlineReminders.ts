import { prisma } from "@course-dashboard/db";
import { sendTelegramMessage } from "@course-dashboard/shared";

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

async function remindWindow(
  kind: "T24H" | "T2H",
  emoji: string,
  label: string,
  windowHours: number
): Promise<void> {
  const now = new Date();
  const windowEnd = new Date(now.getTime() + windowHours * 60 * 60 * 1000);

  const deadlines = await prisma.deadline.findMany({
    where: { dueAt: { gte: now, lte: windowEnd } },
    include: { course: true },
  });

  for (const d of deadlines) {
    const dedupKey = `${d.id}:${kind}`;
    const exists = await prisma.notificationLog.findUnique({ where: { dedupKey } });
    if (exists) continue;

    const courseTag = d.course ? `[${escapeHtml(d.course.name)}] ` : "";
    const text = `${emoji} <b>${label}:</b> ${courseTag}${escapeHtml(d.title)}`;

    try {
      const messageId = await sendTelegramMessage(text);
      await prisma.notificationLog.create({
        data: { kind, dedupKey, deadlineId: d.id, telegramMessageId: messageId ?? undefined },
      });
      console.log(`[checkDeadlineReminders] sent ${kind} for "${d.title}"`);
    } catch (err) {
      console.error(`[checkDeadlineReminders] failed to send ${kind} for "${d.title}":`, err);
    }
  }
}

// Runs on a frequent poll (every ~15 min). Each deadline gets exactly one
// T24H and one T2H message, enforced by the unique dedupKey regardless of
// how many times this function runs while the deadline sits in that window.
export async function checkDeadlineReminders(): Promise<void> {
  await remindWindow("T24H", "⏰", "Due in ~24h", 24);
  await remindWindow("T2H", "🚨", "Due in ~2h", 2);
}
