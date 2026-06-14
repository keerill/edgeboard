"use client";

import type { ReactNode } from "react";

import { Spinner } from "@/components/Spinner/Spinner";
import { useFilterContext } from "./FilterProvider";
import styles from "./filters.module.scss";

// Wraps a data region (table / grid / panel) that re-renders on filter change.
// While the shared filter transition is pending it dims the content and floats
// a centered overlay spinner, so the user sees the region reloading instead of
// a frozen page. Server children pass straight through this client boundary.
export function PendingRegion({
  children,
  label = "Updating…",
  className,
}: {
  children: ReactNode;
  label?: string;
  className?: string;
}) {
  const { isPending } = useFilterContext();
  return (
    <div
      className={`${styles.region} ${className ?? ""}`}
      data-pending={isPending ? "true" : undefined}
      aria-busy={isPending}
    >
      {children}
      {isPending ? <Spinner variant="overlay" label={label} /> : null}
    </div>
  );
}
