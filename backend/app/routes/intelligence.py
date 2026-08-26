from fastapi import APIRouter, HTTPException

from app.services import urban_shadow
from app.services.urban_shadow import UrbanRiskInput, UrbanShadowUnavailable

router = APIRouter(prefix="/api/intelligence", tags=["Intelligence"])


@router.get("/urban-status")
def urban_shadow_status():
    return urban_shadow.status()


@router.post("/urban-risk")
def urban_risk(payload: UrbanRiskInput):
    try:
        return urban_shadow.predict(payload)
    except UrbanShadowUnavailable as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
