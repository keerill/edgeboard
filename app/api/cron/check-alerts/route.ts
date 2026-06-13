import { NextResponse } from "next/server";

import { checkCronAuth } from "@/lib/cron";
import { checkAlerts } from "@/jobs/check-alerts";

// Cron: evaluate active Pro-owned alerts and deliver notifications (Phase 7).
// Protected by CRON_SECRET; scheduled in vercel.json (runs after ingestion).
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  if (!checkCronAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await checkAlerts();
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "check-alerts failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
