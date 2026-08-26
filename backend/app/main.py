from fastapi import APIRouter, Depends, FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.exc import IntegrityError, OperationalError
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.routes import (
    environmental_data,
    health_grids,
    hospital_operations,
    hospitals,
    intelligence,
    map as map_routes,
    patients,
    risk as risk_ml_routes,
    risk_assessments,
)
from app.services import health_intelligence

app = FastAPI(
    title="Hospital Intelligence API",
    version="0.1.0",
    description="Backend API for the Hospital Intelligence platform.",
)

ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "*",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(patients.router)
app.include_router(hospitals.router)
app.include_router(hospital_operations.router)
app.include_router(health_grids.router)
app.include_router(environmental_data.router)
app.include_router(risk_assessments.router)
app.include_router(intelligence.router)
app.include_router(map_routes.router)
app.include_router(risk_ml_routes.router)

dashboard_router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])


@dashboard_router.get("/summary")
def dashboard_summary(db: Session = Depends(get_db)):
    return health_intelligence.get_dashboard_summary(db)


@dashboard_router.get("/hospital-capacity")
def dashboard_hospital_capacity(db: Session = Depends(get_db)):
    return health_intelligence.get_hospital_capacity(db)


@dashboard_router.get("/risk-distribution")
def dashboard_risk_distribution(db: Session = Depends(get_db)):
    return health_intelligence.get_risk_distribution(db)


@dashboard_router.get("/environment")
def dashboard_environment(db: Session = Depends(get_db)):
    return health_intelligence.get_environment_summary(db)


app.include_router(dashboard_router)


@app.get("/health", tags=["Health"])
def health_check():
    return {"status": "ok"}


@app.exception_handler(IntegrityError)
def integrity_error_handler(request: Request, exc: IntegrityError):
    return JSONResponse(
        status_code=400,
        content={"detail": "Invalid reference or duplicate record."},
    )


@app.exception_handler(OperationalError)
def operational_error_handler(request: Request, exc: OperationalError):
    return JSONResponse(
        status_code=503,
        content={"detail": "Database is unavailable."},
    )
