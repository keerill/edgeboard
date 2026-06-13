"use client";

import { usePathname } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";

// Enter-only transition keyed on the pathname: changing routes remounts the
// wrapper, replaying a subtle fade + rise. Enter-only (no AnimatePresence exit)
// keeps it robust with App Router / RSC streaming.
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const reduce = useReducedMotion();

  if (reduce) return <>{children}</>;

  return (
    <motion.div
      key={pathname}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}
