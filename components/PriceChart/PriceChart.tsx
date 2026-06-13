"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceDot,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import styles from "./PriceChart.module.scss";

export interface PricePoint {
  /** Unix milliseconds. */
  ts: number;
  /** YES price, 0..1. */
  price: number;
}

export interface WhalePoint {
  ts: number;
  price: number;
  side: "buy" | "sell";
}

export interface PriceChartProps {
  points: PricePoint[];
  whales: WhalePoint[];
}

const BUY = "#16a34a";
const SELL = "#dc2626";

function formatAxisDate(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function formatAxisPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

export function PriceChart({ points, whales }: PriceChartProps) {
  if (points.length === 0) {
    return (
      <p className={styles.empty}>
        No price history yet — the snapshot-prices cron builds this series over
        time.
      </p>
    );
  }

  const allTs = [...points.map((p) => p.ts), ...whales.map((w) => w.ts)];
  const xMin = Math.min(...allTs);
  const xMax = Math.max(...allTs);

  return (
    <div className={styles.chart}>
      <ResponsiveContainer width="100%" height={340}>
        <LineChart
          data={points}
          margin={{ top: 8, right: 16, bottom: 8, left: 0 }}
        >
          <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
          <XAxis
            dataKey="ts"
            type="number"
            domain={[xMin, xMax]}
            scale="time"
            tickFormatter={formatAxisDate}
            stroke="var(--muted)"
            fontSize={12}
          />
          <YAxis
            domain={[0, 1]}
            tickFormatter={formatAxisPercent}
            stroke="var(--muted)"
            fontSize={12}
            width={44}
          />
          <Tooltip
            formatter={(value) => [formatAxisPercent(Number(value)), "YES"]}
            labelFormatter={(label) => new Date(Number(label)).toLocaleString()}
            contentStyle={{
              background: "var(--background)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius)",
              fontSize: "0.8125rem",
            }}
          />
          <Line
            type="monotone"
            dataKey="price"
            stroke="var(--foreground)"
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
          {whales.map((w, i) => (
            <ReferenceDot
              key={i}
              x={w.ts}
              y={w.price}
              r={5}
              fill={w.side === "sell" ? SELL : BUY}
              fillOpacity={0.85}
              stroke="var(--background)"
              strokeWidth={1}
              ifOverflow="extendDomain"
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
      <div className={styles.legend}>
        <span className={styles.legendItem}>
          <span className={styles.dotBuy} /> Whale buy
        </span>
        <span className={styles.legendItem}>
          <span className={styles.dotSell} /> Whale sell
        </span>
      </div>
    </div>
  );
}
