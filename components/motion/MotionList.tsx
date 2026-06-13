"use client";

import { Children } from "react";
import { motion, useReducedMotion, type Variants } from "motion/react";

// Stagger-reveals its direct children. The container className is applied to the
// motion wrapper, so passing a grid/flex class keeps the original layout intact
// (each child becomes a cell/item, just wrapped in a motion element).
export function MotionList({
  children,
  className,
  itemClassName,
  stagger = 0.05,
}: {
  children: React.ReactNode;
  className?: string;
  itemClassName?: string;
  stagger?: number;
}) {
  const reduce = useReducedMotion();

  const container: Variants = {
    hidden: {},
    show: { transition: { staggerChildren: reduce ? 0 : stagger } },
  };
  const item: Variants = reduce
    ? { hidden: { opacity: 1 }, show: { opacity: 1 } }
    : {
        hidden: { opacity: 0, y: 10 },
        show: { opacity: 1, y: 0, transition: { duration: 0.32, ease: "easeOut" } },
      };

  return (
    <motion.div
      className={className}
      variants={container}
      initial="hidden"
      animate="show"
    >
      {Children.map(children, (child) => (
        <motion.div className={itemClassName} variants={item}>
          {child}
        </motion.div>
      ))}
    </motion.div>
  );
}
