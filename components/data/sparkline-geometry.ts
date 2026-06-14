export interface SparklineGeometry {
  flat: boolean;
  /** "x,y x,y ..." for the <polyline>. */
  line: string;
  /** Closed polygon (line + baseline) for the filled area. */
  area: string;
  /** y of the flat baseline (only meaningful when flat). */
  baselineY: number;
}

/**
 * Pure geometry for a sparkline — normalizes `data` into SVG coordinates within
 * a `width`×`height` box (padded by `pad` so the stroke isn't clipped). Kept in
 * its own module (no JSX / no CSS import) so the math is unit-testable.
 */
export function buildSparkline(
  data: number[],
  width: number,
  height: number,
  pad: number,
): SparklineGeometry {
  const baselineY = height / 2;
  if (!data || data.length < 2) {
    return { flat: true, line: "", area: "", baselineY };
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const innerW = width - pad * 2;
  const innerH = height - pad * 2;

  const pts = data.map((v, i) => {
    const x = pad + (i / (data.length - 1)) * innerW;
    const y = pad + (1 - (v - min) / range) * innerH;
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  });

  const line = pts.join(" ");
  const area = `${line} ${(width - pad).toFixed(2)},${(height - pad).toFixed(2)} ${pad.toFixed(2)},${(height - pad).toFixed(2)}`;
  return { flat: false, line, area, baselineY };
}
