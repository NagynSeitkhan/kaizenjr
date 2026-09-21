import { prisma } from "@course-dashboard/db";
import { sendTelegramMessage, sendTelegramPhoto, formatUserDateTime, type InlineButton } from "@course-dashboard/shared";

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// How often an overdue "urgent" item gets re-pinged. Bounded below by how
// often this job actually runs (see .github/workflows/worker.yml) - setting
// this under that interval has no effect.
const NAG_INTERVAL_MINUTES = Number(process.env.NAG_INTERVAL_MINUTES ?? 15);

async function nagDeadlines(now: Date): Promise<void> {
  const deadlines = await prisma.deadline.findMany({
    where: { urgent: true, notifyEnabled: true, deletedAt: null, nagAcknowledgedAt: null, dueAt: { lte: now } },
    include: { course: true },
  });

  for (const d of deadlines) {
    const lastNag = await prisma.notificationLog.findFirst({
      where: { deadlineId: d.id, kind: "NAG" },
      orderBy: { sentAt: "desc" },
    });
    if (lastNag && now.getTime() - lastNag.sentAt.getTime() < NAG_INTERVAL_MINUTES * 60 * 1000) continue;

    const courseTag = d.course ? `[${escapeHtml(d.course.name)}] ` : "";
    const text = `🚨 <b>Still not handled:</b> ${courseTag}${escapeHtml(d.title)} — was due ${formatUserDateTime(d.dueAt)}`;
    const buttons: InlineButton[] = [
      { text: "✅ Accept", callback_data: `accept:deadline:${d.id}` },
      { text: "🔕 Mute", callback_data: `mute:deadline:${d.id}` },
      { text: "⏳ +1 day", callback_data: `snoozeday:deadline:${d.id}` },
    ];

    try {
      let messageId: string | null;
      if (d.imageUrl) {
        try {
          messageId = await sendTelegramPhoto(d.imageUrl, text, buttons);
        } catch (photoErr) {
          console.error(`[urgentNags] photo send failed for "${d.title}", falling back to text:`, photoErr);
          messageId = await sendTelegramMessage(text, buttons);
        }
      } else {
        messageId = await sendTelegramMessage(text, buttons);
      }

      // Each nag is its own row (dedupKey includes the timestamp) since,
      // unlike the one-shot T24H/T2H/T10M/T0 kinds, NAG is meant to repeat.
      await prisma.notificationLog.create({
        data: { kind: "NAG", dedupKey: `${d.id}:NAG:${now.getTime()}`, deadlineId: d.id, telegramMessageId: messageId ?? undefined },
      });
      console.log(`[urgentNags] nagged for deadline "${d.title}"`);
    } catch (err) {
      console.error(`[urgentNags] failed to nag for deadline "${d.title}":`, err);
    }
  }
}

async function nagTasks(now: Date): Promise<void> {
  const tasks = await prisma.task.findMany({
    where: {
      urgent: true,
      deletedAt: null,
      nagAcknowledgedAt: null,
      dueAt: { lte: now },
      status: { state: { not: "DONE" } },
    },
  });

  for (const t of tasks) {
    const lastNag = await prisma.notificationLog.findFirst({
      where: { dedupKey: { startsWith: `task:${t.id}:NAG:` } },
      orderBy: { sentAt: "desc" },
    });
    if (lastNag && now.getTime() - lastNag.sentAt.getTime() < NAG_INTERVAL_MINUTES * 60 * 1000) continue;

    const text = `🚨 <b>Still not done:</b> ${escapeHtml(t.title)}${
      t.context ? ` — ${escapeHtml(t.context)}` : ""
    } — was due ${formatUserDateTime(t.dueAt as Date)}`;
    const buttons: InlineButton[] = [
      { text: "✅ Accept", callback_data: `accept:task:${t.id}` },
      { text: "✅ Done", callback_data: `done:task:${t.id}` },
      { text: "⏳ +1 day", callback_data: `snoozeday:task:${t.id}` },
    ];

    try {
      const messageId = await sendTelegramMessage(text, buttons);
      await prisma.notificationLog.create({
        data: { kind: "NAG", dedupKey: `task:${t.id}:NAG:${now.getTime()}`, telegramMessageId: messageId ?? undefined },
      });
      console.log(`[urgentNags] nagged for task "${t.title}"`);
    } catch (err) {
      console.error(`[urgentNags] failed to nag for task "${t.title}":`, err);
    }
  }
}

// Only touches items explicitly marked "urgent" - everything else keeps the
// existing one-shot T24H/T2H/T10M/T0 reminders and is never repeated. Stops
// nagging when the item is done, deleted, muted (deadlines), snoozed (which
// resets nagAcknowledgedAt to null but also pushes dueAt into the future so
// this query simply stops matching it), or explicitly acknowledged via the
// "Accept" button.
export async function sendUrgentNags(): Promise<void> {
  const now = new Date();
  await nagDeadlines(now);
  await nagTasks(now);
}
