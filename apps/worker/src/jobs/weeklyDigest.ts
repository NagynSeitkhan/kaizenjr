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

  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const twoWeeksOut = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

  // "Last week" looks back, unlike every other digest/reminder in this app -
  // deliberately includes soft-deleted deadlines (a recurring one that
  // rolled forward still genuinely happened) but only counts tasks by when
  // their status last changed to DONE, since a task with no due date has no
  // other timestamp tying it to "this week".
  const [deadlinesDone, tasksDone, deadlinesAhead] = await Promise.all([
    prisma.deadline.count({ where: { dueAt: { gte: weekAgo, lte: now } } }),
    prisma.task.count({ where: { status: { state: "DONE", updatedAt: { gte: weekAgo, lte: now } } } }),
    prisma.deadline.findMany({
      where: { dueAt: { gte: now, lte: twoWeeksOut }, deletedAt: null },
      include: { course: true },
      orderBy: { dueAt: "asc" },
    }),
  ]);
  const deadlines = deadlinesAhead;

  const lines: string[] = [
    "<b>Week ahead</b>",
    "",
    `<b>Last week</b> — ${tasksDone} task${tasksDone === 1 ? "" : "s"} done, ${deadlinesDone} deadline${deadlinesDone === 1 ? "" : "s"} passed`,
    "",
    `<b>Next 14 days — ${deadlines.length}</b>`,
  ];
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
