import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@course-dashboard/db";
import {
  processQuickCapture,
  sendTelegramMessage,
  answerCallbackQuery,
  removeInlineKeyboard,
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

  let replyText: string;
  try {
    const result = await processQuickCapture(text, {
      sourceType: "TELEGRAM",
      sourceRef: String(message.message_id),
    });
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
      where: { dedupKey: { in: [`${id}:T24H`, `${id}:T2H`] } },
    }),
    prisma.deadline.update({ where: { id }, data: { dueAt: newDueAt } }),
  ]);
  return `Snoozed ${hours}h.`;
}

async function snoozeTask(id: string, hours: number): Promise<string> {
  const task = await prisma.task.findUnique({ where: { id } });
  if (!task?.dueAt) return "Task not found or has no due date.";
  const newDueAt = new Date(task.dueAt.getTime() + hours * 60 * 60 * 1000);
  await prisma.$transaction([
    prisma.notificationLog.deleteMany({
      where: { dedupKey: { in: [`task:${id}:T24H`, `task:${id}:T2H`] } },
    }),
    prisma.task.update({ where: { id }, data: { dueAt: newDueAt } }),
  ]);
  return `Snoozed ${hours}h.`;
}

async function handleCallbackQuery(cq: TelegramCallbackQuery): Promise<void> {
  const data = cq.data ?? "";
  const [action, type, id] = data.split(":");
  let toast = "Done.";

  try {
    if (action === "done" && type === "task") {
      await prisma.taskStatus.update({ where: { taskId: id }, data: { state: "DONE" } });
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
