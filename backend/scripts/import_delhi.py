"""One-time import of Urban Shadow Delhi spatial data into hospital_intelligence.

Imports ONLY:
  - delhi_grid_cells  (real 500m cell polygons from urban_shadow_v2.urban_grid_master)
  - delhi_hospitals   (real OSM healthcare POIs from urban_shadow data/raw/delhi_hospitals.gpkg)
  - delhi_boundary    (NCT Delhi boundary outline)

Source:
  Local PostgreSQL database: urban_shadow_v2

Destination:
  Neon PostgreSQL database specified by DATABASE_URL
"""

import json
import os
import sys

import geopandas as gpd
import psycopg2
from psycopg2.extras import execute_values


# ---------------------------------------------------------------------------
# DATABASE CONNECTIONS
# ---------------------------------------------------------------------------

# Local Urban Shadow source database.
US_DB = {
    "host": "localhost",
    "port": 5432,
    "dbname": "urban_shadow_v2",
    "user": "postgres",
    "password": "1234",
}

# Hospital Intelligence destination database.
# Set this in PowerShell before running the script:
#
# $env:DATABASE_URL="your-neon-connection-string"
#
HI_DB = os.environ["DATABASE_URL"]


# ---------------------------------------------------------------------------
# SOURCE FILES
# ---------------------------------------------------------------------------

HOSPITALS_GPKG = (
    r"C:\Users\nikhi\OneDrive\Desktop\coding\urban_shadow"
    r"\data\raw\delhi_hospitals.gpkg"
)

BOUNDARY_GEOJSON = (
    r"C:\Users\nikhi\OneDrive\Desktop\coding\urban_shadow"
    r"\data\raw\delhi_boundary.geojson"
)


# ---------------------------------------------------------------------------
# DELHI BOUNDS
# ---------------------------------------------------------------------------

DELHI_LAT = (27.90, 29.30)
DELHI_LNG = (76.50, 77.80)


# ---------------------------------------------------------------------------
# DESTINATION TABLE DEFINITIONS
# ---------------------------------------------------------------------------

DDL = """
CREATE TABLE IF NOT EXISTS delhi_grid_cells (
    grid_id    INTEGER PRIMARY KEY,
    center_lat DOUBLE PRECISION NOT NULL,
    center_lng DOUBLE PRECISION NOT NULL,
    boundary   JSONB NOT NULL
);

CREATE TABLE IF NOT EXISTS delhi_hospitals (
    source_element VARCHAR(16) NOT NULL,
    source_id      BIGINT NOT NULL,
    name           TEXT,
    kind           TEXT NOT NULL,
    emergency      BOOLEAN,
    beds           INTEGER,
    operator       TEXT,
    phone          TEXT,
    addr_street    TEXT,
    addr_city      TEXT,
    addr_district  TEXT,
    addr_postcode  TEXT,
    lat            DOUBLE PRECISION NOT NULL,
    lng            DOUBLE PRECISION NOT NULL,
    PRIMARY KEY (source_element, source_id)
);

CREATE TABLE IF NOT EXISTS delhi_boundary (
    id    INTEGER PRIMARY KEY DEFAULT 1,
    rings JSONB NOT NULL,
    CHECK (id = 1)
);
"""


# ---------------------------------------------------------------------------
# IMPORT GRID CELLS
# ---------------------------------------------------------------------------

def import_grids(src):
    cur = src.cursor()

    cur.execute(
        "SELECT grid_id, latitude, longitude, ST_AsGeoJSON(geom)::text "
        "FROM urban_grid_master "
        "ORDER BY grid_id"
    )

    rows = []

    for grid_id, lat, lng, geojson_text in cur.fetchall():
        coords = json.loads(geojson_text)["coordinates"][0]

        ring = [
            [round(x, 6), round(y, 6)]
            for x, y in coords[:-1]
        ]

        rows.append(
            (
                int(grid_id),
                float(lat),
                float(lng),
                json.dumps(ring),
            )
        )

    cur.close()

    return rows


# ---------------------------------------------------------------------------
# IMPORT HOSPITALS
# ---------------------------------------------------------------------------

def import_hospitals():
    frame = gpd.read_file(HOSPITALS_GPKG)

    rows = []
    skipped = 0
    seen = set()

    for _, r in frame.iterrows():
        geom = r.geometry

        if geom is None or geom.is_empty:
            skipped += 1
            continue

        point = (
            geom
            if geom.geom_type == "Point"
            else geom.representative_point()
        )

        lat = float(point.y)
        lng = float(point.x)

        if not (
            DELHI_LAT[0] <= lat <= DELHI_LAT[1]
            and DELHI_LNG[0] <= lng <= DELHI_LNG[1]
        ):
            skipped += 1
            continue

        key = (
            str(r.get("element")),
            int(r["id"]),
        )

        if key in seen:
            skipped += 1
            continue

        seen.add(key)

        def val(col):
            value = r.get(col)

            if value is None:
                return None

            if isinstance(value, float) and value != value:
                return None

            value = str(value).strip()

            return value or None

        kind = (
            val("amenity")
            or val("healthcare")
            or "facility"
        )

        beds_raw = val("beds")

        try:
            beds = (
                int(float(beds_raw))
                if beds_raw
                else None
            )
        except ValueError:
            beds = None

        emergency = val("emergency")

        emergency_bool = (
            str(emergency).lower() in ("yes", "true", "1")
            if emergency
            else None
        )

        rows.append(
            (
                key[0],
                key[1],
                val("name"),
                kind,
                emergency_bool,
                beds,
                val("operator"),
                val("phone"),
                val("addr:street"),
                val("addr:city"),
                val("addr:district"),
                val("addr:postcode"),
                round(lat, 6),
                round(lng, 6),
            )
        )

    return rows, skipped


# ---------------------------------------------------------------------------
# IMPORT DELHI BOUNDARY
# ---------------------------------------------------------------------------

def import_boundary():
    with open(
        BOUNDARY_GEOJSON,
        encoding="utf-8",
    ) as f:
        geojson = json.load(f)

    if geojson.get("type") == "FeatureCollection":
        geom = geojson["features"][0]["geometry"]
    else:
        geom = geojson

    if geom["type"] == "Polygon":
        rings = geom["coordinates"]

    elif geom["type"] == "MultiPolygon":
        rings = [
            polygon[0]
            for polygon in geom["coordinates"]
        ]

    else:
        raise ValueError(
            f"Unsupported boundary geometry: {geom['type']}"
        )

    cleaned = [
        [
            [round(x, 6), round(y, 6)]
            for x, y in ring
        ]
        for ring in rings
    ]

    return json.dumps(cleaned)


# ---------------------------------------------------------------------------
# MAIN
# ---------------------------------------------------------------------------

def main():
    print("Connecting to Urban Shadow source database...")
    src = psycopg2.connect(**US_DB)

    print("Connecting to Neon Hospital Intelligence database...")
    hi = psycopg2.connect(HI_DB)

    try:
        # Create destination tables if they don't already exist.
        with hi.cursor() as cur:
            cur.execute(DDL)

        hi.commit()

        print("Reading Delhi grid cells...")
        grid_rows = import_grids(src)

        print("Reading Delhi hospitals...")
        hospital_rows, skipped = import_hospitals()

        print("Reading Delhi boundary...")
        boundary_rings = import_boundary()

        print("Writing Delhi spatial data to Neon...")

        with hi.cursor() as cur:
            cur.execute(
                "TRUNCATE delhi_grid_cells, delhi_hospitals"
            )

            execute_values(
                cur,
                """
                INSERT INTO delhi_grid_cells
                    (grid_id, center_lat, center_lng, boundary)
                VALUES %s
                """,
                grid_rows,
                page_size=1000,
            )

            execute_values(
                cur,
                """
                INSERT INTO delhi_hospitals
                    (
                        source_element,
                        source_id,
                        name,
                        kind,
                        emergency,
                        beds,
                        operator,
                        phone,
                        addr_street,
                        addr_city,
                        addr_district,
                        addr_postcode,
                        lat,
                        lng
                    )
                VALUES %s
                """,
                hospital_rows,
                page_size=500,
            )

            cur.execute(
                """
                INSERT INTO delhi_boundary (id, rings)
                VALUES (1, %s)
                ON CONFLICT (id)
                DO UPDATE SET rings = EXCLUDED.rings
                """,
                (boundary_rings,),
            )

        hi.commit()

        # Print import summary.
        lats = [row[1] for row in grid_rows]
        lngs = [row[2] for row in grid_rows]

        named = sum(
            1
            for row in hospital_rows
            if row[2]
        )

        print()
        print("========================================")
        print("        DELHI IMPORT COMPLETE")
        print("========================================")
        print(
            f"grid cells imported : {len(grid_rows)}"
        )
        print(
            f"  lat range         : "
            f"{min(lats):.4f} .. {max(lats):.4f}"
        )
        print(
            f"  lng range         : "
            f"{min(lngs):.4f} .. {max(lngs):.4f}"
        )
        print(
            f"hospitals imported  : "
            f"{len(hospital_rows)} "
            f"({named} named, {skipped} skipped)"
        )
        print(
            "boundary rings      : "
            f"{len(json.loads(boundary_rings))}"
        )
        print("IMPORT OK")
        print("========================================")

    finally:
        src.close()
        hi.close()


if __name__ == "__main__":
    sys.exit(main())