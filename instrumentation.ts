import * as Sentry from "@sentry/nextjs";

// Server/edge instrumentation entrypoint (Next.js App Router). `register` runs
// once per runtime at boot; each imported config calls Sentry.init, which is a
// clean no-op when SENTRY_DSN is unset (see sentry.*.config.ts).
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

// Forwards nested React Server Component / route-handler errors to Sentry.
export const onRequestError = Sentry.captureRequestError;
