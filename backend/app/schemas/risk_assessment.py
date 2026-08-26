from datetime import date
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, Field

RiskCategory = Literal["Low", "Moderate", "High"]


class RiskAssessmentBase(BaseModel):
    patient_id: str = Field(min_length=1, max_length=10)
    grid_id: str = Field(min_length=1, max_length=10)
    assessment_date: date
    cardiac_risk_score: float = Field(ge=0.0, le=1.0)
    overall_health_risk_score: float = Field(ge=0.0, le=1.0)
    risk_category: RiskCategory


class RiskAssessmentCreate(RiskAssessmentBase):
    risk_assessment_id: str = Field(min_length=1, max_length=10)


class RiskAssessmentUpdate(BaseModel):
    patient_id: Optional[str] = Field(None, min_length=1, max_length=10)
    grid_id: Optional[str] = Field(None, min_length=1, max_length=10)
    assessment_date: Optional[date] = None
    cardiac_risk_score: Optional[float] = Field(None, ge=0.0, le=1.0)
    overall_health_risk_score: Optional[float] = Field(None, ge=0.0, le=1.0)
    risk_category: Optional[RiskCategory] = None


class RiskAssessmentRead(RiskAssessmentBase):
    model_config = ConfigDict(from_attributes=True)

    risk_assessment_id: str
