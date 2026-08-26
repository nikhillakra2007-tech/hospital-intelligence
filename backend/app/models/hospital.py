from sqlalchemy import Boolean, Integer, Numeric, String, Text, BigInteger
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Hospital(Base):
    __tablename__ = "hospitals"

    hospital_id: Mapped[str] = mapped_column(String(10), primary_key=True)
    hospital_name: Mapped[str] = mapped_column(String(150), unique=True)
    district: Mapped[str] = mapped_column(String(100))
    locality: Mapped[str | None] = mapped_column(String(120))
    address: Mapped[str | None] = mapped_column(Text)
    latitude: Mapped[float] = mapped_column(Numeric(9, 6))
    longitude: Mapped[float] = mapped_column(Numeric(9, 6))
    hospital_type: Mapped[str] = mapped_column(String(30))
    total_beds: Mapped[int | None] = mapped_column(Integer)
    icu_beds: Mapped[int | None] = mapped_column(Integer)
    emergency_beds: Mapped[int | None] = mapped_column(Integer)
    emergency: Mapped[bool | None] = mapped_column(Boolean)
    beds_reported: Mapped[bool] = mapped_column(Boolean, default=False)
    operator: Mapped[str | None] = mapped_column(Text)
    phone: Mapped[str | None] = mapped_column(Text)
    capacity_status: Mapped[str] = mapped_column(String(20), default="unavailable")
    source_element: Mapped[str | None] = mapped_column(String(16))
    source_id: Mapped[int | None] = mapped_column(BigInteger)

    operations: Mapped[list["HospitalOperation"]] = relationship(
        back_populates="hospital"
    )
