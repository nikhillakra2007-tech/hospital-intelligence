import type { RiskCategory } from "@/types";

export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

export function fmtInt(value: number | null | undefined): string {
  return value == null ? "–" : value.toLocaleString("en-US");
}

export function fmtPct(value: number | null | undefined, digits = 1): string {
  return value == null ? "–" : `${value.toFixed(digits)}%`;
}

export function fmtScore(value: number | null | undefined): string {
  return value == null ? "–" : value.toFixed(2);
}

export function fmtDate(iso: string | null | undefined): string {
  return iso ?? "–";
}

export function fmtCoord(value: number | null | undefined): string {
  return value == null ? "–" : value.toFixed(4);
}

export type OccupancyTone = "ok" | "warn" | "high";

export function occupancyTone(pct: number): OccupancyTone {
  if (pct >= 90) return "high";
  if (pct >= 75) return "warn";
  return "ok";
}

export const toneBarClass: Record<OccupancyTone, string> = {
  ok: "bg-emerald-500",
  warn: "bg-amber-400",
  high: "bg-red-500",
};

const RISK_BADGE_CLASS: Record<RiskCategory, string> = {
  Low: "badge-emerald",
  Moderate: "badge-amber",
  High: "badge-red",
};

export function riskBadgeClass(category: RiskCategory): string {
  return RISK_BADGE_CLASS[category] ?? "badge-slate";
}

export interface AqiBand {
  label: string;
  badgeClass: string;
  dotClass: string;
}

export function aqiBand(aqi: number | null | undefined): AqiBand {
  if (aqi == null)
    return { label: "No data", badgeClass: "badge-slate", dotClass: "bg-ink-faint" };
  if (aqi <= 50)
    return { label: "Good", badgeClass: "badge-emerald", dotClass: "bg-emerald-500" };
  if (aqi <= 100)
    return { label: "Moderate", badgeClass: "badge-amber", dotClass: "bg-amber-400" };
  if (aqi <= 150)
    return { label: "Poor", badgeClass: "badge-red", dotClass: "bg-orange-400" };
  return { label: "Severe", badgeClass: "badge-red", dotClass: "bg-red-500" };
}

export const HOSPITAL_TYPE_BADGE_CLASS: Record<string, string> = {
  Government: "badge-sky",
  Private: "badge-violet",
  Specialty: "badge-red",
  Teaching: "badge-amber",
};
