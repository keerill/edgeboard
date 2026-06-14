"use client";

import { Search } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import { Spinner } from "@/components/Spinner/Spinner";
import { useFilterContext } from "./FilterProvider";
import styles from "./filters.module.scss";

// Search input that navigates through the shared filter transition (so the
// results `PendingRegion` dims while the server filters). Progressive
// enhancement: the `<form action method="get">` + `hidden` passthrough inputs
// still work without JS; the onSubmit handler only intercepts when JS runs.
export function SearchForm({
  param = "q",
  action,
  placeholder = "Search…",
  hidden,
}: {
  param?: string;
  /** no-JS fallback target, e.g. "/markets" */
  action: string;
  placeholder?: string;
  /** other current params to preserve on a no-JS GET submit */
  hidden?: Record<string, string>;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { isPending, startTransition } = useFilterContext();
  const [value, setValue] = useState(searchParams.get(param) ?? "");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams(searchParams.toString());
    const v = value.trim();
    if (v) params.set(param, v);
    else params.delete(param);
    const qs = params.toString();
    startTransition(() => {
      router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    });
  }

  return (
    <form className={styles.search} action={action} method="get" onSubmit={submit}>
      {hidden
        ? Object.entries(hidden).map(([k, v]) => (
            <input key={k} type="hidden" name={k} value={v} />
          ))
        : null}
      <div className={styles.searchWrap}>
        <Search size={15} className={styles.searchIcon} aria-hidden />
        <input
          type="search"
          name={param}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          aria-label={placeholder}
          className={styles.searchInput}
        />
      </div>
      <button type="submit" className={styles.searchBtn}>
        {isPending ? <Spinner size={14} label="Searching…" /> : "Search"}
      </button>
    </form>
  );
}
