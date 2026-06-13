"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";
import {
  LayoutDashboard,
  LineChart,
  Settings,
  Waves,
  type LucideIcon,
} from "lucide-react";

import styles from "./navlinks.module.scss";

const ICONS: Record<string, LucideIcon> = {
  "/dashboard": LayoutDashboard,
  "/markets": LineChart,
  "/whales": Waves,
  "/settings": Settings,
};

type NavItem = { href: string; label: string };

export function NavLinks({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  const reduce = useReducedMotion();

  return (
    <div className={styles.links}>
      {items.map((item) => {
        const Icon = ICONS[item.href];
        const active =
          pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={active ? styles.linkActive : styles.link}
            aria-current={active ? "page" : undefined}
          >
            {active ? (
              <motion.span
                layoutId="nav-pill"
                className={styles.pill}
                transition={
                  reduce
                    ? { duration: 0 }
                    : { type: "spring", stiffness: 420, damping: 34 }
                }
              />
            ) : null}
            {Icon ? <Icon size={16} className={styles.icon} /> : null}
            <span>{item.label}</span>
          </Link>
        );
      })}
    </div>
  );
}
