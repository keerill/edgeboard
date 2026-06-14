"use client";

import { useRef } from "react";
import { useReducedMotion } from "motion/react";

import styles from "./spotlight.module.scss";

// Cursor-following radial glow over a surface. Updates CSS vars only (no React
// re-render, no layout reflow) so it's effectively free. The glow is a ::after
// layer in spotlight.module.scss. Inert under reduced-motion (no listener).
export function Spotlight({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const cls = className ? `${styles.spotlight} ${className}` : styles.spotlight;

  function onMove(e: React.PointerEvent<HTMLDivElement>) {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--mx", `${e.clientX - r.left}px`);
    el.style.setProperty("--my", `${e.clientY - r.top}px`);
  }

  if (reduce) {
    return <div className={cls}>{children}</div>;
  }

  return (
    <div ref={ref} className={cls} onPointerMove={onMove}>
      {children}
    </div>
  );
}
