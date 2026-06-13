import { NextResponse } from "next/server";

import { checkCronAuth } from "@/lib/cron";
import { snapshotPrices } from "@/jobs/snapshot-prices";

// Cron: snapshot current YES prices (CLOB midpoint) into `price_snapshots`
// (spec §7.2). Protected by CRON_SECRET; scheduled in vercel.json.
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  if (!checkCronAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await snapshotPrices();
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "snapshot-prices failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
