from decimal import Decimal

from sqlalchemy import Integer, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class HealthGrid(Base):
    __tablename__ = "health_grids"

    grid_id: Mapped[str] = mapped_column(String(10), primary_key=True)
    district: Mapped[str] = mapped_column(String(100))
    latitude: Mapped[Decimal] = mapped_column(Numeric(9, 6))
    longitude: Mapped[Decimal] = mapped_column(Numeric(9, 6))
    population: Mapped[int] = mapped_column(Integer)
    population_density: Mapped[int] = mapped_column(Integer)
    hospital_count: Mapped[int] = mapped_column(Integer)
    nearest_hospital_distance_km: Mapped[Decimal] = mapped_column(Numeric(4, 1))

    environmental_data: Mapped[list["EnvironmentalData"]] = relationship(
        back_populates="grid"
    )
    risk_assessments: Mapped[list["RiskAssessment"]] = relationship(
        back_populates="grid"
    )
