import { NextResponse } from "next/server";
import type Stripe from "stripe";

import { prisma } from "@/lib/db/prisma";
import { getStripe } from "@/lib/stripe/client";

// Stripe SDK + raw-body signature check need the Node runtime, and the webhook
// must never be cached/prerendered. Spec §10.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Subscription statuses that should keep the user on Pro. Anything else
// (canceled, unpaid, incomplete_expired, paused, …) drops them to Free.
const PRO_STATUSES = new Set<Stripe.Subscription.Status>([
  "active",
  "trialing",
  "past_due",
]);

/** Billing-period end now lives on the subscription item, not the top level. */
function periodEnd(sub: Stripe.Subscription): Date | null {
  const ts = sub.items.data[0]?.current_period_end;
  return typeof ts === "number" ? new Date(ts * 1000) : null;
}

/**
 * Mirror a Stripe subscription into our `subscriptions` row. Idempotent: keyed
 * by the userId carried in subscription metadata (set at checkout), falling
 * back to the Stripe customer id. Re-delivered events converge to the same row.
 */
async function syncSubscription(
  sub: Stripe.Subscription,
  explicitUserId?: string,
): Promise<void> {
  const metaUserId =
    typeof sub.metadata?.userId === "string" ? sub.metadata.userId : undefined;
  const userId = explicitUserId ?? metaUserId;
  const customerId =
    typeof sub.customer === "string" ? sub.customer : sub.customer.id;

  const data = {
    plan: PRO_STATUSES.has(sub.status) ? ("pro" as const) : ("free" as const),
    status: sub.status,
    stripeCustomerId: customerId,
    stripeSubscriptionId: sub.id,
    currentPeriodEnd: periodEnd(sub),
  };

  // updateMany (not update) so a missing/duplicate row never throws — webhooks
  // must always return 2xx or Stripe keeps retrying.
  if (userId) {
    await prisma.subscription.updateMany({ where: { userId }, data });
    return;
  }
  await prisma.subscription.updateMany({
    where: { stripeCustomerId: customerId },
    data,
  });
}

export async function POST(req: Request): Promise<NextResponse> {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = req.headers.get("stripe-signature");
  if (!secret || !signature) {
    return NextResponse.json(
      { error: "Missing webhook secret or signature." },
      { status: 400 },
    );
  }

  const stripe = getStripe();
  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, secret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid signature";
    return NextResponse.json(
      { error: `Webhook signature verification failed: ${message}` },
      { status: 400 },
    );
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const subId =
          typeof session.subscription === "string"
            ? session.subscription
            : session.subscription?.id;
        if (subId) {
          const sub = await stripe.subscriptions.retrieve(subId);
          await syncSubscription(sub, session.client_reference_id ?? undefined);
        }
        break;
      }
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        await syncSubscription(event.data.object);
        break;
      }
      default:
        // Unhandled event types are acknowledged so Stripe stops retrying.
        break;
    }
  } catch (err) {
    // Log and 500 so Stripe retries — the DB write is the only thing that can
    // fail here, and we'd rather replay than silently drop a plan change.
    console.error("Stripe webhook handler error:", err);
    return NextResponse.json({ error: "Handler error" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
