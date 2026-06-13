"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { isValidWalletAddress } from "@/lib/analytics/portfolio";
import { prisma } from "@/lib/db/prisma";
import { canAddAlert } from "@/lib/plan";
import { getUserSubscription } from "@/lib/subscription";
import { getStripe } from "@/lib/stripe/client";

/**
 * Absolute base URL for Stripe success/return URLs. Prefers the request host
 * (works across preview deployments) and falls back to NEXTAUTH_URL — no new
 * env var. localhost stays http; everything else assumes https.
 */
async function getBaseUrl(): Promise<string> {
  const h = await headers();
  const host = h.get("host");
  if (host) {
    const proto =
      h.get("x-forwarded-proto") ??
      (host.startsWith("localhost") ? "http" : "https");
    return `${proto}://${host}`;
  }
  return (process.env.NEXTAUTH_URL ?? "http://localhost:3000").replace(
    /\/$/,
    "",
  );
}

/**
 * Start Stripe Checkout for the Pro plan (§10). Reuses the user's Stripe
 * customer if present, else creates one tied to their userId, then redirects
 * to the hosted Checkout page. The webhook flips the plan to Pro on completion.
 */
export async function createCheckoutSession(): Promise<void> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) redirect("/signin");

  const priceId = process.env.STRIPE_PRICE_ID_PRO;
  if (!priceId) throw new Error("STRIPE_PRICE_ID_PRO is not set.");

  const stripe = getStripe();
  const sub = await getUserSubscription(userId);

  let customerId = sub?.stripeCustomerId ?? undefined;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: session.user?.email ?? undefined,
      metadata: { userId },
    });
    customerId = customer.id;
    await prisma.subscription.updateMany({
      where: { userId },
      data: { stripeCustomerId: customerId },
    });
  }

  const baseUrl = await getBaseUrl();
  const checkout = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    client_reference_id: userId,
    line_items: [{ price: priceId, quantity: 1 }],
    subscription_data: { metadata: { userId } },
    allow_promotion_codes: true,
    success_url: `${baseUrl}/settings?status=success`,
    cancel_url: `${baseUrl}/settings?status=cancel`,
  });

  if (!checkout.url) throw new Error("Stripe did not return a checkout URL.");
  redirect(checkout.url);
}

/**
 * Open the Stripe Billing Portal so the user can cancel or update their card
 * (§10). Requires an existing Stripe customer (created during checkout).
 */
export async function createBillingPortalSession(): Promise<void> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) redirect("/signin");

  const sub = await getUserSubscription(userId);
  if (!sub?.stripeCustomerId) {
    redirect("/settings?status=no-customer");
  }

  const stripe = getStripe();
  const baseUrl = await getBaseUrl();
  const portal = await stripe.billingPortal.sessions.create({
    customer: sub.stripeCustomerId,
    return_url: `${baseUrl}/settings`,
  });

  redirect(portal.url);
}

// ---------- Alerts (Phase 7 / v1.1) ----------

const ALERT_TYPES = ["whale_move", "price_swing", "market"] as const;
const ALERT_CHANNELS = ["email", "telegram"] as const;
type AlertType = (typeof ALERT_TYPES)[number];
type AlertChannel = (typeof ALERT_CHANNELS)[number];

const CHAT_ID_RE = /^-?\d{1,20}$/;

/**
 * Create an alert for the signed-in user (§8). Pro-only (§10). Validates per
 * type: price_swing/market need a market; price_swing needs a positive swing
 * size; whale_move's threshold/wallet/market are optional. The telegram channel
 * requires a saved chat ID. Errors redirect with a ?error= code (page banner).
 */
export async function addAlert(formData: FormData): Promise<void> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) redirect("/signin");

  const type = String(formData.get("type") ?? "") as AlertType;
  const channel = String(formData.get("channel") ?? "") as AlertChannel;
  const marketId = String(formData.get("marketId") ?? "").trim() || null;
  const wallet = String(formData.get("wallet") ?? "").trim().toLowerCase() || null;
  const rawThreshold = String(formData.get("threshold") ?? "").trim();

  if (!ALERT_TYPES.includes(type) || !ALERT_CHANNELS.includes(channel)) {
    redirect("/settings?error=alert-invalid");
  }

  // Pro gating + per-plan count limit (§10).
  const sub = await getUserSubscription(userId);
  const plan = sub?.plan === "pro" ? "pro" : "free";
  const count = await prisma.alert.count({ where: { userId } });
  if (!canAddAlert(plan, count)) {
    redirect("/settings?error=alerts-pro");
  }

  // Parse the optional numeric threshold (min USDC for whale, pp for swing).
  let threshold: number | null = null;
  if (rawThreshold) {
    const n = Number(rawThreshold);
    if (!Number.isFinite(n) || n <= 0) {
      redirect("/settings?error=alert-invalid");
    }
    threshold = n;
  }

  // Per-type requirements.
  if ((type === "price_swing" || type === "market") && !marketId) {
    redirect("/settings?error=alert-needs-market");
  }
  if (type === "price_swing" && threshold === null) {
    redirect("/settings?error=alert-needs-threshold");
  }
  if (type === "whale_move" && wallet && !isValidWalletAddress(wallet)) {
    redirect("/settings?error=invalid-wallet");
  }

  // If scoped to a market, make sure it's one we actually cache (FK + UX).
  if (marketId) {
    const market = await prisma.market.findUnique({
      where: { id: marketId },
      select: { id: true },
    });
    if (!market) redirect("/settings?error=alert-needs-market");
  }

  // Telegram delivery needs a saved chat ID on the account.
  if (channel === "telegram") {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { telegramChatId: true },
    });
    if (!user?.telegramChatId) redirect("/settings?error=no-telegram");
  }

  await prisma.alert.create({
    data: {
      userId,
      type,
      channel,
      marketId,
      // wallet only scopes whale_move; ignore it for other types.
      wallet: type === "whale_move" ? wallet : null,
      threshold,
    },
  });

  revalidatePath("/settings");
  redirect("/settings?status=alert-created");
}

/** Delete an alert, scoped to the signed-in user (ownership check). */
export async function removeAlert(formData: FormData): Promise<void> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) redirect("/signin");

  const id = String(formData.get("id") ?? "");
  if (id) {
    await prisma.alert.deleteMany({ where: { id, userId } });
  }

  revalidatePath("/settings");
  redirect("/settings");
}

/** Pause/resume an alert (the form posts the desired next state). */
export async function toggleAlert(formData: FormData): Promise<void> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) redirect("/signin");

  const id = String(formData.get("id") ?? "");
  const active = String(formData.get("active") ?? "") === "true";
  if (id) {
    await prisma.alert.updateMany({ where: { id, userId }, data: { active } });
  }

  revalidatePath("/settings");
  redirect("/settings");
}

/** Save (or clear) the user's Telegram chat ID for the telegram channel. */
export async function saveTelegramChatId(formData: FormData): Promise<void> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) redirect("/signin");

  const raw = String(formData.get("chatId") ?? "").trim();
  if (raw && !CHAT_ID_RE.test(raw)) {
    redirect("/settings?error=invalid-chat-id");
  }

  await prisma.user.update({
    where: { id: userId },
    data: { telegramChatId: raw || null },
  });

  revalidatePath("/settings");
  redirect("/settings?status=telegram-saved");
}
