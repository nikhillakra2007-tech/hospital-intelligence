import type { Hospital } from "@/types";

export interface RankedHospital extends Hospital {
  _rank: number;
}

/**
 * Relevance tiers (higher = better):
 *   100 exact name
 *    90 name starts with query
 *    70 a name word starts with the query
 *    60 name contains query
 *    40 locality contains query
 *    30 district contains query
 *   -1  no match (filtered out)
 */
export function relevanceScore(hospital: Hospital, rawQuery: string): number {
  const q = rawQuery.trim().toLowerCase();
  if (!q) return -1;
  const name = hospital.hospital_name.toLowerCase();
  const locality = (hospital.locality ?? "").toLowerCase();
  const district = hospital.district.toLowerCase();

  if (name === q) return 100;
  if (name.startsWith(q)) return 90;
  if (name.split(/[\s,&./-]+/).some((w) => w.startsWith(q))) return 70;
  if (name.includes(q)) return 60;
  if (locality.includes(q)) return 40;
  if (district.includes(q)) return 30;
  return -1;
}

export function rankHospitals(hospitals: Hospital[], rawQuery: string): RankedHospital[] {
  const scored: RankedHospital[] = [];
  for (const h of hospitals) {
    const score = relevanceScore(h, rawQuery);
    if (score >= 0) scored.push({ ...h, _rank: score });
  }
  return scored.sort(
    (a, b) => b._rank - a._rank || a.hospital_name.localeCompare(b.hospital_name),
  );
}

export function geoLabel(h: { locality?: string | null; district?: string | null }): string {
  return [h.locality, h.district].filter(Boolean).join(" · ");
}

/**
 * AI risk band for a hospital, derived from its live model average score.
 * Returns null when no model score is available (no linked patients).
 */
export function hospitalRiskMeta(h: {
  avg_ml_score?: number | null;
}): { label: string; badgeClass: string } | null {
  if (typeof h.avg_ml_score !== "number") return null;
  if (h.avg_ml_score >= 0.7) return { label: "High risk", badgeClass: "badge-red" };
  if (h.avg_ml_score >= 0.4) return { label: "Moderate", badgeClass: "badge-amber" };
  return { label: "Low", badgeClass: "badge-emerald" };
}
