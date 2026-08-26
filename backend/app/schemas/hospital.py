from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, Field, model_validator

HospitalType = Literal["Government", "Private", "Trust", "Unknown"]


class HospitalBase(BaseModel):
    hospital_name: str = Field(min_length=1, max_length=150)
    district: str = Field(min_length=1, max_length=100)
    locality: Optional[str] = Field(None, max_length=120)
    address: Optional[str] = None
    latitude: float = Field(ge=-90.0, le=90.0)
    longitude: float = Field(ge=-180.0, le=180.0)
    hospital_type: HospitalType
    total_beds: Optional[int] = Field(None, gt=0)
    icu_beds: Optional[int] = Field(None, ge=0)
    emergency_beds: Optional[int] = Field(None, ge=0)
    emergency: Optional[bool] = None
    operator: Optional[str] = Field(None, max_length=200)
    phone: Optional[str] = Field(None, max_length=50)
    capacity_status: str = "unavailable"

    @model_validator(mode="after")
    def check_capacities(self):
        if (
            self.total_beds is not None
            and self.icu_beds is not None
            and self.icu_beds > self.total_beds
        ):
            raise ValueError("icu_beds cannot exceed total_beds")
        if (
            self.total_beds is not None
            and self.emergency_beds is not None
            and self.emergency_beds > self.total_beds
        ):
            raise ValueError("emergency_beds cannot exceed total_beds")
        return self


class HospitalCreate(HospitalBase):
    hospital_id: str = Field(min_length=1, max_length=10)


class HospitalUpdate(BaseModel):
    hospital_name: Optional[str] = Field(None, min_length=1, max_length=150)
    district: Optional[str] = Field(None, min_length=1, max_length=100)
    locality: Optional[str] = Field(None, max_length=120)
    address: Optional[str] = None
    latitude: Optional[float] = Field(None, ge=-90.0, le=90.0)
    longitude: Optional[float] = Field(None, ge=-180.0, le=180.0)
    hospital_type: Optional[HospitalType] = None
    total_beds: Optional[int] = Field(None, gt=0)
    icu_beds: Optional[int] = Field(None, ge=0)
    emergency_beds: Optional[int] = Field(None, ge=0)
    emergency: Optional[bool] = None
    operator: Optional[str] = Field(None, max_length=200)
    phone: Optional[str] = Field(None, max_length=50)
    capacity_status: Optional[str] = None

    @model_validator(mode="after")
    def check_capacities(self):
        if (
            self.total_beds is not None
            and self.icu_beds is not None
            and self.icu_beds > self.total_beds
        ):
            raise ValueError("icu_beds cannot exceed total_beds")
        if (
            self.total_beds is not None
            and self.emergency_beds is not None
            and self.emergency_beds > self.total_beds
        ):
            raise ValueError("emergency_beds cannot exceed total_beds")
        return self


class HospitalRead(HospitalBase):
    model_config = ConfigDict(from_attributes=True)

    hospital_id: str
