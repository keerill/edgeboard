// Channel dispatch for alert notifications (Phase 7). Routes a built message to
// email (Resend) or Telegram. Returns a skip result (never throws) when the
// channel is unconfigured or the recipient is missing, so the cron stays green
// and just records the skip; genuine send errors propagate for the job to count.

import { isEmailConfigured, sendAlertEmail } from "./email";
import { isTelegramConfigured, sendTelegramMessage } from "./telegram";

export type NotifyChannel = "email" | "telegram";

export interface DeliverParams {
  channel: NotifyChannel;
  /** Account email (email channel recipient). */
  email: string | null;
  /** Saved Telegram chat id (telegram channel recipient). */
  telegramChatId: string | null;
  subject: string;
  text: string;
}

export interface DeliverResult {
  sent: boolean;
  /** Set when delivery was skipped (not attempted) rather than sent. */
  skipReason?: string;
}

/** Deliver a message over the given channel, or skip with a reason. */
export async function deliver(p: DeliverParams): Promise<DeliverResult> {
  if (p.channel === "email") {
    if (!isEmailConfigured()) {
      return { sent: false, skipReason: "email-not-configured" };
    }
    if (!p.email) return { sent: false, skipReason: "no-email-recipient" };
    await sendAlertEmail(p.email, p.subject, p.text);
    return { sent: true };
  }

  // telegram
  if (!isTelegramConfigured()) {
    return { sent: false, skipReason: "telegram-not-configured" };
  }
  if (!p.telegramChatId) {
    return { sent: false, skipReason: "no-telegram-chat-id" };
  }
  // Telegram has no subject line — fold it into the body.
  await sendTelegramMessage(p.telegramChatId, `${p.subject}\n\n${p.text}`);
  return { sent: true };
}
