from typing import Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models import Hospital
from app.schemas.hospital import HospitalCreate, HospitalRead, HospitalUpdate

router = APIRouter(prefix="/api/hospitals", tags=["Hospitals"])


@router.get("", response_model=list[HospitalRead])
def list_hospitals(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    district: Optional[str] = Query(None, max_length=100),
    hospital_type: Optional[Literal["Government", "Private", "Trust", "Unknown", "Specialty", "Teaching"]] = Query(None),
    db: Session = Depends(get_db),
):
    stmt = select(Hospital).order_by(Hospital.hospital_id)
    if district:
        stmt = stmt.where(Hospital.district == district)
    if hospital_type:
        stmt = stmt.where(Hospital.hospital_type == hospital_type)
    return list(db.scalars(stmt.offset(skip).limit(limit)))


@router.get("/{hospital_id}", response_model=HospitalRead)
def get_hospital(hospital_id: str, db: Session = Depends(get_db)):
    hospital = db.get(Hospital, hospital_id)
    if hospital is None:
        raise HTTPException(status_code=404, detail="Hospital not found")
    return hospital


@router.post("", response_model=HospitalRead, status_code=201)
def create_hospital(payload: HospitalCreate, db: Session = Depends(get_db)):
    if db.get(Hospital, payload.hospital_id) is not None:
        raise HTTPException(
            status_code=400,
            detail=f"Hospital '{payload.hospital_id}' already exists",
        )
    if (
        db.scalar(select(Hospital).where(Hospital.hospital_name == payload.hospital_name))
        is not None
    ):
        raise HTTPException(
            status_code=400,
            detail=f"Hospital name '{payload.hospital_name}' already exists",
        )
    hospital = Hospital(**payload.model_dump())
    db.add(hospital)
    db.commit()
    db.refresh(hospital)
    return hospital


@router.put("/{hospital_id}", response_model=HospitalRead)
def update_hospital(hospital_id: str, payload: HospitalUpdate, db: Session = Depends(get_db)):
    hospital = db.get(Hospital, hospital_id)
    if hospital is None:
        raise HTTPException(status_code=404, detail="Hospital not found")
    data = payload.model_dump(exclude_unset=True)
    merged = {
        "total_beds": data.get("total_beds", hospital.total_beds),
        "icu_beds": data.get("icu_beds", hospital.icu_beds),
        "emergency_beds": data.get("emergency_beds", hospital.emergency_beds),
    }
    if any(v is not None and merged["total_beds"] is not None and v > merged["total_beds"] for v in (merged["icu_beds"], merged["emergency_beds"])):
        raise HTTPException(
            status_code=400,
            detail="icu_beds and emergency_beds cannot exceed total_beds",
        )
    for field, value in data.items():
        setattr(hospital, field, value)
    db.commit()
    db.refresh(hospital)
    return hospital


@router.delete("/{hospital_id}", status_code=204)
def delete_hospital(hospital_id: str, db: Session = Depends(get_db)):
    hospital = db.get(Hospital, hospital_id)
    if hospital is None:
        raise HTTPException(status_code=404, detail="Hospital not found")
    db.delete(hospital)
    db.commit()
    return None
