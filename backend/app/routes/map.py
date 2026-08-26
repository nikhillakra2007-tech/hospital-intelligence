from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.db.database import get_db
from app.models.map import DelhiGridCell, DelhiHospital

router = APIRouter(prefix="/api/map", tags=["Map"])


@router.get("/delhi")
def delhi_map(db: Session = Depends(get_db)):
    """Urban Shadow Delhi spatial layer: real 500m grid cells, NCT boundary,
    and OSM healthcare facility points imported into hospital_intelligence."""
    cells = db.execute(
        select(
            DelhiGridCell.grid_id,
            DelhiGridCell.center_lat,
            DelhiGridCell.center_lng,
            DelhiGridCell.boundary,
        ).order_by(DelhiGridCell.grid_id)
    ).all()

    hospitals = db.execute(
        select(
            DelhiHospital.source_element,
            DelhiHospital.source_id,
            DelhiHospital.name,
            DelhiHospital.kind,
            DelhiHospital.emergency,
            DelhiHospital.beds,
            DelhiHospital.operator,
            DelhiHospital.phone,
            DelhiHospital.addr_street,
            DelhiHospital.addr_city,
            DelhiHospital.addr_district,
            DelhiHospital.addr_postcode,
            DelhiHospital.lat,
            DelhiHospital.lng,
        ).order_by(DelhiHospital.name.nulls_last(), DelhiHospital.source_id)
    ).all()

    rings = db.execute(text("SELECT rings FROM delhi_boundary WHERE id = 1")).scalar_one()

    return {
        "source": "urban-shadow",
        "cell_count": len(cells),
        "hospital_count": len(hospitals),
        "named_count": sum(1 for h in hospitals if h[2]),
        "boundary_rings": rings,
        "grids": [
            {
                "id": c[0],
                "lat": round(c[1], 6),
                "lng": round(c[2], 6),
                "ring": c[3],
            }
            for c in cells
        ],
        "hospitals": [
            {
                "element": h[0],
                "id": h[1],
                "name": h[2],
                "kind": h[3],
                "emergency": h[4],
                "beds": h[5],
                "operator": h[6],
                "phone": h[7],
                "addr_street": h[8],
                "addr_city": h[9],
                "addr_district": h[10],
                "postcode": h[11],
                "lat": h[12],
                "lng": h[13],
            }
            for h in hospitals
        ],
    }
