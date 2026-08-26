"""Delhi entity migration for Hospital Intelligence.

Replaces the fictional facility layer with REAL Delhi hospitals sourced from
the imported Urban Shadow OSM dataset (delhi_hospitals). Synthetic patients are
associated with prominent real facilities. Health grid zones are re-anchored to
real Delhi coordinates with real districts and real facility counts.

Idempotent: safe to run multiple times.
Run:  .venv/Scripts/python.exe scripts/apply_delhi_migration.py
"""

import psycopg

DB = dict(host="localhost", port=5432, dbname="hospital_intelligence", user="postgres", password="1234")

DDL = """
ALTER TABLE hospitals ALTER COLUMN total_beds DROP NOT NULL;
ALTER TABLE hospitals ALTER COLUMN icu_beds DROP NOT NULL;
ALTER TABLE hospitals ALTER COLUMN emergency_beds DROP NOT NULL;
ALTER TABLE hospitals ALTER COLUMN hospital_type TYPE VARCHAR(30);
ALTER TABLE hospitals DROP CONSTRAINT IF EXISTS hospitals_hospital_type_check;
ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS locality VARCHAR(120);
ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS emergency BOOLEAN;
ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS operator TEXT;
ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS beds_reported BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS capacity_status VARCHAR(20) NOT NULL DEFAULT 'unavailable';
ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS source_element VARCHAR(16);
ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS source_id BIGINT;

ALTER TABLE patients ADD COLUMN IF NOT EXISTS hospital_id VARCHAR(10);
ALTER TABLE patients DROP CONSTRAINT IF EXISTS fk_patients_hospital;

TRUNCATE hospital_operations;
TRUNCATE hospitals CASCADE;

ALTER TABLE hospitals ADD CONSTRAINT hospitals_hospital_type_check
    CHECK (hospital_type IN ('Government', 'Private', 'Trust', 'Unknown'));
"""

INSERT_HOSPITALS = """
WITH candidates AS (
    SELECT source_element AS element,
           source_id      AS id,
           trim(name)     AS name,
           beds, emergency, operator, phone,
           addr_street,
           NULLIF(addr_city, '') AS addr_city,
           NULLIF(addr_district, '') AS addr_district_raw,
           lat, lng,
           (emergency IS TRUE OR beds IS NOT NULL OR operator IS NOT NULL) AS prominent,
           ROW_NUMBER() OVER (PARTITION BY lower(trim(name))
                              ORDER BY (emergency IS TRUE) DESC NULLS LAST,
                                       (beds IS NOT NULL) DESC NULLS LAST, source_id) AS dedupe_rn
    FROM delhi_hospitals
    WHERE kind = 'hospital'
      AND name IS NOT NULL
      AND lat BETWEEN 28.30 AND 29.00
      AND lng BETWEEN 76.60 AND 77.60
),
typed AS (
    SELECT *,
        CASE
            WHEN (COALESCE(operator, '') || ' ' || name) ILIKE ANY (ARRAY[
                '%govt%', '%government%', '%municipal%', '%mcd%', '%ndmc%',
                '%cantonn%', '%esi%', '%aiims%', '%safdarjung%', '%lok nayak%',
                '%ram manohar%', '%lady hardinge%', '%kalawati%', '%deen dayal%',
                '%g b pant%', '%gtb%', '%guru tegh bahadur%', '%ambedkar%',
                '%jaipur golden%', '%babu jagjivan%'])
                THEN 'Government'
            WHEN operator IS NOT NULL THEN 'Private'
            ELSE 'Unknown'
        END AS htype,
        CASE COALESCE(NULLIF(addr_district_raw, ''), '')
            WHEN 'Central'    THEN 'Central Delhi'
            WHEN 'North West' THEN 'North West Delhi'
            WHEN 'South East' THEN 'South East Delhi'
            WHEN 'South West' THEN 'South West Delhi'
            WHEN 'West'       THEN 'West Delhi'
            WHEN 'East'       THEN 'East Delhi'
            WHEN 'North'      THEN 'North Delhi'
            WHEN 'South'      THEN 'South Delhi'
            WHEN ''           THEN 'Delhi'
            ELSE NULLIF(addr_district_raw, '')
        END AS district_norm
    FROM candidates
    WHERE dedupe_rn = 1
),
ranked AS (
    SELECT *, ROW_NUMBER() OVER (ORDER BY prominent DESC NULLS LAST, name) AS rn
    FROM typed
)
INSERT INTO hospitals (hospital_id, hospital_name, district, locality, address, latitude, longitude,
                       hospital_type, total_beds, icu_beds, emergency_beds, emergency, beds_reported,
                       operator, phone, capacity_status, source_element, source_id)
SELECT
    'H' || LPAD(rn::text, 3, '0'),
    name,
    district_norm,
    addr_city,
    addr_street,
    lat,
    lng,
    htype,
    beds,
    NULL,
    NULL,
    emergency,
    beds IS NOT NULL,
    operator,
    phone,
    CASE WHEN beds IS NOT NULL THEN 'osm_reported' ELSE 'unavailable' END,
    element,
    id
FROM ranked
"""


def run():
    conn = psycopg.connect(**DB)
    cur = conn.cursor()
    cur.execute(DDL)

    cur.execute("TRUNCATE hospital_operations")
    cur.execute("TRUNCATE hospitals CASCADE")
    cur.execute(INSERT_HOSPITALS)
    cur.execute("SELECT COUNT(*) FROM hospitals")
    n_hospitals = cur.fetchone()[0]

    # every synthetic patient -> one prominent real facility (round-robin), district follows facility
    cur.execute(
        """
        WITH feat AS (
            SELECT hospital_id, district,
                   ROW_NUMBER() OVER (ORDER BY hospital_id) AS hrn
            FROM hospitals
            WHERE lower(hospital_name) LIKE '%hospital%'
        ),
        cnt AS (SELECT COUNT(*)::int AS c FROM feat),
        p AS (
            SELECT patient_id, ROW_NUMBER() OVER (ORDER BY patient_id) AS prn
            FROM patients
        )
        UPDATE patients pa
        SET hospital_id = f.hospital_id,
            district = f.district
        FROM p
        JOIN cnt ON TRUE
        JOIN feat f ON ((p.prn - 1) % cnt.c) + 1 = f.hrn
        WHERE pa.patient_id = p.patient_id;
        """
    )

    cur.execute(
        "ALTER TABLE patients ADD CONSTRAINT fk_patients_hospital "
        "FOREIGN KEY (hospital_id) REFERENCES hospitals(hospital_id)"
    )

    # re-anchor the 24 health-grid zones onto real Delhi cells + real districts + real counts
    cur.execute(
        """
        WITH sample AS (
            SELECT grid_id, latitude, longitude,
                   ROW_NUMBER() OVER (ORDER BY grid_id) rn
            FROM (
                SELECT grid_id, center_lat AS latitude, center_lng AS longitude
                FROM delhi_grid_cells
                WHERE grid_id % 257 = 0
                ORDER BY grid_id
                LIMIT 24
            ) s
        ),
        dist AS (
            SELECT district AS d,
                   ROW_NUMBER() OVER (ORDER BY COUNT(*) DESC) drn,
                   COUNT(*) OVER () AS dn
            FROM hospitals
            GROUP BY district
        )
        UPDATE health_grids g
        SET latitude = s.latitude,
            longitude = s.longitude,
            district = dd.d,
            hospital_count = (
                SELECT COUNT(*) FROM hospitals h
                WHERE h.latitude  BETWEEN s.latitude  - 0.009  AND s.latitude  + 0.009
                  AND h.longitude BETWEEN s.longitude - 0.0094 AND s.longitude + 0.0094
            ),
            nearest_hospital_distance_km = ROUND((
                SELECT MIN(111.32 * SQRT(
                    POWER(h.longitude - s.longitude, 2) * POWER(COS(RADIANS(s.latitude)), 2)
                    + POWER(h.latitude - s.latitude, 2)))
                FROM hospitals h
            )::numeric, 1)
        FROM sample s
        CROSS JOIN dist dd
        WHERE dd.drn = ((s.rn - 1) % dd.dn) + 1
          AND g.grid_id = 'G' || LPAD(s.rn::text, 3, '0');
        """
    )

    conn.commit()

    checks = {}
    cur.execute("SELECT COUNT(*) FROM hospitals WHERE hospital_name ~* 'silverwood|lakeview|old town|arambagh|harbour east|maple ridge'")
    checks["fictional_names_left"] = cur.fetchone()[0]
    cur.execute("SELECT COUNT(*) FROM hospitals WHERE district ~* 'silverwood|lakeview|old town|arambagh|harbour east|maple ridge'")
    checks["fictional_districts_left"] = cur.fetchone()[0]
    cur.execute("SELECT COUNT(*) FROM patients WHERE hospital_id IS NULL")
    checks["patients_without_hospital"] = cur.fetchone()[0]
    cur.execute("SELECT COUNT(*) FROM patients p JOIN hospitals h USING (hospital_id)")
    checks["valid_patient_links"] = cur.fetchone()[0]
    cur.execute("SELECT COUNT(*) FROM patients WHERE district ~* 'silverwood|lakeview|old town|arambagh'")
    checks["patients_on_fictional_district"] = cur.fetchone()[0]
    cur.execute("SELECT COUNT(*) FROM hospitals WHERE total_beds IS NOT NULL")
    checks["hospitals_reporting_beds"] = cur.fetchone()[0]
    cur.execute("SELECT COUNT(DISTINCT district) FROM hospitals")
    checks["distinct_districts"] = cur.fetchone()[0]
    cur.execute("SELECT COUNT(*) FROM health_grids WHERE latitude BETWEEN 28.3 AND 29.0")
    checks["grids_on_delhi_coords"] = cur.fetchone()[0]
    conn.commit()

    print("hospitals imported:", n_hospitals)
    for k, v in checks.items():
        print(f"{k}: {v}")
    ok = (
        checks["fictional_names_left"] == 0
        and checks["fictional_districts_left"] == 0
        and checks["patients_without_hospital"] == 0
        and checks["patients_on_fictional_district"] == 0
        and checks["grids_on_delhi_coords"] == 24
    )
    print("MIGRATION", "OK" if ok else "FAILED")


if __name__ == "__main__":
    run()
