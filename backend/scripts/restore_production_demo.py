import os
import re
import psycopg


SEED_FILE = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
    "database",
    "seed.sql",
)


def extract_insert(sql: str, table: str) -> list[str]:
    pattern = re.compile(
        rf"INSERT INTO\s+{re.escape(table)}\s*\([^;]+?;\s*",
        re.IGNORECASE | re.DOTALL,
    )
    return pattern.findall(sql)


def combine_inserts(sql: str, table: str) -> str:
    statements = extract_insert(sql, table)

    if not statements:
        raise RuntimeError(f"No INSERT statements found for {table}")

    # Combine multiple INSERT blocks into one statement.
    first = statements[0]
    prefix, values_part = first.split("VALUES", 1)

    values = []

    for statement in statements:
        _, vp = statement.split("VALUES", 1)
        vp = vp.strip()

        if vp.endswith(";"):
            vp = vp[:-1]

        values.append(vp)

    return prefix + "VALUES\n" + ",\n".join(
        v.strip().rstrip(",") for v in values
    ) + ";"


def main():
    database_url = os.environ.get("DATABASE_URL")

    if not database_url:
        raise RuntimeError("DATABASE_URL environment variable is not set.")

    with open(SEED_FILE, "r", encoding="utf-8") as f:
        seed_sql = f.read()

    health_grids_sql = combine_inserts(seed_sql, "health_grids")
    patients_sql = combine_inserts(seed_sql, "patients")
    environmental_sql = combine_inserts(seed_sql, "environmental_data")
    risk_sql = combine_inserts(seed_sql, "risk_assessments")

    print("Connecting to production PostgreSQL...")
    conn = psycopg.connect(database_url)

    try:
        with conn.cursor() as cur:

            # ---------------------------------------------------------
            # SAFETY CHECK
            # ---------------------------------------------------------
            cur.execute("SELECT COUNT(*) FROM hospitals")
            hospital_count = cur.fetchone()[0]

            if hospital_count < 600:
                raise RuntimeError(
                    f"SAFETY STOP: expected the real Delhi hospital layer "
                    f"to contain ~663 hospitals, found {hospital_count}."
                )

            print(f"Preserving {hospital_count} existing hospitals.")

            # ---------------------------------------------------------
            # RESTORE SUPPORTING DEMO DATA
            # ---------------------------------------------------------
            #
            # We deliberately DO NOT touch hospitals.
            #
            # These are synthetic demonstration datasets from seed.sql.
            #

            cur.execute("TRUNCATE risk_assessments, environmental_data CASCADE")
            cur.execute("TRUNCATE patients CASCADE")
            cur.execute("TRUNCATE health_grids CASCADE")

            print("Restoring health grids...")
            cur.execute(health_grids_sql)

            print("Restoring synthetic patients...")
            cur.execute(patients_sql)

            print("Restoring environmental measurements...")
            cur.execute(environmental_sql)

            print("Restoring risk assessments...")
            cur.execute(risk_sql)

            # ---------------------------------------------------------
            # LINK PATIENTS TO REAL DELHI HOSPITALS
            # ---------------------------------------------------------
            #
            # Patient data remains synthetic.
            # Hospitals remain real Delhi facilities.
            #
            # Each synthetic patient is assigned round-robin to a
            # prominent real hospital.
            #

            cur.execute(
                """
                UPDATE patients
                SET hospital_id = NULL
                """
            )

            cur.execute(
                """
                WITH hospitals_ranked AS (
                    SELECT
                        hospital_id,
                        district,
                        ROW_NUMBER() OVER (
                            ORDER BY
                                (total_beds IS NOT NULL) DESC,
                                hospital_name
                        ) AS rn
                    FROM hospitals
                    WHERE LOWER(hospital_name) LIKE '%hospital%'
                ),
                hospital_count AS (
                    SELECT COUNT(*)::int AS total
                    FROM hospitals_ranked
                ),
                patients_ranked AS (
                    SELECT
                        patient_id,
                        ROW_NUMBER() OVER (
                            ORDER BY patient_id
                        ) AS rn
                    FROM patients
                )
                UPDATE patients p
                SET
                    hospital_id = h.hospital_id,
                    district = h.district
                FROM patients_ranked pr
                JOIN hospital_count hc ON TRUE
                JOIN hospitals_ranked h
                  ON h.rn = ((pr.rn - 1) % hc.total) + 1
                WHERE p.patient_id = pr.patient_id;
                """
            )

            # ---------------------------------------------------------
            # RE-ANCHOR HEALTH GRIDS TO REAL DELHI COORDINATES
            # ---------------------------------------------------------
            #
            # The seed contains 24 synthetic grid records.
            # We retain their synthetic population/environmental values,
            # but replace the fictional geography with real Delhi
            # spatial cells.
            #

            cur.execute(
                """
                WITH sample AS (
                    SELECT
                        grid_id,
                        center_lat AS latitude,
                        center_lng AS longitude,
                        ROW_NUMBER() OVER (ORDER BY grid_id) AS rn
                    FROM (
                        SELECT
                            grid_id,
                            center_lat,
                            center_lng
                        FROM delhi_grid_cells
                        WHERE grid_id % 257 = 0
                        ORDER BY grid_id
                        LIMIT 24
                    ) s
                ),
                dist AS (
                    SELECT
                        district AS d,
                        ROW_NUMBER() OVER (
                            ORDER BY COUNT(*) DESC
                        ) AS drn,
                        COUNT(*) OVER () AS dn
                    FROM hospitals
                    GROUP BY district
                )
                UPDATE health_grids g
                SET
                    latitude = s.latitude,
                    longitude = s.longitude,
                    district = dd.d,
                    hospital_count = (
                        SELECT COUNT(*)
                        FROM hospitals h
                        WHERE h.latitude BETWEEN s.latitude - 0.009
                                             AND s.latitude + 0.009
                          AND h.longitude BETWEEN s.longitude - 0.0094
                                              AND s.longitude + 0.0094
                    ),
                    nearest_hospital_distance_km = ROUND(
                        (
                            SELECT MIN(
                                111.32 * SQRT(
                                    POWER(
                                        h.longitude - s.longitude,
                                        2
                                    ) *
                                    POWER(
                                        COS(RADIANS(s.latitude)),
                                        2
                                    )
                                    +
                                    POWER(
                                        h.latitude - s.latitude,
                                        2
                                    )
                                )
                            )
                            FROM hospitals h
                        )::numeric,
                        1
                    )
                FROM sample s
                CROSS JOIN dist dd
                WHERE dd.drn = ((s.rn - 1) % dd.dn) + 1
                  AND g.grid_id = 'G' || LPAD(s.rn::text, 3, '0');
                """
            )

            conn.commit()

            # ---------------------------------------------------------
            # VERIFICATION
            # ---------------------------------------------------------

            checks = {}

            cur.execute("SELECT COUNT(*) FROM hospitals")
            checks["hospitals"] = cur.fetchone()[0]

            cur.execute("SELECT COUNT(*) FROM patients")
            checks["patients"] = cur.fetchone()[0]

            cur.execute("SELECT COUNT(*) FROM health_grids")
            checks["health_grids"] = cur.fetchone()[0]

            cur.execute("SELECT COUNT(*) FROM environmental_data")
            checks["environmental_data"] = cur.fetchone()[0]

            cur.execute("SELECT COUNT(*) FROM risk_assessments")
            checks["risk_assessments"] = cur.fetchone()[0]

            cur.execute(
                """
                SELECT COUNT(*)
                FROM patients
                WHERE hospital_id IS NOT NULL
                """
            )
            checks["patients_linked"] = cur.fetchone()[0]

            cur.execute(
                """
                SELECT COUNT(*)
                FROM health_grids
                WHERE latitude BETWEEN 28.3 AND 29.0
                  AND longitude BETWEEN 76.6 AND 77.6
                """
            )
            checks["grids_on_delhi_coordinates"] = cur.fetchone()[0]

            print()
            print("========================================")
            print("PRODUCTION RESTORE COMPLETE")
            print("========================================")

            for key, value in checks.items():
                print(f"{key}: {value}")

            print("========================================")

            if (
                checks["hospitals"] >= 600
                and checks["patients"] == 50
                and checks["health_grids"] == 24
                and checks["environmental_data"] > 0
                and checks["risk_assessments"] == 80
                and checks["patients_linked"] == 50
                and checks["grids_on_delhi_coordinates"] == 24
            ):
                print("STATUS: OK")
            else:
                print("STATUS: CHECK REQUIRED")

    except Exception:
        conn.rollback()
        raise

    finally:
        conn.close()


if __name__ == "__main__":
    main()