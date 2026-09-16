function telegramCredentials(): { token: string; chatId: string } {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) {
    throw new Error("TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID is not set");
  }
  return { token, chatId };
}

async function callTelegram(
  method: string,
  body: Record<string, unknown>
): Promise<string | null> {
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

  return data.result?.message_id ? String(data.result.message_id) : null;
}

export async function sendTelegramMessage(text: string): Promise<string | null> {
  const { chatId } = telegramCredentials();
  return callTelegram("sendMessage", {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
    disable_web_page_preview: true,
  });
}

// `photoUrl` is passed straight to Telegram, which fetches it itself - no
// need to upload the file bytes ourselves since it already has a public URL
// (from Vercel Blob). Caption has a lower length limit than a text message
// (1024 chars vs 4096), which is plenty for a reminder line.
export async function sendTelegramPhoto(photoUrl: string, caption: string): Promise<string | null> {
  const { chatId } = telegramCredentials();
  return callTelegram("sendPhoto", {
    chat_id: chatId,
    photo: photoUrl,
    caption,
    parse_mode: "HTML",
  });
}
