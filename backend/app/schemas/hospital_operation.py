from datetime import date
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, Field


class HospitalOperationBase(BaseModel):
    hospital_id: str = Field(min_length=1, max_length=10)
    operation_date: date
    admissions: int = Field(ge=0)
    discharges: int = Field(ge=0)
    emergency_visits: int = Field(ge=0)
    occupied_beds: int = Field(ge=0)
    available_beds: int = Field(ge=0)
    icu_occupied: int = Field(ge=0)
    average_wait_time_minutes: int = Field(ge=0)


class HospitalOperationCreate(HospitalOperationBase):
    operation_id: str = Field(min_length=1, max_length=10)


class HospitalOperationUpdate(BaseModel):
    hospital_id: Optional[str] = Field(None, min_length=1, max_length=10)
    operation_date: Optional[date] = None
    admissions: Optional[int] = Field(None, ge=0)
    discharges: Optional[int] = Field(None, ge=0)
    emergency_visits: Optional[int] = Field(None, ge=0)
    occupied_beds: Optional[int] = Field(None, ge=0)
    available_beds: Optional[int] = Field(None, ge=0)
    icu_occupied: Optional[int] = Field(None, ge=0)
    average_wait_time_minutes: Optional[int] = Field(None, ge=0)


class HospitalOperationRead(HospitalOperationBase):
    model_config = ConfigDict(from_attributes=True)

    operation_id: str
