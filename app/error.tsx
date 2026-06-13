"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

import styles from "./error.module.scss";

// Route-subtree error boundary (everything under the root layout). Reports to
// Sentry (no-op without a DSN) and offers a retry.
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className={styles.wrap}>
      <h1 className={styles.title}>Something went wrong</h1>
      <p className={styles.body}>
        An unexpected error occurred. You can try again.
      </p>
      <button type="button" className={styles.button} onClick={() => reset()}>
        Try again
      </button>
    </div>
  );
}
