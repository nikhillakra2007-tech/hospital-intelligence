"""Feature contract for the Hospital Intelligence clinical risk model.

Features come exclusively from the real columns of the `patients` table plus one
derived ratio (pulse pressure). No stored risk scores / categories are ever used
as inputs (leakage guard enforced in train.py).
"""

from typing import Any

FEATURE_COLUMNS: list[str] = [
    "age",
    "blood_pressure_systolic",
    "blood_pressure_diastolic",
    "cholesterol",
    "glucose",
    "bmi",
    "heart_rate",
    "pulse_pressure",
    "previous_cardiac_history",
    "diabetes",
    "hypertension",
]

BOOLEAN_FEATURES = {
    "previous_cardiac_history",
    "diabetes",
    "hypertension",
}

# Columns that must NEVER be used as features (target leakage).
LEAKAGE_COLUMNS = {
    "risk_score",
    "risk_level",
    "overall_health_risk_score",
    "cardiac_risk_score",
    "risk_category",
}

RISK_LEVELS = ["Low", "Moderate", "High"]

# Score -> level thresholds (configurable, demo values; not clinically validated).
THRESHOLDS = {"moderate_min": 0.40, "high_min": 0.70}


def feature_vector(row: dict[str, Any]) -> dict[str, float]:
    """Build the ordered numeric feature mapping from a raw patient dict."""
    pulse_pressure = float(row["blood_pressure_systolic"]) - float(
        row["blood_pressure_diastolic"]
    )
    values: dict[str, float] = {}
    for col in FEATURE_COLUMNS:
        if col == "pulse_pressure":
            values[col] = pulse_pressure
        elif col in BOOLEAN_FEATURES:
            values[col] = 1.0 if row.get(col) else 0.0
        else:
            values[col] = float(row[col])
    return values


def vector_to_ordered_list(values: dict[str, float]) -> list[float]:
    return [values[c] for c in FEATURE_COLUMNS]
