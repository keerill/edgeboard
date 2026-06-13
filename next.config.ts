import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  // Phase 1 skeleton — no special config yet.
  // Later phases add image domains, redirects, etc.
};

// Wrap with Sentry. When SENTRY_ORG/PROJECT/AUTH_TOKEN are unset, source-map
// upload is skipped and the build stays clean (`silent` suppresses the notice).
// The runtime SDK is separately gated by SENTRY_DSN (see sentry.*.config.ts).
export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: true,
  widenClientFileUpload: true,
});
