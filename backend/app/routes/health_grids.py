from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models import HealthGrid
from app.schemas.health_grid import HealthGridCreate, HealthGridRead, HealthGridUpdate

router = APIRouter(prefix="/api/health-grids", tags=["Health Grids"])


@router.get("", response_model=list[HealthGridRead])
def list_health_grids(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    district: Optional[str] = Query(None, max_length=100),
    db: Session = Depends(get_db),
):
    stmt = select(HealthGrid).order_by(HealthGrid.grid_id)
    if district:
        stmt = stmt.where(HealthGrid.district == district)
    return list(db.scalars(stmt.offset(skip).limit(limit)))


@router.get("/{grid_id}", response_model=HealthGridRead)
def get_health_grid(grid_id: str, db: Session = Depends(get_db)):
    grid = db.get(HealthGrid, grid_id)
    if grid is None:
        raise HTTPException(status_code=404, detail="Health grid not found")
    return grid


@router.post("", response_model=HealthGridRead, status_code=201)
def create_health_grid(payload: HealthGridCreate, db: Session = Depends(get_db)):
    if db.get(HealthGrid, payload.grid_id) is not None:
        raise HTTPException(
            status_code=400,
            detail=f"Health grid '{payload.grid_id}' already exists",
        )
    grid = HealthGrid(**payload.model_dump())
    db.add(grid)
    db.commit()
    db.refresh(grid)
    return grid


@router.put("/{grid_id}", response_model=HealthGridRead)
def update_health_grid(grid_id: str, payload: HealthGridUpdate, db: Session = Depends(get_db)):
    grid = db.get(HealthGrid, grid_id)
    if grid is None:
        raise HTTPException(status_code=404, detail="Health grid not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(grid, field, value)
    db.commit()
    db.refresh(grid)
    return grid


@router.delete("/{grid_id}", status_code=204)
def delete_health_grid(grid_id: str, db: Session = Depends(get_db)):
    grid = db.get(HealthGrid, grid_id)
    if grid is None:
        raise HTTPException(status_code=404, detail="Health grid not found")
    db.delete(grid)
    db.commit()
    return None
