import { NextResponse } from "next/server";

import { checkCronAuth } from "@/lib/cron";
import { aggregateWhales } from "@/jobs/aggregate-whales";

// Cron: recompute per-wallet aggregates in `whale_wallets` (spec §7.4).
// Protected by CRON_SECRET; scheduled in vercel.json.
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  if (!checkCronAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await aggregateWhales();
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "aggregate-whales failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
