import { useEffect, useMemo } from "react";
import { CircleMarker, LayerGroup, MapContainer, Popup, TileLayer, Tooltip, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import type { HealthGrid, Hospital } from "@/types";
import { fmtInt } from "@/utils/format";

interface HealthcareMapProps {
  hospitals?: Hospital[];
  grids?: HealthGrid[];
  showHospitals?: boolean;
  showGrids?: boolean;
  height?: number | string;
  focusZoom?: number;
}

const FALLBACK_CENTER: [number, number] = [28.62, 77.13];

function isValidCoord(lat: number | null | undefined, lng: number | null | undefined): boolean {
  return (
    lat != null &&
    lng != null &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

function RecenterOn({
  position,
  zoom,
}: {
  position: [number, number];
  zoom: number;
}) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(position, zoom, { duration: 0.8 });
  }, [position[0], position[1], zoom, map]);
  return null;
}

export default function HealthcareMap({
  hospitals = [],
  grids = [],
  showHospitals = true,
  showGrids = true,
  height = 440,
  focusZoom = 14,
}: HealthcareMapProps) {
  const focusHospital = hospitals.find(
    (h) => isValidCoord(h.latitude, h.longitude),
  );

  const center: [number, number] = focusHospital
    ? [focusHospital.latitude, focusHospital.longitude]
    : FALLBACK_CENTER;

  const locationAvailable = hospitals.length === 0 || focusHospital != null;

  const hospitalColor = "#F05A47";

  const markers = useMemo(
    () => hospitals.filter((h) => isValidCoord(h.latitude, h.longitude)),
    [hospitals],
  );

  return (
    <div className="relative z-0 overflow-hidden rounded-xl border border-line" style={{ height }}>
      {locationAvailable ? (
        <MapContainer
          center={center}
          zoom={focusZoom}
          minZoom={5}
          maxZoom={18}
          scrollWheelZoom
          doubleClickZoom
          dragging
          touchZoom
          preferCanvas
          className="h-full w-full"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <RecenterOn position={center} zoom={focusZoom} />

          {showGrids && (
            <LayerGroup>
              {grids.map((grid) => (
                <CircleMarker
                  key={grid.grid_id}
                  center={[grid.latitude, grid.longitude]}
                  radius={6}
                  pathOptions={{
                    color: "#0e7490",
                    weight: 1.5,
                    fillColor: "#22d3ee",
                    fillOpacity: 0.55,
                  }}
                >
                  <Popup className="hi-popup">
                    <div className="text-xs leading-relaxed">
                      <p className="font-semibold">{grid.grid_id}</p>
                      <p>{grid.district}</p>
                      <p>Population: {fmtInt(grid.population)}</p>
                      <p>Density: {fmtInt(grid.population_density)} /km²</p>
                      <p>Hospitals nearby: {grid.hospital_count}</p>
                    </div>
                  </Popup>
                </CircleMarker>
              ))}
            </LayerGroup>
          )}

          {showHospitals && (
            <LayerGroup>
              {markers.map((hospital) => (
                <CircleMarker
                  key={hospital.hospital_id}
                  center={[hospital.latitude, hospital.longitude]}
                  radius={9}
                  pathOptions={{
                    color: "#ffffff",
                    weight: 2,
                    fillColor: hospitalColor,
                    fillOpacity: 0.95,
                  }}
                >
                  <Tooltip direction="top" offset={[0, -6]} opacity={1}>
                    <span style={{ fontSize: 11 }}>{hospital.hospital_name}</span>
                  </Tooltip>
                  <Popup className="hi-popup">
                    <div className="min-w-[200px] space-y-1 text-xs leading-relaxed">
                      <p className="text-sm font-semibold leading-snug tracking-tight">
                        {hospital.hospital_name}
                      </p>
                      {(hospital.locality || hospital.district) && (
                        <p>
                          {[hospital.locality, hospital.district]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      )}
                      <p className="muted uppercase tracking-wide" style={{ fontSize: 10 }}>
                        {[
                          hospital.hospital_type,
                          hospital.emergency ? "emergency care" : null,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                      {hospital.address && <p>{hospital.address}</p>}
                      <p className="tabular-nums">
                        Reference beds:{" "}
                        {hospital.total_beds != null
                          ? fmtInt(hospital.total_beds)
                          : "not reported"}
                      </p>
                      <p className="tabular-nums muted" style={{ fontSize: 11 }}>
                        {hospital.latitude.toFixed(5)}, {hospital.longitude.toFixed(5)}
                      </p>
                    </div>
                  </Popup>
                </CircleMarker>
              ))}
            </LayerGroup>
          )}
        </MapContainer>
      ) : (
        <div className="flex h-full items-center justify-center bg-canvas text-sm text-ink-soft">
          Location unavailable
        </div>
      )}

      <div className="pointer-events-none absolute bottom-3 left-3 z-[1000] flex items-center gap-3 rounded-lg border border-line bg-surface/90 px-3 py-2 text-[11px] font-medium shadow-pop backdrop-blur">
        {showHospitals && (
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-red-500" />
            Hospitals
          </span>
        )}
        {showGrids && (
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-full opacity-80 bg-cyan-500" />
            Health grids
          </span>
        )}
      </div>
    </div>
  );
}
