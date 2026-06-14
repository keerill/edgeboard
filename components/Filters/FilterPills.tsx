"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useOptimistic } from "react";

import { useFilterContext } from "./FilterProvider";
import styles from "./filters.module.scss";

export type FilterOption = { value: string; label: string };

// URL-driven segmented control. Replaces the `<Link>` pill rows: clicking a
// pill (a) flips it active *instantly* via `useOptimistic`, and (b) runs the
// navigation inside the shared transition so sibling `PendingRegion`s dim while
// the server recomputes. The optimistic value auto-reconciles to the server
// `active` prop once the new render commits.
export function FilterPills({
  label,
  param,
  options,
  active,
  defaultValue = "",
  ariaLabel,
  mono = false,
}: {
  label?: string;
  param: string;
  options: FilterOption[];
  active: string;
  /** When a pill's value equals this, the param is dropped (clean URLs). */
  defaultValue?: string;
  ariaLabel?: string;
  /** Render pill labels in the mono font (for wallet addresses). */
  mono?: boolean;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { startTransition } = useFilterContext();
  const [optimisticActive, setOptimisticActive] = useOptimistic(active);

  function select(value: string) {
    if (value === optimisticActive) return;
    const params = new URLSearchParams(searchParams.toString());
    if (value === defaultValue) params.delete(param);
    else params.set(param, value);
    const qs = params.toString();
    const url = qs ? `${pathname}?${qs}` : pathname;

    // setOptimistic MUST run inside the transition, or React reverts it
    // immediately and warns.
    startTransition(() => {
      setOptimisticActive(value);
      router.push(url, { scroll: false });
    });
  }

  return (
    <div
      className={styles.group}
      role="radiogroup"
      aria-label={ariaLabel ?? label}
    >
      {label ? <span className={styles.controlLabel}>{label}</span> : null}
      {options.map((opt) => {
        const isActive = opt.value === optimisticActive;
        const base = isActive ? styles.chipActive : styles.chip;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={isActive}
            className={mono ? `${base} ${styles.mono}` : base}
            onClick={() => select(opt.value)}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
