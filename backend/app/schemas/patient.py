from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, Field, model_validator

Gender = Literal["M", "F", "Other"]


class PatientBase(BaseModel):
    age: int = Field(ge=0, le=120)
    gender: Gender
    district: str = Field(min_length=1, max_length=100)
    blood_pressure_systolic: int = Field(ge=70, le=250)
    blood_pressure_diastolic: int = Field(ge=40, le=150)
    cholesterol: int = Field(ge=100, le=400)
    glucose: int = Field(ge=50, le=400)
    bmi: float = Field(ge=10.0, le=60.0)
    heart_rate: int = Field(ge=30, le=220)
    previous_cardiac_history: bool = False
    diabetes: bool = False
    hypertension: bool = False

    @model_validator(mode="after")
    def check_blood_pressure(self):
        if self.blood_pressure_diastolic >= self.blood_pressure_systolic:
            raise ValueError(
                "blood_pressure_diastolic must be lower than blood_pressure_systolic"
            )
        return self


class PatientCreate(PatientBase):
    patient_id: str = Field(min_length=1, max_length=10)
    hospital_id: Optional[str] = Field(None, max_length=10)


class PatientUpdate(BaseModel):
    age: Optional[int] = Field(None, ge=0, le=120)
    gender: Optional[Gender] = None
    district: Optional[str] = Field(None, min_length=1, max_length=100)
    blood_pressure_systolic: Optional[int] = Field(None, ge=70, le=250)
    blood_pressure_diastolic: Optional[int] = Field(None, ge=40, le=150)
    cholesterol: Optional[int] = Field(None, ge=100, le=400)
    glucose: Optional[int] = Field(None, ge=50, le=400)
    bmi: Optional[float] = Field(None, ge=10.0, le=60.0)
    heart_rate: Optional[int] = Field(None, ge=30, le=220)
    previous_cardiac_history: Optional[bool] = None
    diabetes: Optional[bool] = None
    hypertension: Optional[bool] = None
    hospital_id: Optional[str] = Field(None, max_length=10)

    @model_validator(mode="after")
    def check_blood_pressure(self):
        if (
            self.blood_pressure_systolic is not None
            and self.blood_pressure_diastolic is not None
            and self.blood_pressure_diastolic >= self.blood_pressure_systolic
        ):
            raise ValueError(
                "blood_pressure_diastolic must be lower than blood_pressure_systolic"
            )
        return self


class PatientRead(PatientBase):
    model_config = ConfigDict(from_attributes=True)

    patient_id: str
    hospital_id: Optional[str] = None


class PatientSummaryRead(PatientRead):
    hospital_name: Optional[str] = None
