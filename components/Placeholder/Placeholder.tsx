import styles from "./Placeholder.module.scss";

export function Placeholder({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className={styles.section}>
      <h1 className={styles.title}>{title}</h1>
      <p className={styles.body}>{children}</p>
    </section>
  );
}
