export async function sendTelegramMessage(text: string): Promise<string | null> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) {
    throw new Error("TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID is not set");
  }

  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "HTML",
      disable_web_page_preview: true,
    }),
  });

  const data = (await res.json()) as {
    ok: boolean;
    description?: string;
    result?: { message_id: number };
  };

  if (!data.ok) {
    throw new Error(`Telegram sendMessage failed: ${data.description ?? "unknown error"}`);
  }

  return data.result?.message_id ? String(data.result.message_id) : null;
}
