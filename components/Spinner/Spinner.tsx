import styles from "./spinner.module.scss";

// Pure-CSS loading ring (no JS, server-renderable).
//  - `inline`  sits inside buttons / next to text; the ring uses `currentColor`
//    so it reads correctly on both plain and accent-filled buttons.
//  - `overlay` absolutely centers a glass badge (ring + caption) over a
//    positioned `PendingRegion`.
// Respects prefers-reduced-motion: the ring stops spinning (see scss) and the
// `label` carries the busy state for assistive tech (visible for `overlay`,
// visually-hidden for `inline`).
export function Spinner({
  size = 16,
  variant = "inline",
  label = "Loading…",
  className,
}: {
  size?: number;
  variant?: "inline" | "overlay";
  label?: string;
  className?: string;
}) {
  const ringStyle = { width: size, height: size };

  if (variant === "overlay") {
    return (
      <span
        className={`${styles.overlay} ${className ?? ""}`}
        role="status"
        aria-live="polite"
      >
        <span className={styles.badge}>
          <span className={styles.ring} style={ringStyle} aria-hidden />
          <span className={styles.caption}>{label}</span>
        </span>
      </span>
    );
  }

  return (
    <span className={`${styles.inline} ${className ?? ""}`} role="status">
      <span className={styles.ring} style={ringStyle} aria-hidden />
      <span className={styles.srOnly}>{label}</span>
    </span>
  );
}
