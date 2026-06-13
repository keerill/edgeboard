"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import { getStripe } from "@/lib/stripe/client";
import { getUserSubscription } from "@/lib/subscription";

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
