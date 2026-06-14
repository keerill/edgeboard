import { Lightbulb, type LucideIcon } from "lucide-react";

import styles from "./emptystate.module.scss";

// Reusable empty / upsell state. Server-renderable. `variant="pro"` gives the
// duotone wash + accent border used for plan upsells across the app.
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  hint,
  variant = "default",
}: {
  icon?: LucideIcon;
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  hint?: React.ReactNode;
  variant?: "default" | "pro";
}) {
  const cls =
    variant === "pro" ? `${styles.root} ${styles.pro}` : styles.root;

  return (
    <div className={cls}>
      {Icon ? (
        <span className={styles.iconWrap}>
          <Icon size={24} strokeWidth={1.75} />
        </span>
      ) : null}
      <h3 className={styles.title}>{title}</h3>
      {description ? <p className={styles.description}>{description}</p> : null}
      {action ? <div className={styles.action}>{action}</div> : null}
      {hint ? (
        <span className={styles.hint}>
          <Lightbulb size={14} className={styles.hintIcon} aria-hidden />
          {hint}
        </span>
      ) : null}
    </div>
  );
}
