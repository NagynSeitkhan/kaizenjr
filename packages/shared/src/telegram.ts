export interface InlineButton {
  text: string;
  callback_data: string;
}

function telegramCredentials(): { token: string; chatId: string } {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) {
    throw new Error("TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID is not set");
  }
  return { token, chatId };
}

export async function callTelegram(
  method: string,
  body: Record<string, unknown>
): Promise<{ message_id: number } | null> {
  const { token } = telegramCredentials();
  const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = (await res.json()) as {
    ok: boolean;
    description?: string;
    result?: { message_id: number };
  };

  if (!data.ok) {
    throw new Error(`Telegram ${method} failed: ${data.description ?? "unknown error"}`);
  }

  return data.result ?? null;
}

function replyMarkup(buttons?: InlineButton[]) {
  return buttons && buttons.length > 0 ? { inline_keyboard: [buttons] } : undefined;
}

export async function sendTelegramMessage(text: string, buttons?: InlineButton[]): Promise<string | null> {
  const { chatId } = telegramCredentials();
  const result = await callTelegram("sendMessage", {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
    disable_web_page_preview: true,
    reply_markup: replyMarkup(buttons),
  });
  return result?.message_id ? String(result.message_id) : null;
}

// `photoUrl` is passed straight to Telegram, which fetches it itself - no
// need to upload the file bytes ourselves since it already has a public URL
// (from Vercel Blob). Caption has a lower length limit than a text message
// (1024 chars vs 4096), which is plenty for a reminder line.
export async function sendTelegramPhoto(
  photoUrl: string,
  caption: string,
  buttons?: InlineButton[]
): Promise<string | null> {
  const { chatId } = telegramCredentials();
  const result = await callTelegram("sendPhoto", {
    chat_id: chatId,
    photo: photoUrl,
    caption,
    parse_mode: "HTML",
    reply_markup: replyMarkup(buttons),
  });
  return result?.message_id ? String(result.message_id) : null;
}

export async function answerCallbackQuery(callbackQueryId: string, text?: string): Promise<void> {
  await callTelegram("answerCallbackQuery", { callback_query_id: callbackQueryId, text });
}

export async function removeInlineKeyboard(chatId: number | string, messageId: number): Promise<void> {
  const { token } = telegramCredentials();
  await fetch(`https://api.telegram.org/bot${token}/editMessageReplyMarkup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, message_id: messageId, reply_markup: { inline_keyboard: [] } }),
  });
}
