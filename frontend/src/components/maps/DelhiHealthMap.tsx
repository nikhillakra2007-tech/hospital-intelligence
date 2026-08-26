import { useEffect, useMemo, useRef, useState } from "react";
import {
  CircleMarker,
  LayerGroup,
  MapContainer,
  Polygon,
  Popup,
  Rectangle,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import "leaflet.markercluster";
import "leaflet/dist/leaflet.css";
import type { DelhiGridCell, DelhiMapData, Hospital } from "@/types";
import { useThemeContext } from "@/components/layout/AppLayout";

export const DELHI_CENTER: [number, number] = [28.62, 77.13];
export const DELHI_ZOOM = 11;

const TILE_LIGHT = {
  url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
};

const TILE_DARK = {
  url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
};

export type HospitalRiskBand = "high" | "moderate" | "low" | "none";

export const PIN_COLORS: Record<HospitalRiskBand | "selected", string> = {
  selected: "#38BDF8",
  high: "#EF4444",
  moderate: "#F59E0B",
  low: "#8B5CF6",
  none: "#64748B",
};

/** Risk band for a hospital derived from the live model average score. */
export function hospitalRiskBand(h: {
  avg_ml_score?: number | null;
}): HospitalRiskBand {
  if (typeof h.avg_ml_score !== "number") return "none";
  if (h.avg_ml_score >= 0.7) return "high";
  if (h.avg_ml_score >= 0.4) return "moderate";
  return "low";
}

function hasCoords(h: Hospital): boolean {
  return (
    typeof h.latitude === "number" &&
    typeof h.longitude === "number" &&
    Number.isFinite(h.latitude) &&
    Number.isFinite(h.longitude)
  );
}

function ringBounds(ring: [number, number][]): [[number, number], [number, number]] {
  let minLng = 180;
  let maxLng = -180;
  let minLat = 90;
  let maxLat = -90;
  for (const [lng, lat] of ring) {
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
  }
  return [
    [minLat, minLng],
    [maxLat, maxLng],
  ];
}

interface GridLayerProps {
  cells: DelhiGridCell[];
  gridColor: string;
}

const INTERACTIVE_ZOOM = 13;
const MAX_INTERACTIVE_CELLS = 800;

function InteractiveGrid({ cells, gridColor }: GridLayerProps) {
  const map = useMapEvents({
    zoomend: () => setVersion((v) => v + 1),
    moveend: () => setVersion((v) => v + 1),
  });
  const [version, setVersion] = useState(0);

  const interactive = useMemo(() => {
    void version;
    if (map.getZoom() < INTERACTIVE_ZOOM) return [] as DelhiGridCell[];
    const bounds = map.getBounds().pad(0.25);
    const visible: DelhiGridCell[] = [];
    for (const cell of cells) {
      if (bounds.contains([cell.lat, cell.lng])) {
        visible.push(cell);
        if (visible.length >= MAX_INTERACTIVE_CELLS) break;
      }
    }
    return visible;
  }, [cells, map, version]);

  if (interactive.length === 0) return null;

  return (
    <LayerGroup>
      {interactive.map((cell) => (
        <Polygon
          key={cell.id}
          positions={cell.ring.map(([lng, lat]) => [lat, lng] as [number, number])}
          pathOptions={{
            color: gridColor,
            weight: 1,
            fillColor: gridColor,
            fillOpacity: 0.14,
          }}
        >
          <Popup className="hi-popup">
            <div className="min-w-[150px] space-y-1">
              <p className="text-xs font-semibold tracking-tight">Grid cell #{cell.id}</p>
              <p className="muted tabular-nums" style={{ fontSize: 11 }}>
                {cell.lat.toFixed(5)}, {cell.lng.toFixed(5)}
              </p>
              <p style={{ fontSize: 10 }} className="muted">
                Urban Shadow 500m cell · zoomed view
              </p>
            </div>
          </Popup>
        </Polygon>
      ))}
    </LayerGroup>
  );
}

function ResetViewControl({ onReset }: { onReset?: () => void }) {
  const map = useMap();
  return (
    <div className="leaflet-top leaflet-right">
      <button
        type="button"
        onClick={() => {
          map.flyTo(DELHI_CENTER, DELHI_ZOOM, { duration: 0.8 });
          onReset?.();
        }}
        className="hi-map-btn"
      >
        Reset view
      </button>
    </div>
  );
}

function pinIcon(band: HospitalRiskBand, selected: boolean): L.DivIcon {
  const bg = selected ? PIN_COLORS.selected : PIN_COLORS[band];
  const size = selected ? 38 : 32;
  const html = `
    <span class="${selected ? "hi-pin hi-pin-selected" : "hi-pin"}" style="--pin-bg:${bg}">
      <svg viewBox="0 0 24 24" width="13" height="13"
           stroke="#fff" stroke-width="2.6" stroke-linecap="round" fill="none">
        <line x1="12" y1="6.5" x2="12" y2="17.5"></line>
        <line x1="6.5" y1="12" x2="17.5" y2="12"></line>
      </svg>
    </span>`;
  return L.divIcon({
    className: "hi-pin-wrapper",
    html,
    iconSize: [size, size],
    iconAnchor: [size / 2, size - 2],
    popupAnchor: [0, -(size - 28)],
  });
}

type MarkerCallbacks = {
  current: { onSelect?: (id: string) => void; onViewDetails?: (id: string) => void };
};

function popupContent(h: Hospital, callbacksRef: MarkerCallbacks): HTMLElement {
  const container = document.createElement("div");
  container.className = "hi-hospital-popup";
  const geo = [h.locality, h.district].filter(Boolean).join(", ");
  const band = hospitalRiskBand(h);
  const bandLabel =
    band === "high"
      ? "High risk"
      : band === "moderate"
        ? "Moderate risk"
        : band === "low"
          ? "Low risk"
          : null;
  const bandColor = PIN_COLORS[band];
  const fmt = (v: number | null | undefined) =>
    v != null ? v.toLocaleString("en-US") : "not reported";

  const row = (label: string, value: string, valueColor?: string) =>
    `<div class="hi-pop-row"><span class="hi-pop-label">${label}</span><span class="hi-pop-value"${valueColor ? ` style="color:${valueColor}"` : ""}>${value}</span></div>`;

  container.innerHTML = `
    <p class="hi-pop-name">${h.hospital_name}</p>
    ${geo ? `<p class="hi-pop-geo">${geo}</p>` : ""}
    <p class="hi-pop-kind">${[h.hospital_type, h.emergency ? "Emergency care" : null]
      .filter(Boolean)
      .join(" · ")}</p>
    ${row("Beds", fmt(h.total_beds))}
    ${row("ICU", fmt(h.icu_beds))}
    ${row("Emergency", h.emergency ? "Yes" : "Not flagged")}
    ${row("Linked patients", String(h.patient_count ?? 0))}
    ${row("High-risk patients", String(h.high_risk_predicted ?? 0))}
    ${
      typeof h.avg_ml_score === "number"
        ? row(
            "AI risk score",
            `${h.avg_ml_score.toFixed(2)}${bandLabel ? ` · ${bandLabel}` : ""}`,
            bandColor,
          )
        : ""
    }
  `;

  if (callbacksRef.current.onViewDetails) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = "View details";
    btn.className = "btn-primary hi-pop-btn";
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      callbacksRef.current.onViewDetails?.(h.hospital_id);
    });
    container.appendChild(btn);
  }
  return container;
}

interface HospitalMarkersProps {
  hospitals: Hospital[];
  selectedId: string | null;
  focusTick: number;
  onSelect?: (hospitalId: string) => void;
  onViewDetails?: (hospitalId: string) => void;
}

/**
 * Every hospital rendered as a selectable pin inside a marker-cluster layer.
 * - Zoomed far out: clusters; clicking a cluster zooms in until individual
 *   pins appear (disableClusteringAtZoom).
 * - Pin click: selects the hospital (highlight + popup, view untouched).
 * - focusTick change: smooth zoom through any cluster to the selected pin,
 *   then opens its popup (used by search / "Focus on map").
 */
function HospitalMarkers({
  hospitals,
  selectedId,
  focusTick,
  onSelect,
  onViewDetails,
}: HospitalMarkersProps) {
  const map = useMap();
  const groupRef = useRef<L.MarkerClusterGroup | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const lastFocusTick = useRef(0);
  const selectedIdRef = useRef<string | null>(null);
  const callbacks = useRef({ onSelect, onViewDetails });
  callbacks.current = { onSelect, onViewDetails };

  const pinnable = useMemo(() => hospitals.filter(hasCoords), [hospitals]);

  // (Re)build the cluster layer whenever the hospital dataset changes.
  useEffect(() => {
    const group = L.markerClusterGroup({
      maxClusterRadius: 45,
      showCoverageOnHover: false,
      spiderfyOnMaxZoom: true,
      disableClusteringAtZoom: 14,
      zoomToBoundsOnClick: true,
      iconCreateFunction: (cluster) =>
        L.divIcon({
          html: `<span class="hi-cluster">${cluster.getChildCount()}</span>`,
          className: "hi-cluster-wrapper",
          iconSize: [36, 36],
        }),
    });

    const markers = new Map<string, L.Marker>();
    for (const h of pinnable) {
      const band = hospitalRiskBand(h);
      const marker = L.marker([h.latitude, h.longitude], {
        icon: pinIcon(band, h.hospital_id === selectedIdRef.current),
        riseOnHover: true,
      });
      marker.bindTooltip(
        `<span style="font-size:11px">${h.hospital_name}</span>`,
        { direction: "top", opacity: 1, offset: [0, -14] },
      );
      marker.bindPopup(() => popupContent(h, callbacks), {
        className: "hi-popup",
        minWidth: 230,
      });
      marker.on("click", () => callbacks.current.onSelect?.(h.hospital_id));
      group.addLayer(marker);
      markers.set(h.hospital_id, marker);
    }

    map.addLayer(group);
    groupRef.current = group;
    markersRef.current = markers;
    return () => {
      map.removeLayer(group);
      groupRef.current = null;
      markersRef.current = new Map();
    };
  }, [pinnable, map]);

  // Selection highlight + focus fly-to (only for explicit focus requests).
  useEffect(() => {
    const markers = markersRef.current;

    const previous = selectedIdRef.current;
    if (previous && previous !== selectedId) {
      const prevMarker = markers.get(previous);
      const prevHospital = pinnable.find((h) => h.hospital_id === previous);
      if (prevMarker && prevHospital) {
        prevMarker.setIcon(pinIcon(hospitalRiskBand(prevHospital), false));
      }
    }

    if (!selectedId) {
      selectedIdRef.current = null;
      return;
    }
    selectedIdRef.current = selectedId;

    const marker = markers.get(selectedId);
    const hospital = pinnable.find((h) => h.hospital_id === selectedId);
    if (!marker || !hospital) return;

    marker.setIcon(pinIcon(hospitalRiskBand(hospital), true));

    const isFocusRequest = focusTick !== lastFocusTick.current;
    lastFocusTick.current = focusTick;
    if (!isFocusRequest) return;

    const group = groupRef.current;
    if (group && typeof (group as L.MarkerClusterGroup).zoomToShowLayer === "function") {
      (group as L.MarkerClusterGroup).zoomToShowLayer(marker, () => {
        marker.openPopup();
      });
    } else {
      map.flyTo([hospital.latitude, hospital.longitude], Math.max(map.getZoom(), 14), {
        duration: 0.9,
      });
      marker.openPopup();
    }
  }, [selectedId, focusTick, pinnable, map]);

  return null;
}

export default function DelhiHealthMap({
  data,
  trackedHospitals = [],
  selectedId = null,
  focusTick = 0,
  onSelectHospital,
  onViewDetails,
  onClearSelection,
  height,
  showOtherFacilities = false,
}: {
  data: DelhiMapData;
  trackedHospitals?: Hospital[];
  selectedId?: string | null;
  focusTick?: number;
  onSelectHospital?: (hospitalId: string) => void;
  onViewDetails?: (hospitalId: string) => void;
  onClearSelection?: () => void;
  height?: number | string;
  showOtherFacilities?: boolean;
}) {
  const { theme } = useThemeContext();

  const tiles = theme === "dark" ? TILE_DARK : TILE_LIGHT;
  const gridColor = theme === "dark" ? "#818CF8" : "#4F46E5";
  const boundaryColor = theme === "dark" ? "#6366F1" : "#3730A3";
  const poiColor = theme === "dark" ? "#F59E0B" : "#D97706";

  const trackedSourceKeys = useMemo(
    () =>
      new Set(trackedHospitals.map((t) => `${t.source_element ?? ""}-${t.source_id ?? ""}`)),
    [trackedHospitals],
  );

  const otherFacilities = useMemo(
    () => data.hospitals.filter((h) => !trackedSourceKeys.has(`${h.element}-${h.id}`)),
    [data.hospitals, trackedSourceKeys],
  );

  const rects = useMemo(
    () => data.grids.map((c) => ({ id: c.id, bounds: ringBounds(c.ring) })),
    [data.grids],
  );

  return (
    <div
      className="relative z-0 h-[420px] overflow-hidden rounded-xl border border-line sm:h-[500px] xl:h-[560px]"
      style={height != null ? { height } : undefined}
    >
      <MapContainer
        center={DELHI_CENTER}
        zoom={DELHI_ZOOM}
        minZoom={10}
        maxZoom={18}
        scrollWheelZoom
        doubleClickZoom
        dragging
        touchZoom
        preferCanvas
        className="h-full w-full"
      >
        <TileLayer attribution={tiles.attribution} url={tiles.url} />

        {data.boundary_rings.map((ring, i) => (
          <Polygon
            key={`boundary-${i}`}
            positions={ring.map(([lng, lat]) => [lat, lng] as [number, number])}
            pathOptions={{
              color: boundaryColor,
              weight: 1.6,
              opacity: 0.7,
              fill: true,
              fillColor: gridColor,
              fillOpacity: theme === "dark" ? 0.02 : 0.025,
              interactive: false,
            }}
          />
        ))}

        <LayerGroup>
          {rects.map((r) => (
            <Rectangle
              key={r.id}
              bounds={r.bounds}
              pathOptions={{
                color: gridColor,
                weight: 0.4,
                opacity: theme === "dark" ? 0.3 : 0.35,
                fillColor: gridColor,
                fillOpacity: theme === "dark" ? 0.05 : 0.06,
                interactive: false,
              }}
            />
          ))}
        </LayerGroup>

        <InteractiveGrid cells={data.grids} gridColor={gridColor} />

        {showOtherFacilities && (
          <LayerGroup>
            {otherFacilities.map((f) => (
              <CircleMarker
                key={`${f.element}-${f.id}`}
                center={[f.lat, f.lng]}
                radius={3.5}
                pathOptions={{
                  color: "transparent",
                  fillColor: poiColor,
                  fillOpacity: 0.75,
                }}
              >
                <Popup className="hi-popup">
                  <div style={{ fontSize: 12 }}>
                    <p className="text-xs font-semibold">{f.name ?? "Unnamed facility"}</p>
                    <p className="muted" style={{ fontSize: 10 }}>
                      {f.kind} · Urban Shadow / OSM point
                    </p>
                    <p className="tabular-nums muted" style={{ fontSize: 11 }}>
                      {f.lat.toFixed(5)}, {f.lng.toFixed(5)}
                    </p>
                  </div>
                </Popup>
              </CircleMarker>
            ))}
          </LayerGroup>
        )}

        <HospitalMarkers
          hospitals={trackedHospitals}
          selectedId={selectedId}
          focusTick={focusTick}
          onSelect={onSelectHospital}
          onViewDetails={onViewDetails}
        />

        <ResetViewControl onReset={onClearSelection} />
      </MapContainer>

      <div className="pointer-events-none absolute bottom-3 left-3 z-[1000] space-y-1 rounded-lg border border-line bg-surface/90 px-3 py-2 text-[11px] font-medium shadow-pop backdrop-blur">
        <p className="flex items-center gap-2">
          <span className="inline-block h-3 w-3" style={{ color: PIN_COLORS.selected }}>
            <svg viewBox="0 0 24 24" width={12} height={12} fill="currentColor">
              <path d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7z" />
            </svg>
          </span>
          Selected hospital
        </p>
        <p className="flex items-center gap-2">
          <span
            className="inline-block h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: PIN_COLORS.high }}
          />
          High risk (AI ≥ 0.70)
        </p>
        <p className="flex items-center gap-2">
          <span
            className="inline-block h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: PIN_COLORS.moderate }}
          />
          Moderate risk (0.40–0.69)
        </p>
        <p className="flex items-center gap-2">
          <span
            className="inline-block h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: PIN_COLORS.low }}
          />
          Low risk (&lt; 0.40)
        </p>
        <p className="flex items-center gap-2">
          <span
            className="inline-block h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: PIN_COLORS.none }}
          />
          No linked patients
        </p>
        <p className="flex items-center gap-2">
          <span className="inline-grid h-4 w-4 place-items-center rounded-full bg-[#6366F1]/85 text-[9px] font-bold text-white">
            n
          </span>
          Cluster (click to zoom)
        </p>
      </div>

      <div className="pointer-events-none absolute right-3 top-3 z-[1000] mr-24 hidden rounded-lg border border-line bg-surface/90 px-2.5 py-1 text-[10px] font-medium tracking-wide text-ink-soft shadow-pop backdrop-blur sm:block">
        Spatial data: Urban Shadow · facilities © OpenStreetMap
      </div>

      <div className="pointer-events-none absolute bottom-3 right-3 z-[1000] rounded-lg border border-line bg-surface/90 px-2.5 py-1 text-[10px] text-ink-soft shadow-pop backdrop-blur">
        Click a pin for details · scroll to zoom · drag to pan
      </div>
    </div>
  );
}
