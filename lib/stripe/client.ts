// Stripe SDK singleton (server-only, Node runtime). Phase 5 §10.
// Reads STRIPE_SECRET_KEY lazily so the app still boots in environments where
// Stripe isn't configured (Phases 1–4); any billing call throws a clear error.
//
// We pin no explicit apiVersion — the installed SDK already targets a fixed
// version, and passing a literal would only risk a strict-TS mismatch on bump.

import Stripe from "stripe";

let cached: Stripe | undefined;

/** Lazily construct the shared Stripe client. Throws if the secret is unset. */
export function getStripe(): Stripe {
  if (cached) return cached;

  const apiKey = process.env.STRIPE_SECRET_KEY;
  if (!apiKey) {
    throw new Error("STRIPE_SECRET_KEY is not set — cannot use Stripe.");
  }

  cached = new Stripe(apiKey, { typescript: true });
  return cached;
}
