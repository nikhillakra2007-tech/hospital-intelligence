from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models import EnvironmentalData
from app.schemas.environmental_data import (
    EnvironmentalDataCreate,
    EnvironmentalDataRead,
    EnvironmentalDataUpdate,
)

router = APIRouter(prefix="/api/environmental-data", tags=["Environmental Data"])


@router.get("", response_model=list[EnvironmentalDataRead])
def list_environmental_data(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    grid_id: Optional[str] = Query(None, max_length=10),
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    db: Session = Depends(get_db),
):
    stmt = select(EnvironmentalData).order_by(
        EnvironmentalData.recorded_date.desc(), EnvironmentalData.environment_id
    )
    if grid_id:
        stmt = stmt.where(EnvironmentalData.grid_id == grid_id)
    if date_from:
        stmt = stmt.where(EnvironmentalData.recorded_date >= date_from)
    if date_to:
        stmt = stmt.where(EnvironmentalData.recorded_date <= date_to)
    return list(db.scalars(stmt.offset(skip).limit(limit)))


@router.get("/{environment_id}", response_model=EnvironmentalDataRead)
def get_environmental_data(environment_id: str, db: Session = Depends(get_db)):
    record = db.get(EnvironmentalData, environment_id)
    if record is None:
        raise HTTPException(status_code=404, detail="Environmental data record not found")
    return record


@router.post("", response_model=EnvironmentalDataRead, status_code=201)
def create_environmental_data(
    payload: EnvironmentalDataCreate, db: Session = Depends(get_db)
):
    if db.get(EnvironmentalData, payload.environment_id) is not None:
        raise HTTPException(
            status_code=400,
            detail=f"Environmental data record '{payload.environment_id}' already exists",
        )
    record = EnvironmentalData(**payload.model_dump())
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


@router.put("/{environment_id}", response_model=EnvironmentalDataRead)
def update_environmental_data(
    environment_id: str, payload: EnvironmentalDataUpdate, db: Session = Depends(get_db)
):
    record = db.get(EnvironmentalData, environment_id)
    if record is None:
        raise HTTPException(status_code=404, detail="Environmental data record not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(record, field, value)
    db.commit()
    db.refresh(record)
    return record


@router.delete("/{environment_id}", status_code=204)
def delete_environmental_data(environment_id: str, db: Session = Depends(get_db)):
    record = db.get(EnvironmentalData, environment_id)
    if record is None:
        raise HTTPException(status_code=404, detail="Environmental data record not found")
    db.delete(record)
    db.commit()
    return None
