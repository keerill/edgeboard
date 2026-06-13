import styles from "./skeleton.module.scss";

// Pure-CSS shimmer placeholder (no JS). `w`/`h` accept any CSS size; `radius`
// switches to a pill for avatar/badge shapes.
export function Skeleton({
  w = "100%",
  h = "1rem",
  radius,
  className,
}: {
  w?: string | number;
  h?: string | number;
  radius?: "sm" | "md" | "pill";
  className?: string;
}) {
  const radiusClass =
    radius === "pill"
      ? styles.pill
      : radius === "sm"
        ? styles.sm
        : styles.md;
  return (
    <span
      className={`${styles.skeleton} ${radiusClass} ${className ?? ""}`}
      style={{ width: w, height: h }}
      aria-hidden
    />
  );
}
