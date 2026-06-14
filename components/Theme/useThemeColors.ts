"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

// CSS custom properties change on the document when the theme flips, but React
// doesn't know about it. recharts (and other JS-colored canvases) need concrete
// color strings for some props, so we read the computed values and re-read them
// whenever the resolved theme changes.
const VARS = [
  "--success",
  "--danger",
  "--accent",
  "--accent-hover",
  "--info",
  "--warning",
  "--foreground",
  "--muted",
  "--border",
  "--bg",
  "--elevated",
] as const;

type ThemeColors = Partial<Record<(typeof VARS)[number], string>>;

export function useThemeColors(): ThemeColors {
  const { resolvedTheme } = useTheme();
  const [colors, setColors] = useState<ThemeColors>({});

  useEffect(() => {
    const cs = getComputedStyle(document.documentElement);
    const next: ThemeColors = {};
    for (const v of VARS) {
      next[v] = cs.getPropertyValue(v).trim();
    }
    setColors(next);
  }, [resolvedTheme]);

  return colors;
}
