import styles from "./Prose.module.scss";

export function Prose({ children }: { children: React.ReactNode }) {
  return <article className={styles.prose}>{children}</article>;
}
