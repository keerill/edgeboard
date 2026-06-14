import styles from "./contextbar.module.scss";

// Sticky per-page header inside the content column: eyebrow + big title on the
// left, page-level controls (search / filters / period chips) in the actions slot.
export function ContextBar({
  title,
  eyebrow,
  actions,
  children,
}: {
  title: string;
  eyebrow?: string;
  actions?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className={styles.bar}>
      <div className={styles.head}>
        <div className={styles.titles}>
          {eyebrow ? <span className={styles.eyebrow}>{eyebrow}</span> : null}
          <h1 className={styles.title}>{title}</h1>
        </div>
        {actions ? <div className={styles.actions}>{actions}</div> : null}
      </div>
      {children}
    </div>
  );
}
