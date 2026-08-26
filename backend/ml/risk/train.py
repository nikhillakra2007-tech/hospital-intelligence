"""Train the Hospital Intelligence clinical risk model.

Run with a python that can import sklearn (e.g. the Urban Shadow venv):
    C:/.../urban_shadow/.venv/Scripts/python.exe ml/risk/train.py

Data source: PostgreSQL `patients` joined to each patient's LATEST
`risk_assessments` row (the stored synthetic labels used as weak supervision).
Leakage guard: only clinical feature columns are used; stored scores/categories
are never passed as inputs.
"""

import json
import sys
from datetime import datetime, timezone
from pathlib import Path

import joblib
import numpy as np
import psycopg2
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import (
    accuracy_score,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
)
from sklearn.model_selection import train_test_split

BACKEND_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(BACKEND_ROOT))

from ml.risk.features import (  # noqa: E402
    BOOLEAN_FEATURES,
    FEATURE_COLUMNS,
    LEAKAGE_COLUMNS,
    RISK_LEVELS,
    THRESHOLDS,
)
from ml.risk.serialization import export_tree  # noqa: E402
from ml.risk.serialization import tree_predict_proba  # noqa: E402

DB = dict(host="localhost", port=5432, dbname="hospital_intelligence",
          user="postgres", password="1234")

MODEL_DIR = BACKEND_ROOT / "ml" / "risk"
RANDOM_STATE = 42
MODEL_VERSION = "HospitalRiskModel-v1"

QUERY = """
SELECT p.patient_id, p.age, p.gender, p.district,
       p.blood_pressure_systolic, p.blood_pressure_diastolic,
       p.cholesterol, p.glucose, p.bmi, p.heart_rate,
       p.previous_cardiac_history, p.diabetes, p.hypertension,
       ra.risk_category, ra.overall_health_risk_score,
       ra.grid_id
FROM patients p
JOIN risk_assessments ra ON ra.patient_id = p.patient_id
JOIN (
    SELECT patient_id, MAX(assessment_date) AS max_date
    FROM risk_assessments GROUP BY patient_id
) latest ON latest.patient_id = ra.patient_id AND latest.max_date = ra.assessment_date
ORDER BY p.patient_id;
"""


def load_training_frame():
    conn = psycopg2.connect(**DB)
    try:
        df = pd.read_sql(QUERY, conn)
    finally:
        conn.close()

    # leakage guard: none of the forbidden columns may enter the feature matrix
    leaked = LEAKAGE_COLUMNS.intersection(FEATURE_COLUMNS)
    if leaked:
        raise RuntimeError(f"Leakage detected in FEATURE_COLUMNS: {leaked}")

    for col in BOOLEAN_FEATURES:
        df[col] = df[col].astype(bool)

    df["pulse_pressure"] = (
        df["blood_pressure_systolic"] - df["blood_pressure_diastolic"]
    ).astype(float)

    X = df[FEATURE_COLUMNS].astype(float)
    y = df["risk_category"]

    medians = {col: float(X[col].median()) for col in FEATURE_COLUMNS}
    X = X.fillna(medians)
    return df, X, y, medians


def main():
    frame, X, y, medians = load_training_frame()

    class_counts = y.value_counts().to_dict()
    print("samples:", len(frame), "| class distribution:", class_counts)

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.25, random_state=RANDOM_STATE, stratify=y
    )

    model = RandomForestClassifier(
        n_estimators=300,
        max_depth=8,
        min_samples_leaf=2,
        class_weight="balanced",
        random_state=RANDOM_STATE,
    )
    model.fit(X_train, y_train)

    y_pred = model.predict(X_test)
    proba = model.predict_proba(X_test)
    classes = [str(c) for c in model.classes_]

    metrics = {
        "model_version": MODEL_VERSION,
        "model_type": type(model).__name__,
        "trained_at": datetime.now(timezone.utc).isoformat(),
        "random_state": RANDOM_STATE,
        "training_rows": int(len(X_train)),
        "test_rows": int(len(X_test)),
        "class_distribution": {k: int(v) for k, v in class_counts.items()},
        "feature_columns": FEATURE_COLUMNS,
        "thresholds": THRESHOLDS,
        "metrics": {
            "accuracy": round(float(accuracy_score(y_test, y_pred)), 4),
            "precision_macro": round(float(precision_score(y_test, y_pred, average="macro", zero_division=0)), 4),
            "recall_macro": round(float(recall_score(y_test, y_pred, average="macro", zero_division=0)), 4),
            "f1_macro": round(float(f1_score(y_test, y_pred, average="macro", zero_division=0)), 4),
        },
        "confusion_matrix": {
            "labels": sorted(y_test.unique().tolist()),
            "matrix": confusion_matrix(y_test, y_pred, labels=sorted(y_test.unique())).tolist(),
        },
    }

    present = [i for i, c in enumerate(classes) if c in RISK_LEVELS]
    if len(model.classes_) > 2 and len(present) >= 2:
        try:
            metrics["metrics"]["roc_auc_macro_ovr"] = round(
                float(roc_auc_score(y_test, proba[:, present], multi_class="ovr",
                                    average="macro", labels=[classes[i] for i in present])),
                4,
            )
        except ValueError:
            pass

    feature_importance = sorted(
        (
            {"feature": col, "importance": round(float(imp), 4)}
            for col, imp in zip(FEATURE_COLUMNS, model.feature_importances_)
        ),
        key=lambda item: item["importance"],
        reverse=True,
    )
    metrics["feature_importance"] = feature_importance

    MODEL_DIR.mkdir(parents=True, exist_ok=True)

    joblib.dump(
        {
            "model": model,
            "model_version": MODEL_VERSION,
            "feature_columns": FEATURE_COLUMNS,
            "class_order": classes,
            "medians": medians,
            "thresholds": THRESHOLDS,
            "feature_importance": feature_importance,
            "trained_at": metrics["trained_at"],
        },
        MODEL_DIR / "model.joblib",
    )

    trees = [
        export_tree(estimator.tree_, classes, RISK_LEVELS)
        for estimator in model.estimators_
    ]
    portable = {
        "model_version": MODEL_VERSION,
        "model_type": type(model).__name__,
        "n_estimators": len(trees),
        "levels": RISK_LEVELS,
        "feature_importance": feature_importance,
        "feature_columns": FEATURE_COLUMNS,
        "class_order": classes,
        "medians": medians,
        "thresholds": THRESHOLDS,
        "trees": trees,
    }
    (MODEL_DIR / "model.json").write_text(
        json.dumps(portable), encoding="utf-8"
    )
    (MODEL_DIR / "metrics.json").write_text(
        json.dumps(metrics, indent=2), encoding="utf-8"
    )

    # ---- verify the portable JSON engine reproduces sklearn exactly ----
    max_diff = 0.0
    for _, row in X_test.iterrows():
        x = [float(row[c]) for c in FEATURE_COLUMNS]
        sklearn_proba = model.predict_proba(pd.DataFrame([x], columns=FEATURE_COLUMNS))[0]
        engine_best, engine_level, distribution = None, None, {}
        acc = [0.0] * len(RISK_LEVELS)
        for t in trees:
            pr = tree_predict_proba(t, x)
            for i, v in enumerate(pr):
                acc[i] += v
        avg = [v / len(trees) for v in acc]
        for i, c in enumerate(classes):
            j = RISK_LEVELS.index(c)
            max_diff = max(max_diff, abs(sklearn_proba[i] - avg[j]))

    metrics["portable_engine_max_abs_diff_vs_sklearn"] = round(max_diff, 12)
    (MODEL_DIR / "metrics.json").write_text(json.dumps(metrics, indent=2), encoding="utf-8")

    print("accuracy:", metrics["metrics"]["accuracy"])
    print("f1_macro:", metrics["metrics"]["f1_macro"])
    print("roc_auc_macro_ovr:", metrics["metrics"].get("roc_auc_macro_ovr"))
    print("portable engine max diff vs sklearn:", max_diff)
    print("saved:", MODEL_DIR / "model.joblib")
    print("saved:", MODEL_DIR / "model.json")
    print("saved:", MODEL_DIR / "metrics.json")
    print("TRAIN OK")


if __name__ == "__main__":
    main()
