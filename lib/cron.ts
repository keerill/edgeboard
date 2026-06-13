// Auth guard for /api/cron/* endpoints (spec §7). Vercel Cron sends
// `Authorization: Bearer <CRON_SECRET>`; we also accept an `x-cron-secret`
// header and a `?secret=` query param for manual/local testing.
//
// Fails closed: if CRON_SECRET is unset, no request is ever authorized.

export function checkCronAuth(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  const auth = request.headers.get("authorization");
  if (auth === `Bearer ${secret}`) return true;

  if (request.headers.get("x-cron-secret") === secret) return true;

  const query = new URL(request.url).searchParams.get("secret");
  if (query === secret) return true;

  return false;
}
