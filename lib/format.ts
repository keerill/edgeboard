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

/** USDC amount → compact "$1.2M" / "$45.3K" / "$920". */
export function formatCompactUsd(value: Numeric): string {
  const n = toNumber(value);
  if (n === null) return "—";
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${Math.round(n)}`;
}
