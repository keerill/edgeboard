"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "motion/react";

import styles from "./meshgradient.module.scss";

// Three blurred violet/cyan blobs drifting slowly behind the whole app — the
// "living" aurora. Animates transform only (GPU-composited, the blur is
// rasterized once), never per-frame React state. Falls back to a static wash
// under reduced-motion or on low-core devices, and renders identical markup on
// the server + first client paint (no hydration mismatch).
const BLOBS = [
  {
    className: styles.blobA,
    animate: { x: [0, 40, -20, 0], y: [0, -30, 20, 0], scale: [1, 1.12, 0.96, 1] },
    duration: 26,
  },
  {
    className: styles.blobB,
    animate: { x: [0, -50, 30, 0], y: [0, 24, -16, 0], scale: [1, 0.94, 1.1, 1] },
    duration: 32,
  },
  {
    className: styles.blobC,
    animate: { x: [0, 30, -34, 0], y: [0, 20, -26, 0], scale: [1, 1.08, 0.95, 1] },
    duration: 22,
  },
];

export function MeshGradient() {
  const reduce = useReducedMotion();
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    if (reduce) return;
    const cores =
      typeof navigator !== "undefined"
        ? navigator.hardwareConcurrency ?? 8
        : 8;
    if (cores <= 4) return;
    setAnimated(true);
  }, [reduce]);

  return (
    <div className={styles.root} aria-hidden>
      {BLOBS.map((blob, i) =>
        animated ? (
          <motion.div
            key={i}
            className={blob.className}
            animate={blob.animate}
            transition={{
              duration: blob.duration,
              ease: "easeInOut",
              repeat: Infinity,
              repeatType: "loop",
            }}
          />
        ) : (
          <div key={i} className={blob.className} />
        ),
      )}
    </div>
  );
}
