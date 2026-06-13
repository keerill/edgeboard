import { NextResponse } from "next/server";

// Placeholder Stripe webhook so the route exists (spec §4).
// Signature verification and subscription updates are implemented in Phase 5.
export function POST() {
  return NextResponse.json({ received: true });
}
