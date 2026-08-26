from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class HealthGridBase(BaseModel):
    district: str = Field(min_length=1, max_length=100)
    latitude: float = Field(ge=-90.0, le=90.0)
    longitude: float = Field(ge=-180.0, le=180.0)
    population: int = Field(gt=0)
    population_density: int = Field(gt=0)
    hospital_count: int = Field(ge=0)
    nearest_hospital_distance_km: float = Field(ge=0.0)


class HealthGridCreate(HealthGridBase):
    grid_id: str = Field(min_length=1, max_length=10)


class HealthGridUpdate(BaseModel):
    district: Optional[str] = Field(None, min_length=1, max_length=100)
    latitude: Optional[float] = Field(None, ge=-90.0, le=90.0)
    longitude: Optional[float] = Field(None, ge=-180.0, le=180.0)
    population: Optional[int] = Field(None, gt=0)
    population_density: Optional[int] = Field(None, gt=0)
    hospital_count: Optional[int] = Field(None, ge=0)
    nearest_hospital_distance_km: Optional[float] = Field(None, ge=0.0)


class HealthGridRead(HealthGridBase):
    model_config = ConfigDict(from_attributes=True)

    grid_id: str
