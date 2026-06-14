"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import { useThemeColors } from "@/components/Theme/useThemeColors";
import { formatCompactUsd } from "@/lib/format";
import styles from "./donut.module.scss";

export interface DonutSlice {
  label: string;
  value: number;
}

const FALLBACK = ["#7c5cff", "#22d3ee", "#22c55e", "#fbbf24", "#f87171", "#a1a1aa"];

export function Donut({ data }: { data: DonutSlice[] }) {
  const colors = useThemeColors();
  const palette = [
    colors["--accent"] || FALLBACK[0],
    colors["--info"] || FALLBACK[1],
    colors["--success"] || FALLBACK[2],
    colors["--warning"] || FALLBACK[3],
    colors["--accent-hover"] || FALLBACK[0],
    colors["--muted"] || FALLBACK[5],
  ];

  const total = data.reduce((s, d) => s + d.value, 0) || 1;

  return (
    <div className={styles.donut}>
      <div className={styles.chart}>
        <ResponsiveContainer width="100%" height={190}>
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="label"
              innerRadius={56}
              outerRadius={82}
              paddingAngle={2}
              stroke="none"
              isAnimationActive={false}
            >
              {data.map((_, i) => (
                <Cell key={i} fill={palette[i % palette.length]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value) => formatCompactUsd(Number(value))}
              contentStyle={{
                background: "var(--elevated)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius)",
                boxShadow: "var(--shadow-md)",
                fontSize: "0.8125rem",
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <ul className={styles.legend}>
        {data.map((d, i) => (
          <li key={i} className={styles.legendItem}>
            <span
              className={styles.swatch}
              style={{ background: palette[i % palette.length] }}
            />
            <span className={styles.legendLabel}>{d.label}</span>
            <span className={styles.legendValue}>
              {Math.round((d.value / total) * 100)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
