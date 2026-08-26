from decimal import Decimal

from sqlalchemy import Boolean, ForeignKey, Integer, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Patient(Base):
    __tablename__ = "patients"

    patient_id: Mapped[str] = mapped_column(String(10), primary_key=True)
    age: Mapped[int] = mapped_column(Integer)
    gender: Mapped[str] = mapped_column(String(10))
    district: Mapped[str] = mapped_column(String(100))
    blood_pressure_systolic: Mapped[int] = mapped_column(Integer)
    blood_pressure_diastolic: Mapped[int] = mapped_column(Integer)
    cholesterol: Mapped[int] = mapped_column(Integer)
    glucose: Mapped[int] = mapped_column(Integer)
    bmi: Mapped[Decimal] = mapped_column(Numeric(4, 1))
    heart_rate: Mapped[int] = mapped_column(Integer)
    previous_cardiac_history: Mapped[bool] = mapped_column(Boolean, default=False)
    diabetes: Mapped[bool] = mapped_column(Boolean, default=False)
    hypertension: Mapped[bool] = mapped_column(Boolean, default=False)
    hospital_id: Mapped[str | None] = mapped_column(
        ForeignKey("hospitals.hospital_id")
    )

    risk_assessments: Mapped[list["RiskAssessment"]] = relationship(
        back_populates="patient"
    )
    hospital: Mapped["Hospital | None"] = relationship()

