import { buildSparkline } from "./sparkline-geometry";
import styles from "./sparkline.module.scss";

// Inline SVG sparkline — no charting lib. Stroke is `currentColor`, so the
// parent picks the color (success / danger / accent) via CSS. Decorative.
export function Sparkline({
  data,
  width = 96,
  height = 28,
  strokeWidth = 1.5,
  fill = false,
  responsive = false,
  className,
}: {
  data: number[];
  width?: number;
  height?: number;
  strokeWidth?: number;
  fill?: boolean;
  responsive?: boolean;
  className?: string;
}) {
  const geo = buildSparkline(data, width, height, strokeWidth);
  const sizeProps = responsive
    ? { width: "100%", height, preserveAspectRatio: "none" as const }
    : { width, height };

  return (
    <svg
      className={`${styles.spark} ${className ?? ""}`}
      viewBox={`0 0 ${width} ${height}`}
      aria-hidden
      {...sizeProps}
    >
      {geo.flat ? (
        <line
          x1={strokeWidth}
          y1={geo.baselineY}
          x2={width - strokeWidth}
          y2={geo.baselineY}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeOpacity={0.4}
          strokeLinecap="round"
        />
      ) : (
        <>
          {fill ? (
            <polygon points={geo.area} fill="currentColor" fillOpacity={0.12} />
          ) : null}
          <polyline
            points={geo.line}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </>
      )}
    </svg>
  );
}
