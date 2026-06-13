import * as Sentry from "@sentry/nextjs";

// Edge runtime (middleware, edge route handlers). Same env-guarded no-op as the
// server config — kept separate because the edge runtime imports it on its own.
const dsn = process.env.SENTRY_DSN;

Sentry.init({
  dsn,
  enabled: Boolean(dsn),
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
});
