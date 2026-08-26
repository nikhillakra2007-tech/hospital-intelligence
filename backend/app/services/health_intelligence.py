from sqlalchemy import distinct, func, select
from sqlalchemy.orm import Session

from app.models import (
    EnvironmentalData,
    HealthGrid,
    Hospital,
    HospitalOperation,
    Patient,
    RiskAssessment,
)
from app.models.map import DelhiGridCell

RISK_CATEGORIES = ("Low", "Moderate", "High")


def get_high_risk_patient_count(db: Session) -> int:
    return int(
        db.scalar(
            select(func.count(distinct(RiskAssessment.patient_id))).where(
                RiskAssessment.risk_category == "High"
            )
        )
        or 0
    )


def get_dashboard_summary(db: Session) -> dict:
    facility_totals = db.execute(
        select(
            func.count(Hospital.hospital_id),
            func.coalesce(func.sum(Hospital.total_beds), 0),
            func.count(Hospital.total_beds),
            func.coalesce(func.sum(Hospital.icu_beds), 0),
            func.count(Hospital.emergency).filter(Hospital.emergency.is_(True)),
        )
    ).one()

    return {
        "total_patients": int(db.scalar(select(func.count(Patient.patient_id))) or 0),
        "total_hospitals": int(facility_totals[0]),
        "reported_beds": int(facility_totals[1]),
        "hospitals_reporting_beds": int(facility_totals[2]),
        "icu_capacity_reported": int(facility_totals[3]) or None,
        "emergency_capable_facilities": int(facility_totals[4] or 0),
        "high_risk_patients": get_high_risk_patient_count(db),
    }


def get_hospital_capacity(db: Session) -> list[dict]:
    patient_counts = dict(
        db.execute(
            select(Patient.hospital_id, func.count(Patient.patient_id))
            .where(Patient.hospital_id.isnot(None))
            .group_by(Patient.hospital_id)
        ).all()
    )

    # ---- ML model aggregation: every linked patient scored by HospitalRiskModel ----
    from ml.risk.features import feature_vector
    from ml.risk.predict import predict_risk

    ml_rows = db.execute(
        select(
            Patient.hospital_id,
            Patient.age,
            Patient.blood_pressure_systolic,
            Patient.blood_pressure_diastolic,
            Patient.cholesterol,
            Patient.glucose,
            Patient.bmi,
            Patient.heart_rate,
            Patient.previous_cardiac_history,
            Patient.diabetes,
            Patient.hypertension,
        ).where(Patient.hospital_id.isnot(None))
    ).all()

    avg_ml_score: dict[str, float] = {}
    ml_high_counts: dict[str, int] = {}
    for row in ml_rows:
        hid = row[0]
        record = {
            "blood_pressure_systolic": row[2],
            "blood_pressure_diastolic": row[3],
            "age": row[1],
            "cholesterol": row[4],
            "glucose": row[5],
            "bmi": row[6],
            "heart_rate": row[7],
            "previous_cardiac_history": bool(row[8]),
            "diabetes": bool(row[9]),
            "hypertension": bool(row[10]),
        }
        prediction = predict_risk(feature_vector(record))
        scores = avg_ml_score.setdefault(hid, [])
        scores.append(prediction["risk_score"])
        if prediction["risk_level"] == "HIGH":
            ml_high_counts[hid] = ml_high_counts.get(hid, 0) + 1

    high_counts = dict(
        db.execute(
            select(Patient.hospital_id, func.count(distinct(RiskAssessment.patient_id)))
            .join(RiskAssessment, RiskAssessment.patient_id == Patient.patient_id)
            .where(
                Patient.hospital_id.isnot(None),
                RiskAssessment.risk_category == "High",
            )
            .group_by(Patient.hospital_id)
        ).all()
    )

    results = []
    hospitals = db.scalars(select(Hospital)).all()
    for h in hospitals:
        pid = h.hospital_id
        scores = avg_ml_score.get(pid)
        results.append(
            {
                "hospital_id": pid,
                "hospital_name": h.hospital_name,
                "district": h.district,
                "locality": h.locality,
                "hospital_type": h.hospital_type,
                "emergency": h.emergency,
                "capacity_status": h.capacity_status,
                "total_beds": h.total_beds,
                "icu_beds": h.icu_beds,
                "emergency_beds": h.emergency_beds,
                "patient_count": int(patient_counts.get(pid, 0)),
                "high_risk_count": int(high_counts.get(pid, 0)),
                "avg_ml_score": round(sum(scores) / len(scores), 4) if scores else None,
                "high_risk_predicted": int(ml_high_counts.get(pid, 0)),
            }
        )
    results.sort(key=lambda r: (-r["patient_count"], r["hospital_name"]))
    return results


def get_risk_distribution(db: Session) -> dict[str, int]:
    distribution = {category: 0 for category in RISK_CATEGORIES}
    rows = db.execute(
        select(RiskAssessment.risk_category, func.count()).group_by(
            RiskAssessment.risk_category
        )
    ).all()
    for category, count in rows:
        distribution[category] = int(count)
    return distribution


def get_environment_summary(db: Session) -> list[dict]:
    rows = db.execute(
        select(
            HealthGrid.grid_id,
            HealthGrid.district,
            func.count(EnvironmentalData.environment_id),
            func.avg(EnvironmentalData.aqi),
            func.avg(EnvironmentalData.temperature_c),
            func.coalesce(func.sum(EnvironmentalData.rainfall_mm), 0),
            func.min(EnvironmentalData.recorded_date),
            func.max(EnvironmentalData.recorded_date),
        )
        .outerjoin(EnvironmentalData, EnvironmentalData.grid_id == HealthGrid.grid_id)
        .group_by(HealthGrid.grid_id, HealthGrid.district)
        .order_by(HealthGrid.grid_id)
    ).all()
    return [
        {
            "grid_id": row[0],
            "district": row[1],
            "records": int(row[2]),
            "average_aqi": round(float(row[3]), 1) if row[3] is not None else None,
            "average_temperature_c": round(float(row[4]), 1)
            if row[4] is not None
            else None,
            "total_rainfall_mm": float(row[5]),
            "first_recorded_date": row[6],
            "last_recorded_date": row[7],
        }
        for row in rows
    ]
