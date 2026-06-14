import Link from "next/link";

import { MeshGradient } from "@/components/motion/MeshGradient";
import { PageTransition } from "@/components/motion/PageTransition";
import { ThemeToggle } from "@/components/Theme/ThemeToggle";
import styles from "./marketing.module.scss";

export default function MarketingLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className={styles.page}>
      <MeshGradient />
      <header className={styles.header}>
        <nav className={styles.nav}>
          <Link href="/" className={styles.brand}>
            <span className={styles.brandMark} aria-hidden />
            EdgeBoard
          </Link>
          <div className={styles.navRight}>
            <Link href="/whale-watch" className={styles.navLink}>
              Whale watch
            </Link>
            <ThemeToggle />
            <Link href="/signin" className={styles.signInBtn}>
              Sign in
            </Link>
          </div>
        </nav>
      </header>

      <main className={styles.main}>
        <PageTransition>{children}</PageTransition>
      </main>

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
