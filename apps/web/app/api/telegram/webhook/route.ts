import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@course-dashboard/db";
import {
  processQuickCapture,
  sendTelegramMessage,
  answerCallbackQuery,
  removeInlineKeyboard,
  completeTaskAndAdvance,
  formatUserDateTime,
  parseUserLocalDateTime,
  USER_TIMEZONE,
} from "@course-dashboard/shared";

interface TelegramMessage {
  message_id: number;
  text?: string;
  caption?: string;
}

interface TelegramCallbackQuery {
  id: string;
  data?: string;
  message?: { message_id: number; chat: { id: number } };
}

interface TelegramUpdate {
  message?: TelegramMessage;
  callback_query?: TelegramCallbackQuery;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Matches a bare word command ("today"), a slash command ("/today"), and a
// slash command with a bot-username suffix Telegram adds in group chats
// ("/today@YourBotName") - all should trigger the same on-demand agenda.
function matchesCommand(text: string, ...names: string[]): boolean {
  const word = text.trim().toLowerCase().replace(/^\//, "").split(/[@\s]/)[0];
  return names.includes(word);
}

function endOfTodayAstana(): Date {
  const todayStr = new Intl.DateTimeFormat("en-CA", { timeZone: USER_TIMEZONE }).format(new Date());
  return parseUserLocalDateTime(`${todayStr}T23:59`) ?? new Date();
}

async function buildTodayAgenda(): Promise<string> {
  const now = new Date();
  const endOfToday = endOfTodayAstana();

  const [deadlines, tasks] = await Promise.all([
    prisma.deadline.findMany({
      where: { dueAt: { lte: endOfToday }, deletedAt: null },
      include: { course: true },
      orderBy: { dueAt: "asc" },
    }),
    prisma.task.findMany({
      where: { dueAt: { lte: endOfToday }, deletedAt: null, status: { state: { not: "DONE" } } },
      orderBy: { dueAt: "asc" },
    }),
  ]);

  const lines: string[] = ["<b>Today</b>", "", `<b>Deadlines — ${deadlines.length}</b>`];
  if (deadlines.length === 0) {
    lines.push("Nothing due today.");
  } else {
    for (const d of deadlines) {
      const courseTag = d.course ? `[${escapeHtml(d.course.name)}] ` : "";
      const overdue = d.dueAt < now ? " ⚠️ OVERDUE" : "";
      lines.push(`• ${courseTag}${escapeHtml(d.title)} — ${formatUserDateTime(d.dueAt)}${overdue}`);
    }
  }

  lines.push("", `<b>Tasks — ${tasks.length}</b>`);
  if (tasks.length === 0) {
    lines.push("Nothing due today.");
  } else {
    for (const t of tasks) {
      const overdue = t.dueAt && t.dueAt < now ? " ⚠️ OVERDUE" : "";
      const dueLabel = t.dueAt ? ` — ${formatUserDateTime(t.dueAt)}` : "";
      lines.push(`• ${escapeHtml(t.title)}${t.context ? ` — ${escapeHtml(t.context)}` : ""}${dueLabel}${overdue}`);
    }
  }

  return lines.join("\n");
}

async function buildWeekAgenda(): Promise<string> {
  const now = new Date();
  const weekOut = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const [deadlines, tasks] = await Promise.all([
    prisma.deadline.findMany({
      where: { dueAt: { gte: now, lte: weekOut }, deletedAt: null },
      include: { course: true },
      orderBy: { dueAt: "asc" },
    }),
    prisma.task.findMany({
      where: { dueAt: { gte: now, lte: weekOut }, deletedAt: null, status: { state: { not: "DONE" } } },
      orderBy: { dueAt: "asc" },
    }),
  ]);

  const lines: string[] = ["<b>Next 7 days</b>", "", `<b>Deadlines — ${deadlines.length}</b>`];
  if (deadlines.length === 0) {
    lines.push("Nothing on the calendar this week.");
  } else {
    for (const d of deadlines) {
      const courseTag = d.course ? `[${escapeHtml(d.course.name)}] ` : "";
      lines.push(`• ${courseTag}${escapeHtml(d.title)} — ${formatUserDateTime(d.dueAt)}`);
    }
  }

  lines.push("", `<b>Tasks with a due date — ${tasks.length}</b>`);
  if (tasks.length === 0) {
    lines.push("Nothing due this week.");
  } else {
    for (const t of tasks) {
      lines.push(`• ${escapeHtml(t.title)}${t.context ? ` — ${escapeHtml(t.context)}` : ""} — ${formatUserDateTime(t.dueAt as Date)}`);
    }
  }

  return lines.join("\n");
}

async function buildTaskList(): Promise<string> {
  const tasks = await prisma.task.findMany({
    where: { deletedAt: null, status: { state: { not: "DONE" } } },
    orderBy: [{ dueAt: { sort: "asc", nulls: "last" } }, { createdAt: "desc" }],
    take: 30,
  });

  const lines: string[] = [`<b>Open tasks (${tasks.length})</b>`];
  if (tasks.length === 0) {
    lines.push("Nothing pending — you're clear.");
  } else {
    for (const t of tasks) {
      const dueLabel = t.dueAt ? ` — ${formatUserDateTime(t.dueAt)}` : "";
      lines.push(`• ${t.urgent ? "🚨 " : ""}${escapeHtml(t.title)}${t.context ? ` — ${escapeHtml(t.context)}` : ""}${dueLabel}`);
    }
  }

  return lines.join("\n");
}

async function buildNotesList(categoryQuery: string | null): Promise<string> {
  const notes = await prisma.note.findMany({
    where: {
      deletedAt: null,
      ...(categoryQuery ? { category: { equals: categoryQuery, mode: "insensitive" } } : {}),
    },
    orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
    take: 20,
  });

  const heading = categoryQuery ? `Notes — ${escapeHtml(categoryQuery)}` : "Recent notes";
  const lines: string[] = [`<b>${heading} (${notes.length})</b>`];
  if (notes.length === 0) {
    lines.push(categoryQuery ? `Nothing under "${escapeHtml(categoryQuery)}".` : "No notes yet.");
  } else {
    for (const n of notes) {
      const preview = n.content.length > 100 ? `${n.content.slice(0, 100)}…` : n.content;
      lines.push(`• ${n.pinned ? "📌 " : ""}[${escapeHtml(n.category)}] ${escapeHtml(preview)}`);
    }
  }
  return lines.join("\n");
}

const LAST_CAPTURE_SETTING_KEY = "lastQuickCapture";
const UNDO_WINDOW_MS = 30 * 60 * 1000;

async function recordLastCapture(kind: string, id: string): Promise<void> {
  const value = JSON.stringify({ kind, id, capturedAt: new Date().toISOString() });
  await prisma.setting.upsert({
    where: { key: LAST_CAPTURE_SETTING_KEY },
    create: { key: LAST_CAPTURE_SETTING_KEY, value },
    update: { value },
  });
}

async function undoLastCapture(): Promise<string> {
  const setting = await prisma.setting.findUnique({ where: { key: LAST_CAPTURE_SETTING_KEY } });
  if (!setting) return "Nothing to undo.";

  let parsed: { kind: string; id: string; capturedAt: string };
  try {
    parsed = JSON.parse(setting.value);
  } catch {
    return "Nothing to undo.";
  }

  if (Date.now() - new Date(parsed.capturedAt).getTime() > UNDO_WINDOW_MS) {
    return "That was more than 30 min ago — too old to undo. Delete it from the dashboard/Trash instead.";
  }

  try {
    if (parsed.kind === "task") {
      await prisma.task.update({ where: { id: parsed.id }, data: { deletedAt: new Date() } });
    } else if (parsed.kind === "deadline") {
      await prisma.deadline.update({ where: { id: parsed.id }, data: { deletedAt: new Date() } });
    } else if (parsed.kind === "note") {
      await prisma.note.update({ where: { id: parsed.id }, data: { deletedAt: new Date() } });
    } else {
      return "Nothing to undo.";
    }
  } catch {
    // Already deleted/purged, or the id no longer exists - not an error worth surfacing.
    return "Already gone.";
  }

  // One-shot: prevents "undo" typed twice in a row from deleting whatever
  // was created *between* those two messages instead of doing nothing.
  await prisma.setting.delete({ where: { key: LAST_CAPTURE_SETTING_KEY } }).catch(() => undefined);
  return `Undone — that ${parsed.kind} was moved to Trash.`;
}

// Fuzzy "done <text>" / "snooze <text>" commands, for when the original
// reminder message (with its buttons) has scrolled out of view. Requires an
// exact single match on a case-insensitive title substring - on 0 or 2+
// matches it asks rather than guessing, since silently acting on the wrong
// item is worse than making you be more specific.
function matchesFuzzyCommand(text: string, verb: string): string | null {
  const re = new RegExp(`^${verb}\\s+(.+)`, "i");
  const match = text.match(re);
  return match ? match[1].trim() : null;
}

async function fuzzyDone(query: string): Promise<string> {
  const tasks = await prisma.task.findMany({
    where: { deletedAt: null, status: { state: { not: "DONE" } }, title: { contains: query, mode: "insensitive" } },
  });
  if (tasks.length === 0) return `No open task matching "${escapeHtml(query)}".`;
  if (tasks.length > 1) {
    return `Multiple matches for "${escapeHtml(query)}" — be more specific:\n${tasks
      .map((t) => `• ${escapeHtml(t.title)}`)
      .join("\n")}`;
  }
  await completeTaskAndAdvance(tasks[0].id);
  return `✅ Marked done: "${escapeHtml(tasks[0].title)}"`;
}

async function fuzzySnooze(query: string): Promise<string> {
  const [tasks, deadlines] = await Promise.all([
    prisma.task.findMany({
      where: { deletedAt: null, dueAt: { not: null }, title: { contains: query, mode: "insensitive" } },
    }),
    prisma.deadline.findMany({
      where: { deletedAt: null, title: { contains: query, mode: "insensitive" } },
    }),
  ]);
  const total = tasks.length + deadlines.length;
  if (total === 0) return `No task or deadline matching "${escapeHtml(query)}".`;
  if (total > 1) {
    const names = [...tasks.map((t) => t.title), ...deadlines.map((d) => d.title)];
    return `Multiple matches for "${escapeHtml(query)}" — be more specific:\n${names
      .map((n) => `• ${escapeHtml(n)}`)
      .join("\n")}`;
  }
  if (tasks.length === 1) {
    const toast = await snoozeTask(tasks[0].id, 24);
    return `⏳ ${escapeHtml(tasks[0].title)} — ${toast}`;
  }
  const toast = await snoozeDeadline(deadlines[0].id, 24);
  return `⏳ ${escapeHtml(deadlines[0].title)} — ${toast}`;
}

// A failure to send the *confirmation* reply must never turn into a 500 -
// Telegram would then retry the whole update, and Note has no idempotency
// key (unlike Task/Deadline, which dedupe on the Telegram message_id), so a
// retried "successful creation, failed reply" would create a duplicate note.
async function safeSend(text: string): Promise<void> {
  try {
    await sendTelegramMessage(text);
  } catch (err) {
    console.error("[telegram webhook] failed to send reply:", err);
  }
}

async function handleMessage(message: TelegramMessage): Promise<void> {
  const text = (message.text ?? message.caption ?? "").trim();
  if (!text) {
    await safeSend("I can only read text right now — try typing, or forward a text message.");
    return;
  }

  // On-demand agenda commands, checked before quick-capture so these exact
  // words never get saved as a task instead of answered.
  if (matchesCommand(text, "today")) {
    await safeSend(await buildTodayAgenda());
    return;
  }
  if (matchesCommand(text, "week")) {
    await safeSend(await buildWeekAgenda());
    return;
  }
  if (matchesCommand(text, "list", "tasks")) {
    await safeSend(await buildTaskList());
    return;
  }
  if (matchesCommand(text, "undo")) {
    await safeSend(await undoLastCapture());
    return;
  }
  if (matchesCommand(text, "notes")) {
    await safeSend(await buildNotesList(null));
    return;
  }
  const notesQuery = text.match(/^\/?notes\s+(.+)/i);
  if (notesQuery) {
    await safeSend(await buildNotesList(notesQuery[1].trim()));
    return;
  }
  const doneQuery = matchesFuzzyCommand(text, "done");
  if (doneQuery) {
    await safeSend(await fuzzyDone(doneQuery));
    return;
  }
  const snoozeQuery = matchesFuzzyCommand(text, "snooze");
  if (snoozeQuery) {
    await safeSend(await fuzzySnooze(snoozeQuery));
    return;
  }

  let replyText: string;
  try {
    const result = await processQuickCapture(text, {
      sourceType: "TELEGRAM",
      sourceRef: String(message.message_id),
    });
    await recordLastCapture(result.kind, result.id);
    const icon = result.kind === "note" ? "📝" : result.kind === "deadline" ? "⏰" : "✅";
    replyText = `${icon} ${result.summary}`;
  } catch (err) {
    // A duplicate message_id (Telegram retried an update it thinks failed)
    // hits the Deadline/Task unique constraint - that's a harmless replay,
    // not a real error, so it gets a quieter reply instead of Telegram
    // seeing this endpoint "fail" and retrying again.
    if (err instanceof Error && err.message.includes("Unique constraint")) {
      replyText = "Already saved that one.";
    } else {
      console.error("[telegram webhook] processQuickCapture failed:", err);
      replyText = "Something went wrong saving that — sorry.";
    }
  }

  await safeSend(replyText);
}

async function snoozeDeadline(id: string, hours: number): Promise<string> {
  const deadline = await prisma.deadline.findUnique({ where: { id } });
  if (!deadline) return "Deadline not found.";
  const newDueAt = new Date(deadline.dueAt.getTime() + hours * 60 * 60 * 1000);
  await prisma.$transaction([
    prisma.notificationLog.deleteMany({
      where: { dedupKey: { in: [`${id}:T24H`, `${id}:T2H`, `${id}:T10M`, `${id}:T0`] } },
    }),
    // nagAcknowledgedAt resets to null so, if this is an "urgent" deadline,
    // nagging can resume once the new due time arrives and passes.
    prisma.deadline.update({ where: { id }, data: { dueAt: newDueAt, nagAcknowledgedAt: null } }),
  ]);
  return `Snoozed ${hours}h.`;
}

async function snoozeTask(id: string, hours: number): Promise<string> {
  const task = await prisma.task.findUnique({ where: { id } });
  if (!task?.dueAt) return "Task not found or has no due date.";
  const newDueAt = new Date(task.dueAt.getTime() + hours * 60 * 60 * 1000);
  await prisma.$transaction([
    prisma.notificationLog.deleteMany({
      where: { dedupKey: { in: [`task:${id}:T24H`, `task:${id}:T2H`, `task:${id}:T10M`, `task:${id}:T0`] } },
    }),
    prisma.task.update({ where: { id }, data: { dueAt: newDueAt, nagAcknowledgedAt: null } }),
  ]);
  return `Snoozed ${hours}h.`;
}

async function handleCallbackQuery(cq: TelegramCallbackQuery): Promise<void> {
  const data = cq.data ?? "";
  const [action, type, id] = data.split(":");
  let toast = "Done.";

  try {
    if (action === "done" && type === "task") {
      await completeTaskAndAdvance(id);
      toast = "Marked done ✅";
    } else if (action === "mute" && type === "deadline") {
      await prisma.deadline.update({ where: { id }, data: { notifyEnabled: false } });
      toast = "Muted 🔕";
    } else if (action === "snooze1h" && type === "deadline") {
      toast = await snoozeDeadline(id, 1);
    } else if (action === "snoozeday" && type === "deadline") {
      toast = await snoozeDeadline(id, 24);
    } else if (action === "snooze1h" && type === "task") {
      toast = await snoozeTask(id, 1);
    } else if (action === "snoozeday" && type === "task") {
      toast = await snoozeTask(id, 24);
    } else if (action === "accept" && type === "deadline") {
      await prisma.deadline.update({ where: { id }, data: { nagAcknowledgedAt: new Date() } });
      toast = "OK, I'll stop pinging about this one.";
    } else if (action === "accept" && type === "task") {
      await prisma.task.update({ where: { id }, data: { nagAcknowledgedAt: new Date() } });
      toast = "OK, I'll stop pinging about this one.";
    } else {
      toast = "Unknown action.";
    }
  } catch (err) {
    console.error("[telegram webhook] callback action failed:", err);
    toast = "That failed — sorry.";
  }

  // The action above (mark done, snooze, mute) already succeeded or failed
  // and logged its own outcome - a failure acknowledging the button press
  // back to Telegram shouldn't 500 this request and trigger a retry that
  // re-runs an action that may not be idempotent from the user's view
  // (e.g. re-snoozing would push the due time out twice).
  await answerCallbackQuery(cq.id, toast).catch((err) => {
    console.error("[telegram webhook] answerCallbackQuery failed:", err);
  });
  if (cq.message) {
    await removeInlineKeyboard(cq.message.chat.id, cq.message.message_id).catch(() => undefined);
  }
}

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-telegram-bot-api-secret-token");
  if (!process.env.TELEGRAM_WEBHOOK_SECRET || secret !== process.env.TELEGRAM_WEBHOOK_SECRET) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const update = (await req.json()) as TelegramUpdate;

  if (update.callback_query) {
    await handleCallbackQuery(update.callback_query);
  } else if (update.message) {
    await handleMessage(update.message);
  }

  // Telegram just needs a 200 - it doesn't care about the response body,
  // and always replying OK (even after an internal error we've already
  // logged/handled above) avoids Telegram interpreting failure and
  // retrying the same update repeatedly.
  return new NextResponse("OK");
}
