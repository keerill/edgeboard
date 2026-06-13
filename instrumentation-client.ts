import * as Sentry from "@sentry/nextjs";

// Client runtime. The DSN must be a NEXT_PUBLIC_* var to reach the browser
// bundle (a Sentry DSN is public by design). Unset => the SDK is a no-op.
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

Sentry.init({
  dsn,
  enabled: Boolean(dsn),
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
});

// Instruments App Router client-side navigations. Must stay a top-level named
// export so the Sentry build transform can find it.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
