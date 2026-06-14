import styles from "./statstrip.module.scss";

// Responsive KPI grid — 4-6 StatCards on a desktop row, wrapping on smaller.
export function StatStrip({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={`${styles.strip} ${className ?? ""}`}>{children}</div>;
}
