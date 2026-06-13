import Link from "next/link";
import { redirect } from "next/navigation";

import { auth, signOut } from "@/auth";
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
              EdgeBoard
            </Link>
            <div className={styles.navLinks}>
              {NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={styles.navLink}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
          <div className={styles.navRight}>
            <span className={styles.userEmail}>
              {session.user.email ?? session.user.name}
            </span>
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/" });
              }}
            >
              <button type="submit" className={styles.signOutBtn}>
                Sign out
              </button>
            </form>
          </div>
        </nav>
      </header>

      <main className={styles.main}>{children}</main>

      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          Information only, not financial advice.
        </div>
      </footer>
    </div>
  );
}
