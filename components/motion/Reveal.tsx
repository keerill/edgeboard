"use client";

import { motion, useReducedMotion } from "motion/react";

// One-shot fade + rise for a whole section (tables, chart, hero). Safer than
// per-row stagger for markup that can't be wrapped (e.g. <table>).
export function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const reduce = useReducedMotion();

  if (reduce) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, ease: "easeOut", delay }}
    >
      {children}
    </motion.div>
  );
}
