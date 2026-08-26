from datetime import date
from decimal import Decimal

from sqlalchemy import Date, ForeignKey, Integer, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class EnvironmentalData(Base):
    __tablename__ = "environmental_data"

    environment_id: Mapped[str] = mapped_column(String(10), primary_key=True)
    grid_id: Mapped[str] = mapped_column(ForeignKey("health_grids.grid_id"))
    recorded_date: Mapped[date] = mapped_column(Date)
    aqi: Mapped[int] = mapped_column(Integer)
    temperature_c: Mapped[Decimal] = mapped_column(Numeric(4, 1))
    rainfall_mm: Mapped[Decimal] = mapped_column(Numeric(5, 1))

    grid: Mapped["HealthGrid"] = relationship(back_populates="environmental_data")
