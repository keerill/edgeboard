"use client";

import { useRef } from "react";
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
} from "motion/react";

// Wraps a child (button/link) and nudges it toward the cursor for a tactile,
// "premium" hover. Transform-only, capped offset, springs back on leave.
// Inert under reduced-motion and on coarse (touch) pointers.
export function MagneticButton({
  children,
  className,
  strength = 0.3,
  cap = 10,
}: {
  children: React.ReactNode;
  className?: string;
  strength?: number;
  cap?: number;
}) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLSpanElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 150, damping: 15, mass: 0.1 });
  const sy = useSpring(y, { stiffness: 150, damping: 15, mass: 0.1 });

  if (reduce) {
    return <span className={className}>{children}</span>;
  }

  const clamp = (v: number) => Math.max(-cap, Math.min(cap, v));

  function onMove(e: React.PointerEvent<HTMLSpanElement>) {
    if (e.pointerType === "touch") return;
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    x.set(clamp((e.clientX - (r.left + r.width / 2)) * strength));
    y.set(clamp((e.clientY - (r.top + r.height / 2)) * strength));
  }

  function reset() {
    x.set(0);
    y.set(0);
  }

  return (
    <motion.span
      ref={ref}
      className={className}
      style={{ x: sx, y: sy, display: "inline-flex" }}
      onPointerMove={onMove}
      onPointerLeave={reset}
    >
      {children}
    </motion.span>
  );
}
