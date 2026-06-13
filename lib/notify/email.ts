// Email delivery for alerts (Phase 7), via Resend. Resend is already a project
// dependency (Phase 1 magic-link), but only wired through Auth.js — this is the
// first direct client. Lazy singleton (mirrors lib/stripe/client.ts) so the app
// boots without RESEND_API_KEY; callers gate on isEmailConfigured() and the cron
// skips the channel rather than throwing when it's unset.

import { Resend } from "resend";

let cached: Resend | undefined;

/** Whether email delivery is configured (both the API key and a sender). */
export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

function getResend(): Resend {
  if (cached) return cached;
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not set — cannot send email.");
  }
  cached = new Resend(apiKey);
  return cached;
}

/** Send a plain-text alert email. Throws if Resend is unconfigured or errors. */
export async function sendAlertEmail(
  to: string,
  subject: string,
  text: string,
): Promise<void> {
  const from = process.env.EMAIL_FROM;
  if (!from) throw new Error("EMAIL_FROM is not set — cannot send email.");

  const { error } = await getResend().emails.send({ from, to, subject, text });
  if (error) {
    throw new Error(`Resend send failed: ${error.message}`);
  }
}
