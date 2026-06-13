import Link from "next/link";
import { redirect } from "next/navigation";
import { LogOut } from "lucide-react";

import { auth, signOut } from "@/auth";
import { NavLinks } from "@/components/Nav/NavLinks";
import { PageTransition } from "@/components/motion/PageTransition";
import { ThemeToggle } from "@/components/Theme/ThemeToggle";
import styles from "./app.module.scss";

const NAV = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/markets", label: "Markets" },
  { href: "/whales", label: "Whales" },
  { href: "/settings", label: "Settings" },
];

export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await auth();

  // Belt-and-suspenders: middleware already gates these routes.
  if (!session?.user) {
    redirect("/signin");
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <nav className={styles.nav}>
          <div className={styles.navLeft}>
            <Link href="/dashboard" className={styles.brand}>
              <span className={styles.brandMark} aria-hidden />
              EdgeBoard
            </Link>
            <NavLinks items={NAV} />
          </div>
          <div className={styles.navRight}>
            <span className={styles.userEmail}>
              {session.user.email ?? session.user.name}
            </span>
            <ThemeToggle />
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/" });
              }}
            >
              <button
                type="submit"
                className={styles.signOutBtn}
                aria-label="Sign out"
                title="Sign out"
              >
                <LogOut size={16} />
                <span>Sign out</span>
              </button>
            </form>
          </div>
        </nav>
      </header>

      <main className={styles.main}>
        <PageTransition>{children}</PageTransition>
      </main>

      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          Information only, not financial advice.
        </div>
      </footer>
    </div>
  );
}
