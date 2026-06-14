"use client";

import { motion, useReducedMotion } from "motion/react";

// One-shot fade + rise for a whole section (tables, chart, hero). Safer than
// per-row stagger for markup that can't be wrapped (e.g. <table>).
// Pass `whenInView` to defer the reveal until the element scrolls into view
// (IntersectionObserver under the hood) for scroll-choreographed pages.
export function Reveal({
  children,
  className,
  delay = 0,
  whenInView = false,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  whenInView?: boolean;
}) {
  const reduce = useReducedMotion();

  if (reduce) {
    return <div className={className}>{children}</div>;
  }

  if (whenInView) {
    return (
      <motion.div
        className={className}
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-10% 0px" }}
        transition={{ duration: 0.4, ease: "easeOut", delay }}
      >
        {children}
      </motion.div>
    );
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
