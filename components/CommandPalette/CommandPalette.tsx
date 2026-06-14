"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  LayoutDashboard,
  LineChart,
  Search,
  Settings,
  Wallet,
  Waves,
  type LucideIcon,
} from "lucide-react";

import styles from "./commandpalette.module.scss";

type Command = {
  id: string;
  label: string;
  hint?: string;
  icon: LucideIcon;
  href: string;
};

const NAV: Command[] = [
  { id: "dashboard", label: "Dashboard", hint: "Portfolio", icon: LayoutDashboard, href: "/dashboard" },
  { id: "markets", label: "Markets", hint: "Browse markets", icon: LineChart, href: "/markets" },
  { id: "whales", label: "Whales", hint: "Smart money", icon: Waves, href: "/whales" },
  { id: "settings", label: "Settings", hint: "Plan & alerts", icon: Settings, href: "/settings" },
];

const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;

// Global ⌘K palette: navigation + "search markets" / "open wallet" actions that
// navigate to existing routes (no new API). Mounted once in the app layout.
export function CommandPalette() {
  const router = useRouter();
  const reduce = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    }
    const onOpen = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener("edgeboard:open-command", onOpen as EventListener);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener(
        "edgeboard:open-command",
        onOpen as EventListener,
      );
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setActive(0);
    const t = setTimeout(() => inputRef.current?.focus(), 20);
    return () => clearTimeout(t);
  }, [open]);

  const commands = useMemo<Command[]>(() => {
    const q = query.trim();
    const lower = q.toLowerCase();
    const nav = NAV.filter((c) => !lower || c.label.toLowerCase().includes(lower));
    const dynamic: Command[] = [];
    if (q) {
      if (ADDRESS_RE.test(q)) {
        dynamic.push({
          id: "wallet",
          label: `Open wallet ${q.slice(0, 6)}…${q.slice(-4)}`,
          hint: "Whale detail",
          icon: Wallet,
          href: `/whales/${q.toLowerCase()}`,
        });
      }
      dynamic.push({
        id: "search",
        label: `Search markets for “${q}”`,
        hint: "Markets",
        icon: Search,
        href: `/markets?q=${encodeURIComponent(q)}`,
      });
    }
    return [...nav, ...dynamic];
  }, [query]);

  useEffect(() => {
    setActive((a) => Math.min(a, Math.max(0, commands.length - 1)));
  }, [commands.length]);

  function run(cmd: Command | undefined) {
    if (!cmd) return;
    setOpen(false);
    router.push(cmd.href);
  }

  function onInputKey(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, commands.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      run(commands[active]);
    }
  }

  if (!mounted) return null;

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className={styles.overlay}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={() => setOpen(false)}
        >
          <motion.div
            className={styles.panel}
            role="dialog"
            aria-modal="true"
            aria-label="Command palette"
            initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.97, y: -8 }}
            animate={reduce ? { opacity: 1 } : { opacity: 1, scale: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.98, y: -8 }}
            transition={{ duration: 0.16, ease: "easeOut" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.searchRow}>
              <Search size={16} className={styles.searchIcon} />
              <input
                ref={inputRef}
                className={styles.input}
                placeholder="Search markets, paste a wallet, or jump to…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onInputKey}
                aria-label="Command palette search"
              />
              <kbd className={styles.kbd}>ESC</kbd>
            </div>

            <ul className={styles.list} role="listbox">
              {commands.length === 0 ? (
                <li className={styles.empty}>No matches</li>
              ) : (
                commands.map((cmd, i) => {
                  const Icon = cmd.icon;
                  return (
                    <li
                      key={cmd.id}
                      role="option"
                      aria-selected={i === active}
                      className={i === active ? styles.itemActive : styles.item}
                      onMouseEnter={() => setActive(i)}
                      onClick={() => run(cmd)}
                    >
                      <Icon size={16} className={styles.itemIcon} />
                      <span className={styles.itemLabel}>{cmd.label}</span>
                      {cmd.hint ? (
                        <span className={styles.itemHint}>{cmd.hint}</span>
                      ) : null}
                    </li>
                  );
                })
              )}
            </ul>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
