import * as Sentry from "@sentry/nextjs";

// Server runtime. With no DSN the SDK disables itself (no events, no throw), so
// the app builds and runs cleanly until the user fills SENTRY_DSN.
const dsn = process.env.SENTRY_DSN;

Sentry.init({
  dsn,
  enabled: Boolean(dsn),
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
});
