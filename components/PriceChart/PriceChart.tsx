"use client";

import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceDot,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { useThemeColors } from "@/components/Theme/useThemeColors";
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

// Fallbacks used only for the very first render before useThemeColors' effect
// has read the live CSS variables.
const BUY_FALLBACK = "#22c55e";
const SELL_FALLBACK = "#f87171";

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
  const colors = useThemeColors();

  if (points.length === 0) {
    return (
      <p className={styles.empty}>
        No price history yet — the snapshot-prices cron builds this series over
        time.
      </p>
    );
  }

  const buy = colors["--success"] || BUY_FALLBACK;
  const sell = colors["--danger"] || SELL_FALLBACK;
  const line = colors["--accent"] || "#8b5cf6";
  const dotStroke = colors["--bg"] || "#0b0b0f";

  const allTs = [...points.map((p) => p.ts), ...whales.map((w) => w.ts)];
  const xMin = Math.min(...allTs);
  const xMax = Math.max(...allTs);

  return (
    <div className={styles.chart}>
      <ResponsiveContainer width="100%" height={340}>
        <ComposedChart
          data={points}
          margin={{ top: 8, right: 16, bottom: 8, left: 0 }}
        >
          <defs>
            <linearGradient id="priceFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={line} stopOpacity={0.25} />
              <stop offset="100%" stopColor={line} stopOpacity={0} />
            </linearGradient>
          </defs>
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
              background: "var(--elevated)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius)",
              boxShadow: "var(--shadow-md)",
              fontSize: "0.8125rem",
            }}
            labelStyle={{ color: "var(--muted)" }}
            cursor={{ stroke: "var(--border-strong)", strokeWidth: 1 }}
          />
          <Area
            type="monotone"
            dataKey="price"
            stroke="none"
            fill="url(#priceFill)"
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="price"
            stroke={line}
            strokeWidth={2}
            dot={false}
            isAnimationActive
            animationDuration={650}
          />
          {whales.map((w, i) => (
            <ReferenceDot
              key={i}
              x={w.ts}
              y={w.price}
              r={5}
              fill={w.side === "sell" ? sell : buy}
              fillOpacity={0.9}
              stroke={dotStroke}
              strokeWidth={1.5}
              ifOverflow="extendDomain"
            />
          ))}
        </ComposedChart>
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
