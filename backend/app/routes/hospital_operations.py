from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models import Hospital, HospitalOperation
from app.schemas.hospital_operation import (
    HospitalOperationCreate,
    HospitalOperationRead,
    HospitalOperationUpdate,
)

router = APIRouter(prefix="/api/hospital-operations", tags=["Hospital Operations"])


def _require_hospital(db: Session, hospital_id: str) -> Hospital:
    hospital = db.get(Hospital, hospital_id)
    if hospital is None:
        raise HTTPException(
            status_code=400,
            detail=f"hospital_id '{hospital_id}' does not reference an existing hospital",
        )
    return hospital


def _validate_capacity(
    hospital: Hospital, occupied_beds: int, available_beds: int, icu_occupied: int
) -> None:
    if occupied_beds > hospital.total_beds:
        raise HTTPException(
            status_code=400, detail="occupied_beds cannot exceed the hospital total_beds"
        )
    if available_beds != hospital.total_beds - occupied_beds:
        raise HTTPException(
            status_code=400,
            detail="available_beds must equal total_beds minus occupied_beds",
        )
    if icu_occupied > hospital.icu_beds:
        raise HTTPException(
            status_code=400, detail="icu_occupied cannot exceed the hospital icu_beds"
        )


@router.get("", response_model=list[HospitalOperationRead])
def list_hospital_operations(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    hospital_id: Optional[str] = Query(None, max_length=10),
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    db: Session = Depends(get_db),
):
    stmt = select(HospitalOperation).order_by(
        HospitalOperation.operation_date.desc(), HospitalOperation.operation_id
    )
    if hospital_id:
        stmt = stmt.where(HospitalOperation.hospital_id == hospital_id)
    if date_from:
        stmt = stmt.where(HospitalOperation.operation_date >= date_from)
    if date_to:
        stmt = stmt.where(HospitalOperation.operation_date <= date_to)
    return list(db.scalars(stmt.offset(skip).limit(limit)))


@router.get("/{operation_id}", response_model=HospitalOperationRead)
def get_hospital_operation(operation_id: str, db: Session = Depends(get_db)):
    operation = db.get(HospitalOperation, operation_id)
    if operation is None:
        raise HTTPException(status_code=404, detail="Hospital operation not found")
    return operation


@router.post("", response_model=HospitalOperationRead, status_code=201)
def create_hospital_operation(
    payload: HospitalOperationCreate, db: Session = Depends(get_db)
):
    if db.get(HospitalOperation, payload.operation_id) is not None:
        raise HTTPException(
            status_code=400,
            detail=f"Hospital operation '{payload.operation_id}' already exists",
        )
    hospital = _require_hospital(db, payload.hospital_id)
    _validate_capacity(
        hospital, payload.occupied_beds, payload.available_beds, payload.icu_occupied
    )
    operation = HospitalOperation(**payload.model_dump())
    db.add(operation)
    db.commit()
    db.refresh(operation)
    return operation


@router.put("/{operation_id}", response_model=HospitalOperationRead)
def update_hospital_operation(
    operation_id: str, payload: HospitalOperationUpdate, db: Session = Depends(get_db)
):
    operation = db.get(HospitalOperation, operation_id)
    if operation is None:
        raise HTTPException(status_code=404, detail="Hospital operation not found")
    data = payload.model_dump(exclude_unset=True)
    hospital = _require_hospital(db, data.get("hospital_id", operation.hospital_id))
    _validate_capacity(
        hospital,
        data.get("occupied_beds", operation.occupied_beds),
        data.get("available_beds", operation.available_beds),
        data.get("icu_occupied", operation.icu_occupied),
    )
    for field, value in data.items():
        setattr(operation, field, value)
    db.commit()
    db.refresh(operation)
    return operation


@router.delete("/{operation_id}", status_code=204)
def delete_hospital_operation(operation_id: str, db: Session = Depends(get_db)):
    operation = db.get(HospitalOperation, operation_id)
    if operation is None:
        raise HTTPException(status_code=404, detail="Hospital operation not found")
    db.delete(operation)
    db.commit()
    return None
