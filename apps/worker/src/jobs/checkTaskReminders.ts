import { prisma } from "@course-dashboard/db";
import { sendTelegramMessage, type InlineButton } from "@course-dashboard/shared";

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Mirrors checkDeadlineReminders.ts for tasks with a dueAt set. Uses a
// "task:<id>:<kind>" dedupKey (no schema change needed - NotificationLog's
// deadlineId simply stays null for these) so the two reminder types can't
// collide even if a task and a deadline happen to share an id-like string.
async function remindWindow(
  kind: "T24H" | "T2H",
  emoji: string,
  label: string,
  windowHours: number
): Promise<void> {
  const now = new Date();
  const windowEnd = new Date(now.getTime() + windowHours * 60 * 60 * 1000);

  const tasks = await prisma.task.findMany({
    where: {
      dueAt: { gte: now, lte: windowEnd },
      status: { state: { not: "DONE" } },
      deletedAt: null,
    },
  });

  for (const t of tasks) {
    const dedupKey = `task:${t.id}:${kind}`;
    const exists = await prisma.notificationLog.findUnique({ where: { dedupKey } });
    if (exists) continue;

    const text = `${emoji} <b>${label}:</b> ${escapeHtml(t.title)}${
      t.context ? ` — ${escapeHtml(t.context)}` : ""
    }`;
    const buttons: InlineButton[] = [
      { text: "✅ Done", callback_data: `done:task:${t.id}` },
      { text: "⏰ +1h", callback_data: `snooze1h:task:${t.id}` },
      { text: "⏳ Tomorrow", callback_data: `snoozeday:task:${t.id}` },
    ];

    try {
      const messageId = await sendTelegramMessage(text, buttons);
      await prisma.notificationLog.create({
        data: { kind, dedupKey, telegramMessageId: messageId ?? undefined },
      });
      console.log(`[checkTaskReminders] sent ${kind} for "${t.title}"`);
    } catch (err) {
      console.error(`[checkTaskReminders] failed to send ${kind} for "${t.title}":`, err);
    }
  }
}

export async function checkTaskReminders(): Promise<void> {
  await remindWindow("T24H", "⏰", "Task due in ~24h", 24);
  await remindWindow("T2H", "🚨", "Task due in ~2h", 2);
}
