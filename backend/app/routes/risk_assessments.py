from datetime import date
from typing import Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models import RiskAssessment
from app.schemas.risk_assessment import (
    RiskAssessmentCreate,
    RiskAssessmentRead,
    RiskAssessmentUpdate,
)

router = APIRouter(prefix="/api/risk-assessments", tags=["Risk Assessments"])


@router.get("", response_model=list[RiskAssessmentRead])
def list_risk_assessments(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    patient_id: Optional[str] = Query(None, max_length=10),
    grid_id: Optional[str] = Query(None, max_length=10),
    risk_category: Optional[Literal["Low", "Moderate", "High"]] = Query(None),
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    db: Session = Depends(get_db),
):
    stmt = select(RiskAssessment).order_by(
        RiskAssessment.assessment_date.desc(), RiskAssessment.risk_assessment_id
    )
    if patient_id:
        stmt = stmt.where(RiskAssessment.patient_id == patient_id)
    if grid_id:
        stmt = stmt.where(RiskAssessment.grid_id == grid_id)
    if risk_category:
        stmt = stmt.where(RiskAssessment.risk_category == risk_category)
    if date_from:
        stmt = stmt.where(RiskAssessment.assessment_date >= date_from)
    if date_to:
        stmt = stmt.where(RiskAssessment.assessment_date <= date_to)
    return list(db.scalars(stmt.offset(skip).limit(limit)))


@router.get("/{risk_assessment_id}", response_model=RiskAssessmentRead)
def get_risk_assessment(risk_assessment_id: str, db: Session = Depends(get_db)):
    assessment = db.get(RiskAssessment, risk_assessment_id)
    if assessment is None:
        raise HTTPException(status_code=404, detail="Risk assessment not found")
    return assessment


@router.post("", response_model=RiskAssessmentRead, status_code=201)
def create_risk_assessment(
    payload: RiskAssessmentCreate, db: Session = Depends(get_db)
):
    if db.get(RiskAssessment, payload.risk_assessment_id) is not None:
        raise HTTPException(
            status_code=400,
            detail=f"Risk assessment '{payload.risk_assessment_id}' already exists",
        )
    assessment = RiskAssessment(**payload.model_dump())
    db.add(assessment)
    db.commit()
    db.refresh(assessment)
    return assessment


@router.put("/{risk_assessment_id}", response_model=RiskAssessmentRead)
def update_risk_assessment(
    risk_assessment_id: str, payload: RiskAssessmentUpdate, db: Session = Depends(get_db)
):
    assessment = db.get(RiskAssessment, risk_assessment_id)
    if assessment is None:
        raise HTTPException(status_code=404, detail="Risk assessment not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(assessment, field, value)
    db.commit()
    db.refresh(assessment)
    return assessment


@router.delete("/{risk_assessment_id}", status_code=204)
def delete_risk_assessment(risk_assessment_id: str, db: Session = Depends(get_db)):
    assessment = db.get(RiskAssessment, risk_assessment_id)
    if assessment is None:
        raise HTTPException(status_code=404, detail="Risk assessment not found")
    db.delete(assessment)
    db.commit()
    return None
