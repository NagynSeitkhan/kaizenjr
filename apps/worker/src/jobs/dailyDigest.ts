import { prisma } from "@course-dashboard/db";
import { sendTelegramMessage, formatUserDateTime, currentHourForUser } from "@course-dashboard/shared";

// "?? 8" alone isn't enough here: GitHub Actions passes unset repo variables
// through as an empty string rather than omitting them, and "" is not
// nullish, so it would slip past "??" and become Number("") = 0.
const digestHourRaw = process.env.DIGEST_HOUR?.trim();
const DIGEST_HOUR = digestHourRaw ? Number(digestHourRaw) : 8;

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Runs on a frequent poll (see index.ts), not a once-a-day cron: gating on
// DIGEST_HOUR + a per-day dedup key means a Telegram outage at 8:00 just
// retries at 8:15/8:30/... instead of silently skipping the whole day.
export async function runDailyDigest(): Promise<void> {
  if (currentHourForUser() < DIGEST_HOUR) {
    return;
  }

  const today = new Date().toISOString().slice(0, 10);
  const dedupKey = `digest:${today}`;

  const alreadySent = await prisma.notificationLog.findUnique({ where: { dedupKey } });
  if (alreadySent) {
    return;
  }

  const weekOut = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const [deadlines, tasks] = await Promise.all([
    prisma.deadline.findMany({
      where: { dueAt: { gte: new Date(), lte: weekOut } },
      include: { course: true },
      orderBy: { dueAt: "asc" },
    }),
    prisma.task.findMany({
      where: { status: { state: { in: ["PENDING", "IN_PROGRESS", "UNKNOWN"] } } },
      include: { status: true },
      orderBy: { mentionedAt: "desc" },
      take: 10,
    }),
  ]);

  const lines: string[] = ["<b>Morning digest</b>"];

  lines.push("");
  lines.push(`<b>Upcoming (7 days) — ${deadlines.length}</b>`);
  if (deadlines.length === 0) {
    lines.push("Nothing on the calendar this week.");
  } else {
    for (const d of deadlines) {
      const courseTag = d.course ? `[${escapeHtml(d.course.name)}] ` : "";
      lines.push(`• ${courseTag}${escapeHtml(d.title)} — ${formatUserDateTime(d.dueAt)}`);
    }
  }

  lines.push("");
  lines.push(`<b>Open tasks — ${tasks.length}</b>`);
  if (tasks.length === 0) {
    lines.push("Nothing pending.");
  } else {
    for (const t of tasks) {
      lines.push(`• ${escapeHtml(t.title)} (${t.status?.state ?? "UNKNOWN"})`);
    }
  }

  const text = lines.join("\n");

  try {
    const messageId = await sendTelegramMessage(text);
    // Record success only after the send actually succeeds, so a failure
    // leaves no dedup row behind and the next poll tries again.
    await prisma.notificationLog.create({
      data: { kind: "DIGEST", dedupKey, telegramMessageId: messageId ?? undefined },
    });
    console.log("[dailyDigest] sent");
  } catch (err) {
    console.error("[dailyDigest] failed:", err instanceof Error ? err.message : err);
  }
}
