from datetime import date
from decimal import Decimal

from sqlalchemy import Date, ForeignKey, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class RiskAssessment(Base):
    __tablename__ = "risk_assessments"

    risk_assessment_id: Mapped[str] = mapped_column(String(10), primary_key=True)
    patient_id: Mapped[str] = mapped_column(ForeignKey("patients.patient_id"))
    grid_id: Mapped[str] = mapped_column(ForeignKey("health_grids.grid_id"))
    assessment_date: Mapped[date] = mapped_column(Date)
    cardiac_risk_score: Mapped[Decimal] = mapped_column(Numeric(3, 2))
    overall_health_risk_score: Mapped[Decimal] = mapped_column(Numeric(3, 2))
    risk_category: Mapped[str] = mapped_column(String(10))

    patient: Mapped["Patient"] = relationship(back_populates="risk_assessments")
    grid: Mapped["HealthGrid"] = relationship(back_populates="risk_assessments")
