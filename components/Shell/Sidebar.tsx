"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, Menu, Search, Sparkles, X } from "lucide-react";
import { useEffect, useState } from "react";

import { NavLinks } from "@/components/Nav/NavLinks";
import { ThemeToggle } from "@/components/Theme/ThemeToggle";
import styles from "./sidebar.module.scss";

type NavItem = { href: string; label: string };

// App shell navigation. Client component because it owns the mobile drawer state.
// Email + the sign-out Server Action are passed down from the server layout.
export function Sidebar({
  items,
  email,
  signOutAction,
}: {
  items: NavItem[];
  email: string;
  signOutAction: () => void;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Close the drawer whenever the route changes.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <>
      <div className={styles.mobileBar}>
        <button
          type="button"
          className={styles.iconBtn}
          onClick={() => setOpen(true)}
          aria-label="Open menu"
        >
          <Menu size={20} />
        </button>
        <Link href="/dashboard" className={styles.brand}>
          <span className={styles.brandMark} aria-hidden />
          EdgeBoard
        </Link>
        <ThemeToggle />
      </div>

      {open ? (
        <div
          className={styles.backdrop}
          onClick={() => setOpen(false)}
          aria-hidden
        />
      ) : null}

      <aside className={open ? styles.sidebarOpen : styles.sidebar}>
        <div className={styles.brandRow}>
          <Link href="/dashboard" className={styles.brand}>
            <span className={styles.brandMark} aria-hidden />
            EdgeBoard
          </Link>
          <button
            type="button"
            className={styles.closeBtn}
            onClick={() => setOpen(false)}
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        </div>

        <button
          type="button"
          className={styles.searchTrigger}
          onClick={() =>
            window.dispatchEvent(new Event("edgeboard:open-command"))
          }
        >
          <Search size={15} />
          <span>Search…</span>
          <kbd className={styles.kbd}>⌘K</kbd>
        </button>

        <nav className={styles.nav}>
          <NavLinks items={items} variant="sidebar" />
        </nav>

        <div className={styles.bottom}>
          <Link href="/settings" className={styles.proCard}>
            <span className={styles.proTitle}>
              <Sparkles size={14} />
              Upgrade to Pro
            </span>
            <span className={styles.proText}>
              Unlimited wallets, full history &amp; alerts.
            </span>
          </Link>

          <div className={styles.account}>
            <ThemeToggle />
            <span className={styles.email} title={email}>
              {email}
            </span>
            <form action={signOutAction}>
              <button
                type="submit"
                className={styles.iconBtn}
                aria-label="Sign out"
                title="Sign out"
              >
                <LogOut size={16} />
              </button>
            </form>
          </div>
        </div>
      </aside>
    </>
  );
}
