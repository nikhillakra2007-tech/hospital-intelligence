-- ============================================================
-- Hospital Intelligence - PostgreSQL Schema
-- Database: hospital_intelligence
-- ============================================================

DROP TABLE IF EXISTS risk_assessments CASCADE;
DROP TABLE IF EXISTS environmental_data CASCADE;
DROP TABLE IF EXISTS hospital_operations CASCADE;
DROP TABLE IF EXISTS patients CASCADE;
DROP TABLE IF EXISTS hospitals CASCADE;
DROP TABLE IF EXISTS health_grids CASCADE;

CREATE TABLE health_grids (
    grid_id                       VARCHAR(10)  PRIMARY KEY,
    district                      VARCHAR(100) NOT NULL,
    latitude                      NUMERIC(9,6) NOT NULL CHECK (latitude BETWEEN -90 AND 90),
    longitude                     NUMERIC(9,6) NOT NULL CHECK (longitude BETWEEN -180 AND 180),
    population                    INTEGER      NOT NULL CHECK (population > 0),
    population_density            INTEGER      NOT NULL CHECK (population_density > 0),
    hospital_count                INTEGER      NOT NULL CHECK (hospital_count >= 0),
    nearest_hospital_distance_km  NUMERIC(4,1) NOT NULL CHECK (nearest_hospital_distance_km >= 0)
);

CREATE TABLE hospitals (
    hospital_id     VARCHAR(10)   PRIMARY KEY,
    hospital_name   VARCHAR(150)  NOT NULL UNIQUE,
    district        VARCHAR(100)  NOT NULL,
    locality        VARCHAR(120),
    address         TEXT,
    latitude        NUMERIC(9,6)  NOT NULL CHECK (latitude BETWEEN -90 AND 90),
    longitude       NUMERIC(9,6)  NOT NULL CHECK (longitude BETWEEN -180 AND 180),
    hospital_type   VARCHAR(30)   NOT NULL CHECK (hospital_type IN ('Government', 'Private', 'Trust', 'Unknown')),
    total_beds      INTEGER       CHECK (total_beds > 0),
    icu_beds        INTEGER       CHECK (icu_beds IS NULL OR icu_beds >= 0),
    emergency_beds  INTEGER       CHECK (emergency_beds IS NULL OR emergency_beds >= 0),
    emergency       BOOLEAN,
    beds_reported   BOOLEAN       NOT NULL DEFAULT FALSE,
    operator        TEXT,
    phone           TEXT,
    capacity_status VARCHAR(20)   NOT NULL DEFAULT 'unavailable',
    source_element  VARCHAR(16),
    source_id       BIGINT,
    CHECK (icu_beds IS NULL OR icu_beds <= total_beds),
    CHECK (emergency_beds IS NULL OR emergency_beds <= total_beds)
);

CREATE TABLE patients (
    patient_id                 VARCHAR(10)  PRIMARY KEY,
    age                        INTEGER      NOT NULL CHECK (age BETWEEN 0 AND 120),
    gender                     VARCHAR(10)  NOT NULL CHECK (gender IN ('M', 'F', 'Other')),
    district                   VARCHAR(100) NOT NULL,
    blood_pressure_systolic    INTEGER      NOT NULL CHECK (blood_pressure_systolic BETWEEN 70 AND 250),
    blood_pressure_diastolic   INTEGER      NOT NULL CHECK (blood_pressure_diastolic BETWEEN 40 AND 150),
    cholesterol                INTEGER      NOT NULL CHECK (cholesterol BETWEEN 100 AND 400),
    glucose                    INTEGER      NOT NULL CHECK (glucose BETWEEN 50 AND 400),
    bmi                        NUMERIC(4,1) NOT NULL CHECK (bmi BETWEEN 10.0 AND 60.0),
    heart_rate                 INTEGER      NOT NULL CHECK (heart_rate BETWEEN 30 AND 220),
    previous_cardiac_history   BOOLEAN      NOT NULL DEFAULT FALSE,
    diabetes                   BOOLEAN      NOT NULL DEFAULT FALSE,
    hypertension               BOOLEAN      NOT NULL DEFAULT FALSE,
    hospital_id                VARCHAR(10)  REFERENCES hospitals(hospital_id),
    CHECK (blood_pressure_diastolic < blood_pressure_systolic)
);

CREATE TABLE hospital_operations (
    operation_id                VARCHAR(10) PRIMARY KEY,
    hospital_id                 VARCHAR(10) NOT NULL REFERENCES hospitals(hospital_id),
    operation_date              DATE        NOT NULL,
    admissions                  INTEGER     NOT NULL CHECK (admissions >= 0),
    discharges                  INTEGER     NOT NULL CHECK (discharges >= 0),
    emergency_visits            INTEGER     NOT NULL CHECK (emergency_visits >= 0),
    occupied_beds               INTEGER     NOT NULL CHECK (occupied_beds >= 0),
    available_beds              INTEGER     NOT NULL CHECK (available_beds >= 0),
    icu_occupied                INTEGER     NOT NULL CHECK (icu_occupied >= 0),
    average_wait_time_minutes   INTEGER     NOT NULL CHECK (average_wait_time_minutes >= 0),
    UNIQUE (hospital_id, operation_date)
);

CREATE TABLE environmental_data (
    environment_id   VARCHAR(10)  PRIMARY KEY,
    grid_id          VARCHAR(10)  NOT NULL REFERENCES health_grids(grid_id),
    recorded_date    DATE         NOT NULL,
    aqi              INTEGER      NOT NULL CHECK (aqi BETWEEN 0 AND 500),
    temperature_c    NUMERIC(4,1) NOT NULL CHECK (temperature_c BETWEEN -50.0 AND 60.0),
    rainfall_mm      NUMERIC(5,1) NOT NULL CHECK (rainfall_mm >= 0),
    UNIQUE (grid_id, recorded_date)
);

CREATE TABLE risk_assessments (
    risk_assessment_id           VARCHAR(10)  PRIMARY KEY,
    patient_id                   VARCHAR(10)  NOT NULL REFERENCES patients(patient_id),
    grid_id                      VARCHAR(10)  NOT NULL REFERENCES health_grids(grid_id),
    assessment_date              DATE         NOT NULL,
    cardiac_risk_score           NUMERIC(3,2) NOT NULL CHECK (cardiac_risk_score BETWEEN 0 AND 1),
    overall_health_risk_score    NUMERIC(3,2) NOT NULL CHECK (overall_health_risk_score BETWEEN 0 AND 1),
    risk_category                VARCHAR(10)  NOT NULL CHECK (risk_category IN ('Low', 'Moderate', 'High'))
);

-- ------------------------------------------------------------
-- Urban Shadow Delhi spatial layer (imported reference data)
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS delhi_grid_cells (
    grid_id    INTEGER      PRIMARY KEY,
    center_lat DOUBLE PRECISION NOT NULL,
    center_lng DOUBLE PRECISION NOT NULL,
    boundary   JSONB        NOT NULL
);

CREATE TABLE IF NOT EXISTS delhi_hospitals (
    source_element VARCHAR(16)      NOT NULL,
    source_id      BIGINT           NOT NULL,
    name           TEXT,
    kind           TEXT             NOT NULL,
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
