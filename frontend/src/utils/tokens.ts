import type { Theme } from "@/components/layout/AppLayout";

/**
 * Centralized semantic chart palette (Japanese-inspired healthcare).
 *
 * Semantic mapping:
 *   riskLow      -> Jade        #10B981
 *   riskModerate -> Amber/Gold  #F59E0B
 *   riskHigh     -> Vermilion   #F05A47
 *   hospital     -> Indigo      #4F46E5 (+ deep #3730A3, lav #8B5CF6)
 *   secondary    -> Sakura      #EC4899
 *   environment  -> Cyan        #06B6D4 (+ Sky #38BDF8)
 *
 * Concrete hex values are resolved per theme because SVG presentation
 * attributes (fill=/stroke=) cannot resolve CSS var() references.
 */
export interface ChartPalette {
  primary: string;
  primaryDeep: string;
  secondary: string;
  tertiary: string;
  environment: string;
  sky: string;
  riskLow: string;
  riskModerate: string;
  riskHigh: string;
  gold: string;
  axisText: string;
  gridLine: string;
  cursorFill: string;
  tooltipBg: string;
  tooltipBorder: string;
  tooltipText: string;
}

interface PaletteNeutral {
  axisText: string;
  gridLine: string;
  cursorFill: string;
  tooltipBg: string;
  tooltipBorder: string;
  tooltipText: string;
}

const NEUTRALS: Record<Theme, PaletteNeutral> = {
  dark: {
    axisText: "#9AA3BC",
    gridLine: "#2B3152",
    cursorFill: "rgba(139, 143, 178, 0.10)",
    tooltipBg: "#191D31",
    tooltipBorder: "#3B4368",
    tooltipText: "#ECE9DF",
  },
  light: {
    axisText: "#6E6C60",
    gridLine: "#E8E2D4",
    cursorFill: "rgba(120, 116, 100, 0.08)",
    tooltipBg: "#FDFCF9",
    tooltipBorder: "#E1DBCB",
    tooltipText: "#2D2F3E",
  },
};

export function chartPalette(theme: Theme): ChartPalette {
  return {
    primary: "#4F46E5",
    primaryDeep: "#3730A3",
    secondary: "#EC4899",
    tertiary: "#8B5CF6",
    environment: "#06B6D4",
    sky: "#38BDF8",
    riskLow: "#10B981",
    riskModerate: "#F59E0B",
    riskHigh: "#F05A47",
    gold: "#EAB308",
    ...NEUTRALS[theme],
  };
}

export function tooltipStyle(p: ChartPalette) {
  return {
    backgroundColor: p.tooltipBg,
    border: `1px solid ${p.tooltipBorder}`,
    borderRadius: 10,
    fontSize: 12,
    color: p.tooltipText,
    boxShadow: "0 8px 24px -12px rgb(15 23 42 / 0.35)",
  };
}

export function axisTick(p: ChartPalette) {
  return { fontSize: 11, fill: p.axisText };
}
