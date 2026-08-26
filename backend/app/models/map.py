from typing import Any

from sqlalchemy import Boolean, Float, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class DelhiGridCell(Base):
    __tablename__ = "delhi_grid_cells"

    grid_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    center_lat: Mapped[float] = mapped_column(Float)
    center_lng: Mapped[float] = mapped_column(Float)
    boundary: Mapped[Any] = mapped_column(JSONB)


class DelhiHospital(Base):
    __tablename__ = "delhi_hospitals"

    source_element: Mapped[str] = mapped_column(String(16), primary_key=True)
    source_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str | None] = mapped_column(Text)
    kind: Mapped[str] = mapped_column(Text)
    emergency: Mapped[bool | None] = mapped_column(Boolean)
    beds: Mapped[int | None] = mapped_column(Integer)
    operator: Mapped[str | None] = mapped_column(Text)
    phone: Mapped[str | None] = mapped_column(Text)
    addr_street: Mapped[str | None] = mapped_column(Text)
    addr_city: Mapped[str | None] = mapped_column(Text)
    addr_district: Mapped[str | None] = mapped_column(Text)
    addr_postcode: Mapped[str | None] = mapped_column(Text)
    lat: Mapped[float] = mapped_column(Float)
    lng: Mapped[float] = mapped_column(Float)
