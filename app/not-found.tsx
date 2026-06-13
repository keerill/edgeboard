import Link from "next/link";

import styles from "./not-found.module.scss";

export default function NotFound() {
  return (
    <div className={styles.wrap}>
      <h1 className={styles.title}>Page not found</h1>
      <p className={styles.body}>
        The page you’re looking for doesn’t exist or has moved.
      </p>
      <Link href="/" className={styles.link}>
        Back to home
      </Link>
    </div>
  );
}
