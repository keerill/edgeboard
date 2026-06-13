import { NextResponse } from "next/server";

import { checkCronAuth } from "@/lib/cron";
import { syncMarkets } from "@/jobs/sync-markets";

// Cron: upsert active markets from Gamma into `markets` (spec §7.1).
// Protected by CRON_SECRET; scheduled in vercel.json.
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  if (!checkCronAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await syncMarkets();
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "sync-markets failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
