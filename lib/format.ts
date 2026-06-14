// Display formatters. Money/numeric values come from Prisma as Decimal, so
// these accept Decimal | number | string | null and round on output (§6: every
// number on screen is rounded).

type Numeric = number | string | { toString(): string } | null | undefined;

function toNumber(value: Numeric): number | null {
  if (value === null || value === undefined) return null;
  const n = typeof value === "number" ? value : Number(String(value));
  return Number.isFinite(n) ? n : null;
}

/** YES outcome price (0..1 probability) → "54.5%". */
export function formatYesPrice(value: Numeric): string {
  const n = toNumber(value);
  if (n === null) return "—";
  return `${(n * 100).toFixed(1)}%`;
}

/** USDC amount → compact "$1.2M" / "$45.3K" / "$920" (sign-aware). */
export function formatCompactUsd(value: Numeric): string {
  const n = toNumber(value);
  if (n === null) return "—";
  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(1)}K`;
  return `${sign}$${Math.round(abs)}`;
}

/** 0..1 fraction → "62%" win rate, or "—" when null. */
export function formatPercent(value: Numeric): string {
  const n = toNumber(value);
  if (n === null) return "—";
  return `${Math.round(n * 100)}%`;
}

/** Share count → grouped integer "51,020" (positions hold whole-ish shares). */
export function formatShares(value: Numeric): string {
  const n = toNumber(value);
  if (n === null) return "—";
  return Math.round(n).toLocaleString("en-US");
}

/** Wallet address → "0x1234…cdef". */
export function shortenAddress(address: string): string {
  if (address.length <= 12) return address;
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

/** Future date → coarse "3d left" / "5h left" / "12m left" / "Ended". */
export function formatCountdown(
  date: Date | string | number | null | undefined,
): string {
  if (date === null || date === undefined) return "—";
  const ms = date instanceof Date ? date.getTime() : new Date(date).getTime();
  if (Number.isNaN(ms)) return "—";
  const diffSec = Math.round((ms - Date.now()) / 1000);
  if (diffSec <= 0) return "Ended";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m left`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h left`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d left`;
}

/** Past date → coarse "just now" / "3m ago" / "5h ago" / "2d ago". */
export function formatRelativeTime(date: Date | string | number): string {
  const ms = date instanceof Date ? date.getTime() : new Date(date).getTime();
  if (Number.isNaN(ms)) return "—";
  const diffSec = Math.max(0, Math.round((Date.now() - ms) / 1000));
  if (diffSec < 60) return "just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d ago`;
}
