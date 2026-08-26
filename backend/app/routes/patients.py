from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models import Hospital, Patient
from app.schemas.patient import (
    PatientCreate,
    PatientRead,
    PatientSummaryRead,
    PatientUpdate,
)

router = APIRouter(prefix="/api/patients", tags=["Patients"])


def _with_hospital_name(patient: Patient, name_map: dict[str, str]) -> dict:
    data = {c.name: getattr(patient, c.name) for c in patient.__table__.columns}
    data["hospital_name"] = name_map.get(patient.hospital_id) if patient.hospital_id else None
    return data


def _load_hospital_names(db: Session) -> dict[str, str]:
    return dict(db.execute(select(Hospital.hospital_id, Hospital.hospital_name)).all())


@router.get("", response_model=list[PatientSummaryRead])
def list_patients(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    district: Optional[str] = Query(None, max_length=100),
    db: Session = Depends(get_db),
):
    name_map = _load_hospital_names(db)
    stmt = select(Patient).order_by(Patient.patient_id)
    if district:
        stmt = stmt.where(Patient.district == district)
    patients = db.scalars(stmt.offset(skip).limit(limit)).all()
    return [_with_hospital_name(p, name_map) for p in patients]


@router.get("/{patient_id}", response_model=PatientSummaryRead)
def get_patient(patient_id: str, db: Session = Depends(get_db)):
    patient = db.get(Patient, patient_id)
    if patient is None:
        raise HTTPException(status_code=404, detail="Patient not found")
    return _with_hospital_name(patient, _load_hospital_names(db))


@router.post("", response_model=PatientRead, status_code=201)
def create_patient(payload: PatientCreate, db: Session = Depends(get_db)):
    if db.get(Patient, payload.patient_id) is not None:
        raise HTTPException(
            status_code=400,
            detail=f"Patient '{payload.patient_id}' already exists",
        )
    fields = payload.model_dump()
    hospital_id = fields.pop("hospital_id", None)
    if hospital_id and db.get(Hospital, hospital_id) is None:
        raise HTTPException(status_code=400, detail="hospital_id does not reference an existing hospital")
    patient = Patient(**fields, hospital_id=hospital_id)
    db.add(patient)
    db.commit()
    db.refresh(patient)
    return patient


@router.put("/{patient_id}", response_model=PatientRead)
def update_patient(patient_id: str, payload: PatientUpdate, db: Session = Depends(get_db)):
    patient = db.get(Patient, patient_id)
    if patient is None:
        raise HTTPException(status_code=404, detail="Patient not found")
    data = payload.model_dump(exclude_unset=True)
    new_hospital = data.pop("hospital_id", None)
    if new_hospital is not None and db.get(Hospital, new_hospital) is None:
        raise HTTPException(status_code=400, detail="hospital_id does not reference an existing hospital")
    for field, value in data.items():
        setattr(patient, field, value)
    if new_hospital is not None:
        patient.hospital_id = new_hospital or None
    db.commit()
    db.refresh(patient)
    return patient


@router.delete("/{patient_id}", status_code=204)
def delete_patient(patient_id: str, db: Session = Depends(get_db)):
    patient = db.get(Patient, patient_id)
    if patient is None:
        raise HTTPException(status_code=404, detail="Patient not found")
    db.delete(patient)
    db.commit()
    return None
