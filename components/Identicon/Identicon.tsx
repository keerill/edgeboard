import styles from "./identicon.module.scss";

// FNV-1a 32-bit — deterministic, fast, no crypto needed.
function hash(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

// Deterministic blocky avatar from a wallet address (mirrored 5×5 grid over a
// hue-derived base). Pure SVG, server-renderable, no external dependency.
export function Identicon({
  address,
  size = 28,
}: {
  address: string;
  size?: number;
}) {
  const h = hash(address.toLowerCase());
  const base = `hsl(${h % 360} 60% 50%)`;
  const fg = `hsl(${(h >>> 9) % 360} 70% 72%)`;
  const cell = size / 5;

  const rects: { x: number; y: number }[] = [];
  for (let col = 0; col < 3; col++) {
    for (let row = 0; row < 5; row++) {
      if (((h >>> (col * 5 + row)) & 1) === 1) {
        rects.push({ x: col * cell, y: row * cell });
        if (col < 2) rects.push({ x: (4 - col) * cell, y: row * cell });
      }
    }
  }

  return (
    <svg
      className={styles.icon}
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      aria-hidden
    >
      <rect width={size} height={size} rx={size * 0.24} fill={base} />
      {rects.map((r, i) => (
        <rect
          key={i}
          x={r.x}
          y={r.y}
          width={cell + 0.5}
          height={cell + 0.5}
          fill={fg}
          fillOpacity={0.92}
        />
      ))}
    </svg>
  );
}
