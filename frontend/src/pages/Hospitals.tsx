import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import PageHeader from "@/components/common/PageHeader";
import HospitalDetailModal from "@/components/hospitals/HospitalDetailModal";
import { EmptyState, ErrorState, LoadingState } from "@/components/common/states";
import { IconChevronRight, IconSearch } from "@/components/common/icons";
import { useApi } from "@/hooks/useApi";
import { getHospitalCapacity, getHospitals } from "@/services/api";
import type { Hospital } from "@/types";
import {
  HOSPITAL_TYPE_BADGE_CLASS,
  cx,
  fmtInt,
} from "@/utils/format";
import { geoLabel, rankHospitals } from "@/utils/searchRanking";

const PAGE_SIZE = 24;
const MAX_SUGGESTIONS = 8;

export default function Hospitals() {
  const facilities = useApi(() => getHospitals({ limit: 1000 }), []);
  const capacity = useApi(getHospitalCapacity, []);

  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [district, setDistrict] = useState("all");
  const [type, setType] = useState("all");
  const [mode, setMode] = useState<"search" | "browse">("search");
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<Hospital | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 200);
    return () => clearTimeout(t);
  }, [query]);

  const countsById = useMemo(
    () => new Map((capacity.data ?? []).map((c) => [c.hospital_id, c])),
    [capacity.data],
  );

  const districts = useMemo(
    () => Array.from(new Set((facilities.data ?? []).map((h) => h.district))).sort(),
    [facilities.data],
  );
  const types = useMemo(
    () => Array.from(new Set((facilities.data ?? []).map((h) => h.hospital_type))).sort(),
    [facilities.data],
  );

  const baseFiltered = useMemo(
    () =>
      (facilities.data ?? []).filter((h) => {
        if (district !== "all" && h.district !== district) return false;
        if (type !== "all" && h.hospital_type !== type) return false;
        return true;
      }),
    [facilities.data, district, type],
  );

  const rankedResults = useMemo(() => {
    if (!debouncedQuery.trim()) return [];
    return rankHospitals(baseFiltered, debouncedQuery);
  }, [baseFiltered, debouncedQuery]);

  const suggestions = rankedResults.slice(0, MAX_SUGGESTIONS);
  const searchActive = mode === "search" && debouncedQuery.trim().length > 0;

  const enrichedBrowse = useMemo(
    () =>
      baseFiltered.map((f) => ({
        ...f,
        patient_count: countsById.get(f.hospital_id)?.patient_count ?? 0,
        high_risk_count: countsById.get(f.hospital_id)?.high_risk_count ?? 0,
      })),
    [baseFiltered, countsById],
  );

  const browseRows = useMemo(() => {
    if (mode !== "browse") return [];
    if (!debouncedQuery.trim()) return enrichedBrowse;
    const q = debouncedQuery.trim().toLowerCase();
    return baseFiltered.filter(
      (h) =>
        (h.hospital_name ?? "").toLowerCase().includes(q) ||
        (h.locality ?? "").toLowerCase().includes(q),
    );
  }, [mode, debouncedQuery, baseFiltered, enrichedBrowse]);

  const pageCount = Math.max(1, Math.ceil(browseRows.length / PAGE_SIZE));
  const effectivePage = Math.min(page, pageCount - 1);
  const pageRows = browseRows.slice(
    effectivePage * PAGE_SIZE,
    effectivePage * PAGE_SIZE + PAGE_SIZE,
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Hospitals"
        subtitle="Delhi healthcare facilities - capacity is OSM-reported reference data"
        actions={
          !facilities.loading && facilities.data ? (
            <span className="badge-slate">{fmtInt(facilities.data.length)} facilities</span>
          ) : undefined
        }
      />

      <div className="card card-pad grid gap-3 sm:grid-cols-[1fr_auto_auto]">
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint">
            <IconSearch width={15} height={15} />
          </span>
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(0);
              if (mode !== "search") setMode("search");
            }}
            onFocus={() => setMode("search")}
            placeholder="Search hospitals by name or locality..."
            className="input-base pl-9"
          />
        </div>
        <select
          value={district}
          onChange={(e) => {
            setDistrict(e.target.value);
            setPage(0);
          }}
          className="input-base sm:w-48"
        >
          <option value="all">All districts</option>
          {districts.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
        <select
          value={type}
          onChange={(e) => {
            setType(e.target.value);
            setPage(0);
          }}
          className="input-base sm:w-40"
        >
          <option value="all">All types</option>
          {types.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      {searchActive && (
        <div className="card overflow-hidden">
          {rankedResults.length === 0 ? (
            <p className="muted px-4 py-5 text-center text-xs">
              No facilities match "{debouncedQuery.trim()}".
            </p>
          ) : (
            <>
              {suggestions.map((h) => (
                <button
                  key={h.hospital_id}
                  type="button"
                  onClick={() => setSelected(h)}
                  className={cx(
                    "block w-full border-b border-line-soft px-4 py-2.5 text-left transition-colors last:border-b-0 hover:bg-raised",
                    selected?.hospital_id === h.hospital_id &&
                      "bg-[rgb(var(--accent))]/[0.06]",
                  )}
                >
                  <p className="truncate text-xs font-medium">{h.hospital_name}</p>
                  <p className="muted truncate text-[10px] uppercase tracking-wide">
                    {geoLabel(h)}
                    {h.emergency ? " - ER" : ""}
                  </p>
                </button>
              ))}
              <div className="flex items-center justify-between border-t border-line-soft px-4 py-2">
                <p className="muted text-[10px]">
                  Showing {suggestions.length} of {rankedResults.length} matches
                </p>
                <button
                  type="button"
                  onClick={() => setMode("browse")}
                  className="text-accent text-[11px] font-medium hover:underline"
                >
                  View all results
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {facilities.error ? (
        <ErrorState message={facilities.error} onRetry={facilities.refetch} />
      ) : !facilities.data ? (
        <LoadingState rows={6} label="Loading Delhi facilities..." />
      ) : null}

      {selected && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="card card-pad flex flex-wrap items-center justify-between gap-3 border-l-4 border-[rgb(var(--accent))]"
        >
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{selected.hospital_name}</p>
            <p className="muted truncate text-xs">{geoLabel(selected)}</p>
          </div>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs">
            <span>
              <span className="muted">Beds: </span>
              <span className="tabular-nums font-medium">
                {selected.total_beds != null ? fmtInt(selected.total_beds) : "Not reported"}
              </span>
            </span>
            <span>
              <span className="muted">ICU: </span>
              <span className="tabular-nums font-medium">
                {selected.icu_beds != null ? fmtInt(selected.icu_beds) : "Not reported"}
              </span>
            </span>
            <span>
              <span className="muted">Emergency: </span>
              <span className="font-medium">{selected.emergency ? "Yes" : "Not flagged"}</span>
            </span>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="btn-ghost h-8 text-xs"
            >
              Clear
            </button>
          </div>
        </motion.div>
      )}

      {/* browse mode */}
      {mode === "browse" && (
        <>
          {browseRows.length === 0 ? (
            <EmptyState title="No facilities match" message="Adjust the search or filters." />
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table min-w-[720px]">
                <thead>
                  <tr>
                    <th>Hospital</th>
                    <th>Locality · District</th>
                    <th>Type</th>
                    <th>Reference beds</th>
                    <th>ICU</th>
                    <th>Emergency</th>
                    <th>Linked patients</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((hospital) => (
                    <tr
                      key={hospital.hospital_id}
                      onClick={() => setSelected(hospital)}
                      className="cursor-pointer"
                    >
                      <td className="max-w-[260px] truncate font-medium">
                        {hospital.hospital_name}
                      </td>
                      <td className="muted max-w-[180px] truncate text-xs">{geoLabel(hospital)}</td>
                      <td>
                        <span
                          className={cx(
                            HOSPITAL_TYPE_BADGE_CLASS[hospital.hospital_type] ?? "badge-slate",
                          )}
                        >
                          {hospital.hospital_type}
                        </span>
                      </td>
                      <td className="tabular-nums">
                        {hospital.total_beds != null ? fmtInt(hospital.total_beds) : "—"}
                      </td>
                      <td className="tabular-nums">
                        {hospital.icu_beds != null ? fmtInt(hospital.icu_beds) : "—"}
                      </td>
                      <td>{hospital.emergency ? "Yes" : "—"}</td>
                      <td className="tabular-nums">{hospital.patient_count}</td>
                      <td>
                        <span className="text-accent flex items-center gap-1 text-xs font-medium">
                          Details <IconChevronRight width={13} height={13} />
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex items-center justify-between">
            <p className="muted text-xs">
              Page {effectivePage + 1} of {pageCount}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={effectivePage === 0}
                className="btn-ghost h-8 text-xs"
              >
                Previous
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
                disabled={effectivePage >= pageCount - 1}
                className="btn-ghost h-8 text-xs"
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}

      <HospitalDetailModal hospital={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
