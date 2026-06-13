import Link from "next/link";

import styles from "./marketing.module.scss";

export default function MarketingLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <nav className={styles.nav}>
          <Link href="/" className={styles.brand}>
            EdgeBoard
          </Link>
          <div className={styles.navRight}>
            <Link href="/markets" className={styles.navLink}>
              Markets
            </Link>
            <Link href="/signin" className={styles.signInBtn}>
              Sign in
            </Link>
          </div>
        </nav>
      </header>

      <main className={styles.main}>{children}</main>

      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <div className={styles.footerLinks}>
            <Link href="/terms" className={styles.footerLink}>
              Terms
            </Link>
            <Link href="/privacy" className={styles.footerLink}>
              Privacy
            </Link>
          </div>
          <p className={styles.disclaimer}>
            Information only, not financial advice.
          </p>
        </div>
      </footer>
    </div>
  );
}
