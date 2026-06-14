"use client";

import { animate, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";

import {
  formatCompactUsd,
  formatPercent,
  formatYesPrice,
} from "@/lib/format";

// A string token instead of a function — functions can't cross the
// server→client component boundary, and the number is animated client-side.
export type NumberFormat = "plain" | "int" | "usd" | "percent" | "yes";

function applyFormat(format: NumberFormat | undefined, n: number): string {
  switch (format) {
    case "usd":
      return formatCompactUsd(n);
    case "percent":
      return formatPercent(n);
    case "yes":
      return formatYesPrice(n);
    case "int":
      return Math.round(n).toLocaleString();
    default:
      return Math.round(n).toLocaleString();
  }
}

// Count-up animation between value changes. Renders the final, formatted value
// on first paint (SSR-safe — no hydration mismatch, no count-up on initial load)
// and only animates when `value` changes on subsequent client renders.
export function AnimatedNumber({
  value,
  format,
  className,
}: {
  value: number;
  format?: NumberFormat;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const [display, setDisplay] = useState(value);
  const prev = useRef(value);

  useEffect(() => {
    if (reduce || prev.current === value) {
      setDisplay(value);
      prev.current = value;
      return;
    }
    const controls = animate(prev.current, value, {
      duration: 0.6,
      ease: "easeOut",
      onUpdate: (v) => setDisplay(v),
    });
    prev.current = value;
    return () => controls.stop();
  }, [value, reduce]);

  return <span className={className}>{applyFormat(format, display)}</span>;
}
