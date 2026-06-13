"use client";

import { usePathname, useSearchParams } from "next/navigation";
import posthog from "posthog-js";
import { PostHogProvider as PHProvider, usePostHog } from "posthog-js/react";
import { Suspense, useEffect } from "react";

// Analytics is opt-in via env: no key => render children untouched, so the app
// builds and runs with zero analytics code (mirrors the fail-closed convention
// in lib/cron.ts / lib/stripe/client.ts).
const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const POSTHOG_HOST =
  process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com";

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  if (!POSTHOG_KEY) {
    return <>{children}</>;
  }
  return <Initialized posthogKey={POSTHOG_KEY}>{children}</Initialized>;
}

function Initialized({
  posthogKey,
  children,
}: {
  posthogKey: string;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (posthog.__loaded) return; // guard React StrictMode double-mount
    posthog.init(posthogKey, {
      api_host: POSTHOG_HOST,
      // We send $pageview manually on App Router navigations (below); the
      // built-in capture only fires on hard loads.
      capture_pageview: false,
      capture_pageleave: true,
    });
  }, [posthogKey]);

  return (
    <PHProvider client={posthog}>
      <Suspense fallback={null}>
        <PageviewTracker />
      </Suspense>
      {children}
    </PHProvider>
  );
}

// Isolated in its own Suspense boundary: useSearchParams() opts a subtree out of
// static rendering and Next 15 fails the build if it isn't wrapped.
function PageviewTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const ph = usePostHog();

  useEffect(() => {
    if (!pathname) return;
    let url = window.origin + pathname;
    const qs = searchParams.toString();
    if (qs) url += `?${qs}`;
    ph?.capture("$pageview", { $current_url: url });
  }, [pathname, searchParams, ph]);

  return null;
}
