import json
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models import EnvironmentalData, HealthGrid, Hospital, Patient, RiskAssessment
from ml.risk.features import feature_vector
from ml.risk.predict import (
    ModelNotTrainedError,
    combine_with_environmental,
    model_info,
    predict_risk,
)

router = APIRouter(prefix="/api/risk", tags=["Risk ML"])

AQI_NORMALISER = 150.0


class PredictRequest(BaseModel):
    patient_id: str = Field(min_length=1, max_length=10)


def _load_patient(db: Session, patient_id: str) -> tuple[Patient, str | None]:
    patient = db.get(Patient, patient_id)
    if patient is None:
        raise HTTPException(status_code=404, detail="Patient not found")

    grid_id: str | None = db.scalar(
        select(RiskAssessment.grid_id)
        .where(RiskAssessment.patient_id == patient_id)
        .order_by(RiskAssessment.assessment_date.desc(), RiskAssessment.risk_assessment_id.desc())
        .limit(1)
    )
    return patient, grid_id


def _stored_category(db: Session, patient_id: str) -> str | None:
    return db.scalar(
        select(RiskAssessment.risk_category)
        .where(RiskAssessment.patient_id == patient_id)
        .order_by(RiskAssessment.assessment_date.desc(), RiskAssessment.risk_assessment_id.desc())
        .limit(1)
    )


def _zone_environmental_signal(db: Session, grid_id: str | None) -> float | None:
    """Normalised [0,1] environmental severity for the zone (higher = worse)."""
    if not grid_id:
        return None
    rows = db.scalars(
        select(EnvironmentalData.aqi).where(EnvironmentalData.grid_id == grid_id)
    ).all()
    if not rows:
        return None
    average = sum(rows) / len(rows)
    return min(1.0, max(0.0, average / AQI_NORMALISER))


@router.get("/model-info")
def get_model_info():
    info = model_info()
    info["disclaimer"] = (
        "Demonstration model trained on synthetic labels. Not clinically validated."
    )
    return info


def _score_all_patients(db: Session) -> list[dict[str, Any]]:
    """Run HospitalRiskModel inference over every patient record."""
    rows = db.execute(
        select(Patient, Hospital.hospital_name).outerjoin(
            Hospital, Patient.hospital_id == Hospital.hospital_id
        )
    ).all()

    # Bulk fetch the most recent assessment category for each patient in a single query
    stored_rows = db.execute(
        select(RiskAssessment.patient_id, RiskAssessment.risk_category)
        .distinct(RiskAssessment.patient_id)
        .order_by(
            RiskAssessment.patient_id,
            RiskAssessment.assessment_date.desc(),
            RiskAssessment.risk_assessment_id.desc(),
        )
    ).all()
    stored_categories = {row[0]: row[1] for row in stored_rows}

    results = []
    for patient, hospital_name in rows:
        features = feature_vector({c.name: getattr(patient, c.name) for c in patient.__table__.columns})
        prediction = predict_risk(features)
        stored = stored_categories.get(patient.patient_id)
        results.append(
            {
                "patient_id": patient.patient_id,
                "district": patient.district,
                "hospital_name": hospital_name,
                "risk_score": prediction["risk_score"],
                "risk_level": prediction["risk_level"],
                "probabilities": prediction["probabilities"],
                "stored_category": stored,
                "model_version": prediction["model_version"],
            }
        )
    results.sort(key=lambda r: r["risk_score"], reverse=True)
    return results


def _summarise(results: list[dict[str, Any]]) -> dict[str, Any]:
    count = len(results)
    level_counts = {"HIGH": 0, "MODERATE": 0, "LOW": 0}
    for row in results:
        level_counts[row["risk_level"]] = level_counts.get(row["risk_level"], 0) + 1
    average = round(sum(r["risk_score"] for r in results) / count, 4) if count else 0.0
    return {
        "count": count,
        "average_risk": average,
        "level_counts": level_counts,
    }


@router.get("/predictions")
def batch_predictions(db: Session = Depends(get_db)):
    results = _score_all_patients(db)
    return {
        "source": "ml-inference",
        "count": len(results),
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "predictions": results,
    }


@router.post("/run-assessment")
def run_assessment(db: Session = Depends(get_db)):
    """Explicit inference run: scores every patient with the live model.

    Read-only over the database (no rows are written); returns the fresh
    predictions plus an aggregate summary so the UI can refresh from the
    actual model output.
    """
    started = datetime.now(timezone.utc)
    try:
        results = _score_all_patients(db)
    except ModelNotTrainedError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    finished = datetime.now(timezone.utc)

    summary = _summarise(results)
    info = model_info()
    return {
        "source": "ml-inference",
        "status": "completed",
        "generated_at": finished.isoformat(),
        "duration_ms": int((finished - started).total_seconds() * 1000),
        "model_name": info.get("model_name", "HospitalRiskModel"),
        "model_version": info.get("model_version"),
        "inference_mode": info.get("mode"),
        **summary,
        "predictions": results,
    }


@router.post("/predict")
def predict_single(payload: PredictRequest, db: Session = Depends(get_db)):
    try:
        patient, grid_id = _load_patient(db, payload.patient_id)
    except HTTPException:
        raise
    features = feature_vector(
        {c.name: getattr(patient, c.name) for c in patient.__table__.columns}
    )
    try:
        prediction = predict_risk(features)
    except ModelNotTrainedError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    stored = _stored_category(db, payload.patient_id)

    env_signal = _zone_environmental_signal(db, grid_id)
    contextual = None
    if env_signal is not None:
        contextual = combine_with_environmental(prediction["risk_score"], env_signal)

    # Transparent input-factor flags (real patient values, not model internals)
    factors: list[dict[str, str]] = []
    if patient.previous_cardiac_history:
        factors.append({"label": "Previous cardiac history", "value": "yes"})
    if patient.diabetes:
        factors.append({"label": "Diabetes", "value": "yes"})
    if patient.hypertension:
        factors.append({"label": "Hypertension", "value": "yes"})
    if patient.age >= 65:
        factors.append({"label": "Age", "value": f"{patient.age} (65+)"})
    if patient.blood_pressure_systolic >= 140:
        factors.append({"label": "Systolic BP", "value": f"{patient.blood_pressure_systolic} mmHg"})
    if patient.cholesterol >= 240:
        factors.append({"label": "Cholesterol", "value": f"{patient.cholesterol} mg/dL"})
    if patient.glucose >= 126:
        factors.append({"label": "Glucose", "value": f"{patient.glucose} mg/dL"})
    if float(patient.bmi) >= 30:
        factors.append({"label": "BMI", "value": f"{float(patient.bmi):.1f}"})

    return {
        "patient_id": patient.patient_id,
        "district": patient.district,
        "features_used": sorted(features.keys()),
        "prediction": {
            "risk_score": prediction["risk_score"],
            "risk_level": prediction["risk_level"],
            "probabilities": prediction["probabilities"],
        },
        "contextual": contextual,
        "recorded_assessment_category": stored,
        "model_name": prediction["model_name"],
        "model_version": prediction["model_version"],
        "inference_mode": prediction["inference_mode"],
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "factors": factors,
        "disclaimer": "ML demonstration output from synthetic data. Not clinically validated.",
    }
