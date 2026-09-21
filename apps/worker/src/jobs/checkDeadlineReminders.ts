import { prisma } from "@course-dashboard/db";
import { sendTelegramMessage, sendTelegramPhoto, type InlineButton } from "@course-dashboard/shared";
import type { Prisma } from "@prisma/client";

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function addMinutes(base: Date, minutes: number): Date {
  return new Date(base.getTime() + minutes * 60 * 1000);
}

async function remind(
  kind: "T24H" | "T2H" | "T10M" | "T0",
  emoji: string,
  label: string,
  dueAtWhere: Prisma.DeadlineWhereInput["dueAt"]
): Promise<void> {
  const deadlines = await prisma.deadline.findMany({
    where: { dueAt: dueAtWhere, notifyEnabled: true, deletedAt: null },
    include: { course: true },
  });

  for (const d of deadlines) {
    const dedupKey = `${d.id}:${kind}`;
    const exists = await prisma.notificationLog.findUnique({ where: { dedupKey } });
    if (exists) continue;

    const courseTag = d.course ? `[${escapeHtml(d.course.name)}] ` : "";
    const text = `${emoji} <b>${label}:</b> ${courseTag}${escapeHtml(d.title)}`;
    const buttons: InlineButton[] = [
      { text: "🔕 Mute", callback_data: `mute:deadline:${d.id}` },
      { text: "⏰ +1h", callback_data: `snooze1h:deadline:${d.id}` },
      { text: "⏳ Tomorrow", callback_data: `snoozeday:deadline:${d.id}` },
    ];

    try {
      let messageId: string | null;
      if (d.imageUrl) {
        try {
          messageId = await sendTelegramPhoto(d.imageUrl, text, buttons);
        } catch (photoErr) {
          // Image delivery is a bonus, not the point - a phone number in a
          // reminder that never arrives is worse than one without its photo.
          console.error(`[checkDeadlineReminders] photo send failed for "${d.title}", falling back to text:`, photoErr);
          messageId = await sendTelegramMessage(text, buttons);
        }
      } else {
        messageId = await sendTelegramMessage(text, buttons);
      }

      await prisma.notificationLog.create({
        data: { kind, dedupKey, deadlineId: d.id, telegramMessageId: messageId ?? undefined },
      });
      console.log(`[checkDeadlineReminders] sent ${kind} for "${d.title}"`);
    } catch (err) {
      console.error(`[checkDeadlineReminders] failed to send ${kind} for "${d.title}":`, err);
    }
  }
}

// Runs on a frequent poll (every ~10 min, see .github/workflows/worker.yml).
// Each deadline gets exactly one message per kind, enforced by the unique
// dedupKey regardless of how many times this function runs while the
// deadline sits in a given window. T24H/T2H/T10M look forward ("due within
// the next N minutes"); T0 looks backward ("became due in roughly the last
// poll interval") since by the time a poll runs the exact due minute has
// usually already passed.
export async function checkDeadlineReminders(): Promise<void> {
  const now = new Date();
  await remind("T24H", "⏰", "Due in ~24h", { gte: now, lte: addMinutes(now, 24 * 60) });
  await remind("T2H", "🚨", "Due in ~2h", { gte: now, lte: addMinutes(now, 120) });
  await remind("T10M", "⏳", "Due in ~10 min", { gte: now, lte: addMinutes(now, 10) });
  await remind("T0", "🔔", "Due now", { gte: addMinutes(now, -10), lte: now });
}
