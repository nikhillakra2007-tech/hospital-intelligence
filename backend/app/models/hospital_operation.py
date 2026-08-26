from datetime import date

from sqlalchemy import Date, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class HospitalOperation(Base):
    __tablename__ = "hospital_operations"

    operation_id: Mapped[str] = mapped_column(String(10), primary_key=True)
    hospital_id: Mapped[str] = mapped_column(
        ForeignKey("hospitals.hospital_id")
    )
    operation_date: Mapped[date] = mapped_column(Date)
    admissions: Mapped[int] = mapped_column(Integer)
    discharges: Mapped[int] = mapped_column(Integer)
    emergency_visits: Mapped[int] = mapped_column(Integer)
    occupied_beds: Mapped[int] = mapped_column(Integer)
    available_beds: Mapped[int] = mapped_column(Integer)
    icu_occupied: Mapped[int] = mapped_column(Integer)
    average_wait_time_minutes: Mapped[int] = mapped_column(Integer)

    hospital: Mapped["Hospital"] = relationship(back_populates="operations")
