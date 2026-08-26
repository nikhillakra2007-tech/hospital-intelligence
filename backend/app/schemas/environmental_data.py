from datetime import date
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class EnvironmentalDataBase(BaseModel):
    grid_id: str = Field(min_length=1, max_length=10)
    recorded_date: date
    aqi: int = Field(ge=0, le=500)
    temperature_c: float = Field(ge=-50.0, le=60.0)
    rainfall_mm: float = Field(ge=0.0)


class EnvironmentalDataCreate(EnvironmentalDataBase):
    environment_id: str = Field(min_length=1, max_length=10)


class EnvironmentalDataUpdate(BaseModel):
    grid_id: Optional[str] = Field(None, min_length=1, max_length=10)
    recorded_date: Optional[date] = None
    aqi: Optional[int] = Field(None, ge=0, le=500)
    temperature_c: Optional[float] = Field(None, ge=-50.0, le=60.0)
    rainfall_mm: Optional[float] = Field(None, ge=0.0)


class EnvironmentalDataRead(EnvironmentalDataBase):
    model_config = ConfigDict(from_attributes=True)

    environment_id: str
