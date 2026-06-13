// Telegram delivery for alerts (Phase 7), via the Bot API sendMessage method.
// No SDK — a single POST with the bot token from TELEGRAM_BOT_TOKEN (spec §3/§11).
// The recipient `chatId` is the per-user value saved in /settings. Soft-degrades:
// callers gate on isTelegramConfigured() and skip the channel when it's unset.

const API_BASE = "https://api.telegram.org";
const TIMEOUT_MS = 10_000;

/** Whether the Telegram bot token is configured. */
export function isTelegramConfigured(): boolean {
  return Boolean(process.env.TELEGRAM_BOT_TOKEN);
}

/** Send a plain-text Telegram message. Throws if unconfigured or the API errors. */
export async function sendTelegramMessage(
  chatId: string,
  text: string,
): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    throw new Error("TELEGRAM_BOT_TOKEN is not set — cannot send Telegram.");
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${API_BASE}/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        disable_web_page_preview: true,
      }),
      signal: controller.signal,
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Telegram sendMessage ${res.status}: ${body.slice(0, 200)}`);
    }
  } finally {
    clearTimeout(timer);
  }
}
