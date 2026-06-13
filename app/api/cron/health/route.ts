import { NextResponse } from "next/server";

// Placeholder cron endpoint so the /api/cron/* structure exists (spec §4, §7).
// Real ingestion jobs (sync-markets, snapshot-prices, ...) are added in Phase 2+
// and protected by CRON_SECRET.
export function GET() {
  return NextResponse.json({ ok: true });
}
