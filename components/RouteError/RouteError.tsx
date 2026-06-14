"use client";

import * as Sentry from "@sentry/nextjs";
import { AlertTriangle, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";

import { EmptyState } from "@/components/EmptyState/EmptyState";
import styles from "./routeError.module.scss";

// Shared body for the per-route error.tsx boundaries. Built on EmptyState so it
// matches the app's empty/upsell states, reports to Sentry (no-op without a
// DSN), and offers a retry (reset()) plus an escape hatch to the dashboard.
export function RouteError({
  error,
  reset,
  title = "Something went wrong",
  description = "An unexpected error occurred while loading this page. You can try again.",
  icon = AlertTriangle,
}: {
  error: Error & { digest?: string };
  reset: () => void;
  title?: string;
  description?: string;
  icon?: LucideIcon;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <EmptyState
      icon={icon}
      title={title}
      description={description}
      action={
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.retry}
            onClick={() => reset()}
          >
            Try again
          </button>
          <Link href="/dashboard" className={styles.secondary}>
            Go to dashboard
          </Link>
        </div>
      }
    />
  );
}
