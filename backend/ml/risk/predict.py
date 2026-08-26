"""Runtime inference for the Hospital Intelligence clinical risk model.

Prefers the sklearn/joblib artifact. If sklearn cannot be imported (e.g. the
local Application Control policy blocks scipy DLLs) it falls back to the
portable pure-Python JSON forest, which reproduces sklearn's predict_proba
exactly (verified at training time).
"""

import json
import os
from functools import lru_cache
from pathlib import Path
from typing import Any

MODEL_DIR = Path(__file__).resolve().parent


class ModelNotTrainedError(RuntimeError):
    pass


def _load_json_portable() -> dict[str, Any]:
    path = MODEL_DIR / "model.json"
    if not path.exists():
        raise ModelNotTrainedError(
            "Risk model artifacts not found. Run ml/risk/train.py first."
        )
    return json.loads(path.read_text(encoding="utf-8"))


@lru_cache(maxsize=1)
def _load_bundle() -> dict[str, Any]:
    """Return (mode, bundle). mode is 'sklearn' or 'portable'.

    Default is 'portable' (pure-Python forest, mathematically identical to
    sklearn's predict_proba - verified at training time). Set
    RISK_INFERENCE_MODE=sklearn to use the joblib artifact instead.
    """
    json_path = MODEL_DIR / "model.json"
    if not json_path.exists():
        raise ModelNotTrainedError(
            "Risk model artifacts not found. Run ml/risk/train.py first."
        )
    portable = json.loads(json_path.read_text(encoding="utf-8"))
    mode = os.environ.get("RISK_INFERENCE_MODE", "portable").strip().lower()
    if mode == "sklearn":
        try:
            import joblib  # noqa: PLC0415

            bundle = {
                "mode": "sklearn",
                "model": joblib.load(MODEL_DIR / "model.joblib"),
                "portable": portable,
            }
            return bundle
        except Exception:
            pass
    return {"mode": "portable", "model": None, "portable": portable}


def score_to_level(score: float, thresholds: dict[str, float]) -> str:
    if score >= thresholds["high_min"]:
        return "HIGH"
    if score >= thresholds["moderate_min"]:
        return "MODERATE"
    return "LOW"


def predict_risk(features: dict[str, float]) -> dict[str, Any]:
    """Run inference on an ordered clinical feature mapping.

    Returns risk probability (weighted High/Moderate score), the mapped level,
    full class probabilities and model metadata.
    """
    from ml.risk.features import FEATURE_COLUMNS, RISK_LEVELS  # local to avoid cycles

    bundle = _load_bundle()
    portable = bundle["portable"]
    thresholds = portable["thresholds"]
    levels: list[str] = portable["levels"]
    ordered = [float(features[c]) for c in FEATURE_COLUMNS]

    if bundle["mode"] == "sklearn":
        import pandas as pd  # noqa: PLC0415

        frame = pd.DataFrame([ordered], columns=FEATURE_COLUMNS)
        proba = bundle["model"].predict_proba(frame)[0]
        class_order = [str(c) for c in bundle["model"].classes_]
        distribution = {
            level: round(float(proba[class_order.index(level)]), 4)
            for level in levels
        }
        mode = "sklearn"
    else:
        from ml.risk.serialization import forest_predict_proba  # noqa: PLC0415

        _, _, distribution = forest_predict_proba(
            portable["trees"], ordered, levels
        )
        mode = "portable-python"

    risk_score = round(
        distribution.get("High", 0.0) + 0.5 * distribution.get("Moderate", 0.0), 4
    )
    risk_score = min(1.0, max(0.0, risk_score))

    return {
        "risk_score": risk_score,
        "risk_level": score_to_level(risk_score, thresholds),
        "probabilities": distribution,
        "thresholds": thresholds,
        "model_name": "HospitalRiskModel",
        "model_version": portable["model_version"],
        "inference_mode": mode,
    }


def combine_with_environmental(
    clinical_score: float,
    environmental_signal: float,
    weight: float = 0.15,
) -> dict[str, Any]:
    """Documented contextual combination.

    combined = (1 - weight) * clinical_score + weight * environmental_signal

    environmental_signal must already be normalised to [0, 1] where higher means
    worse environmental conditions (e.g. AQI band severity). The weight keeps the
    clinically-trained model dominant; the environmental term only nudges.
    """
    weight = min(0.5, max(0.0, weight))
    env = min(1.0, max(0.0, environmental_signal))
    clinical = min(1.0, max(0.0, clinical_score))
    combined = round((1 - weight) * clinical + weight * env, 4)

    from ml.risk.features import THRESHOLDS  # noqa: PLC0415

    return {
        "combined_score": combined,
        "clinical_score": clinical,
        "environmental_signal": round(env, 4),
        "environmental_weight": weight,
        "method": "linear_blend(clinical_dominant)",
        "risk_level": score_to_level(combined, THRESHOLDS),
    }


def model_info() -> dict[str, Any]:
    metrics_path = MODEL_DIR / "metrics.json"
    info: dict[str, Any] = {"available": False}
    try:
        bundle = _load_bundle()
        portable = bundle["portable"]
        info.update(
            {
                "available": True,
                "mode": bundle["mode"],
                "model_name": "HospitalRiskModel",
                "model_version": portable["model_version"],
                "model_type": portable["model_type"],
                "feature_count": len(portable["feature_columns"]),
                "feature_columns": portable["feature_columns"],
                "levels": portable["levels"],
                "thresholds": portable["thresholds"],
                "n_estimators": portable.get("n_estimators"),
            }
        )
        if metrics_path.exists():
            info["metrics"] = json.loads(metrics_path.read_text(encoding="utf-8"))
    except ModelNotTrainedError as exc:
        info["reason"] = str(exc)
    return info
