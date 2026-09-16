import { prisma } from "@course-dashboard/db";
import { sendTelegramMessage, formatUserDateTime, currentHourForUser, USER_TIMEZONE } from "@course-dashboard/shared";

const weeklyHourRaw = process.env.WEEKLY_DIGEST_HOUR?.trim();
const WEEKLY_DIGEST_HOUR = weeklyHourRaw ? Number(weeklyHourRaw) : 18;

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function isSundayForUser(): boolean {
  const weekday = new Intl.DateTimeFormat("en-US", { timeZone: USER_TIMEZONE, weekday: "long" }).format(new Date());
  return weekday === "Sunday";
}

// A longer-horizon (14 day) planning digest, distinct from the daily one:
// Sunday evening, "here's your week ahead" rather than "here's today".
export async function runWeeklyDigest(): Promise<void> {
  if (!isSundayForUser() || currentHourForUser() < WEEKLY_DIGEST_HOUR) {
    return;
  }

  const today = new Date().toISOString().slice(0, 10);
  const dedupKey = `weekly:${today}`;

  const alreadySent = await prisma.notificationLog.findUnique({ where: { dedupKey } });
  if (alreadySent) {
    return;
  }

  const twoWeeksOut = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
  const deadlines = await prisma.deadline.findMany({
    where: { dueAt: { gte: new Date(), lte: twoWeeksOut } },
    include: { course: true },
    orderBy: { dueAt: "asc" },
  });

  const lines: string[] = ["<b>Week ahead</b>", "", `<b>Next 14 days — ${deadlines.length}</b>`];
  if (deadlines.length === 0) {
    lines.push("Nothing on the horizon.");
  } else {
    for (const d of deadlines) {
      const courseTag = d.course ? `[${escapeHtml(d.course.name)}] ` : "";
      lines.push(`• ${courseTag}${escapeHtml(d.title)} — ${formatUserDateTime(d.dueAt)}`);
    }
  }

  const text = lines.join("\n");

  try {
    const messageId = await sendTelegramMessage(text);
    await prisma.notificationLog.create({
      data: { kind: "DIGEST", dedupKey, telegramMessageId: messageId ?? undefined },
    });
    console.log("[weeklyDigest] sent");
  } catch (err) {
    console.error("[weeklyDigest] failed:", err instanceof Error ? err.message : err);
  }
}
