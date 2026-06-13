import { NextResponse } from "next/server";

import { checkCronAuth } from "@/lib/cron";
import { syncTrades } from "@/jobs/sync-trades";

// Cron: ingest recent whale trades for the top markets into `trades` (spec §7.3).
// Protected by CRON_SECRET; scheduled in vercel.json.
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  if (!checkCronAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await syncTrades();
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "sync-trades failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
