import { useMemo, useState } from "react";
import type { Hospital } from "@/types";
import { cx, fmtInt } from "@/utils/format";
import { hospitalRiskMeta, rankHospitals } from "@/utils/searchRanking";
import { IconPin, IconSearch } from "@/components/common/icons";

interface HospitalFinderProps {
  hospitals: Hospital[];
  query: string;
  onQueryChange: (q: string) => void;
  selectedId: string | null;
  onSelect: (hospitalId: string) => void;
  maxSuggestions?: number;
}

/**
 * Ranked hospital search for the dashboard.
 * Results are ordered by name → locality → district relevance and show the
 * locality + district explicitly so similar hospital names stay
 * distinguishable. Only a small number of results is shown until the user
 * explicitly expands the list.
 */
export default function HospitalFinder({
  hospitals,
  query,
  onQueryChange,
  selectedId,
  onSelect,
  maxSuggestions = 5,
}: HospitalFinderProps) {
  const [expanded, setExpanded] = useState(false);
  const trimmed = query.trim();
  const active = trimmed.length > 0;

  const ranked = useMemo(() => rankHospitals(hospitals, trimmed), [hospitals, trimmed]);

  const total = ranked.length;
  const visible = expanded ? ranked : ranked.slice(0, maxSuggestions);

  function choose(id: string) {
    onSelect(id);
    onQueryChange("");
    setExpanded(false);
  }

  return (
    <div className="space-y-2">
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint">
          <IconSearch width={15} height={15} />
        </span>
        <input
          value={query}
          onChange={(e) => {
            onQueryChange(e.target.value);
            setExpanded(false);
          }}
          placeholder="Search by hospital, locality or district…"
          className="input-base pl-9 pr-8"
          aria-label="Search hospitals"
        />
        {active && (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => onQueryChange("")}
            className="absolute right-2 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-md text-ink-faint hover:bg-raised hover:text-ink"
          >
            ✕
          </button>
        )}
      </div>

      {active && (
        <div className="overflow-hidden rounded-lg border border-line">
          {visible.length === 0 ? (
            <p className="muted px-3 py-4 text-center text-xs">
              No facilities match “{trimmed}”.
            </p>
          ) : (
            visible.map((h) => {
              const risk = hospitalRiskMeta(h);
              return (
                <button
                  key={h.hospital_id}
                  type="button"
                  onClick={() => choose(h.hospital_id)}
                  className={cx(
                    "block w-full border-b border-line-soft px-3 py-2 text-left transition-colors last:border-b-0 hover:bg-raised",
                    selectedId === h.hospital_id && "bg-[rgb(var(--accent))]/[0.07]",
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-xs font-semibold">{h.hospital_name}</p>
                    {risk && <span className={cx("shrink-0", risk.badgeClass)}>{risk.label}</span>}
                  </div>
                  <p className="muted mt-0.5 flex items-center gap-1 text-[11px]">
                    <IconPin width={11} height={11} className="shrink-0 text-ink-faint" />
                    <span className="truncate">
                      {[h.locality, h.district].filter(Boolean).join(", ") || "Delhi"}
                    </span>
                  </p>
                  <p className="muted tabular-nums mt-0.5 text-[10px]">
                    Beds {h.total_beds != null ? fmtInt(h.total_beds) : "—"} · ICU{" "}
                    {h.icu_beds != null ? fmtInt(h.icu_beds) : "—"} ·{" "}
                    {h.emergency ? "ER yes" : "ER no"} · {h.patient_count ?? 0} linked ·{" "}
                    {h.high_risk_predicted ?? 0} high-risk
                  </p>
                </button>
              );
            })
          )}
          {total > visible.length && (
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className="block w-full border-t border-line-soft bg-canvas/60 px-3 py-1.5 text-[10px] font-medium text-accent hover:bg-raised"
            >
              Show all {total} matches
            </button>
          )}
          {expanded && total > maxSuggestions && (
            <button
              type="button"
              onClick={() => setExpanded(false)}
              className="block w-full border-t border-line-soft bg-canvas/60 px-3 py-1.5 text-[10px] font-medium text-ink-soft hover:bg-raised"
            >
              Show top {maxSuggestions} only
            </button>
          )}
          {!expanded && total > maxSuggestions && (
            <p className="muted border-t border-line-soft px-3 py-1 text-[10px]">
              Showing best {maxSuggestions} of {total} matches
            </p>
          )}
        </div>
      )}
    </div>
  );
}
