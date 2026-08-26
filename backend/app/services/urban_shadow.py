import logging
from functools import lru_cache
from pathlib import Path
from typing import Any

import joblib
import pandas as pd
from pydantic import BaseModel, ConfigDict

from app.core.config import settings

logger = logging.getLogger(__name__)

DEFAULT_URBAN_SHADOW_MODEL_DIR = Path(
    r"C:\Users\nikhi\OneDrive\Desktop\coding\urban_shadow\data\models"
)

GROUP_FEATURES: dict[str, list[str]] = {
    "heat": ["lst_mean", "lst_summer_mean"],
    "vegetation": ["ndvi_mean", "builtup_percentage"],
    "weather": [
        "humidity",
        "wind_speed",
        "annual_rainfall",
        "max_day_rainfall",
        "max_monsoon_rainfall",
    ],
    "terrain": ["elevation_mean", "elevation_min", "elevation_max"],
    "air": ["pm25", "pm10", "no2", "o3"],
    "population": ["population", "population_density"],
    "night": ["nightlight_mean"],
    "water": ["water_occurrence", "surface_water_occurrence"],
    "roads": ["road_length_km", "major_road_length_km", "intersection_count"],
    "traffic": ["traffic_signal_count"],
    "vehicles": ["parking_count", "fuel_station_count"],
    "walkability": [
        "footway_length_km",
        "cycleway_length_km",
        "crossing_count",
        "pedestrian_area_km2",
        "steps_count",
    ],
    "buildings": ["building_count", "building_area_km2"],
    "green": ["park_area_km2"],
    "drainage": ["drain_length_km"],
    "public_transport": ["bus_stop_count", "metro_station_count", "transit_count"],
    "essential_services": [
        "hospital_count",
        "school_count",
        "pharmacy_count",
        "police_count",
        "public_toilet_count",
    ],
    "commercial": ["commercial_area_km2", "industrial_area_km2", "retail_area_km2"],
}

FEATURE_COLUMNS: list[str] = [
    col for cols in GROUP_FEATURES.values() for col in cols
]

REGRESSOR_FILENAME = "urban_score_regressor.joblib"
CLASSIFIER_FILENAME = "urban_class_classifier.joblib"


class UrbanRiskInput(BaseModel):
    model_config = ConfigDict(extra="forbid", allow_inf_nan=False, protected_namespaces=())

    lst_mean: float = 0.0
    lst_summer_mean: float = 0.0
    ndvi_mean: float = 0.0
    builtup_percentage: float = 0.0
    humidity: float = 0.0
    wind_speed: float = 0.0
    annual_rainfall: float = 0.0
    max_day_rainfall: float = 0.0
    max_monsoon_rainfall: float = 0.0
    elevation_mean: float = 0.0
    elevation_min: float = 0.0
    elevation_max: float = 0.0
    pm25: float = 0.0
    pm10: float = 0.0
    no2: float = 0.0
    o3: float = 0.0
    population: float = 0.0
    population_density: float = 0.0
    nightlight_mean: float = 0.0
    water_occurrence: float = 0.0
    surface_water_occurrence: float = 0.0
    road_length_km: float = 0.0
    major_road_length_km: float = 0.0
    intersection_count: float = 0.0
    traffic_signal_count: float = 0.0
    parking_count: float = 0.0
    fuel_station_count: float = 0.0
    footway_length_km: float = 0.0
    cycleway_length_km: float = 0.0
    crossing_count: float = 0.0
    pedestrian_area_km2: float = 0.0
    steps_count: float = 0.0
    building_count: float = 0.0
    building_area_km2: float = 0.0
    park_area_km2: float = 0.0
    drain_length_km: float = 0.0
    bus_stop_count: float = 0.0
    metro_station_count: float = 0.0
    transit_count: float = 0.0
    hospital_count: float = 0.0
    school_count: float = 0.0
    pharmacy_count: float = 0.0
    police_count: float = 0.0
    public_toilet_count: float = 0.0
    commercial_area_km2: float = 0.0
    industrial_area_km2: float = 0.0
    retail_area_km2: float = 0.0


class UrbanShadowUnavailable(RuntimeError):
    pass


def _model_dir() -> Path:
    configured = settings.URBAN_SHADOW_MODEL_DIR.strip()
    return Path(configured) if configured else DEFAULT_URBAN_SHADOW_MODEL_DIR


def _load_bundle(path: Path, role: str) -> dict[str, Any]:
    if not path.exists():
        raise UrbanShadowUnavailable(
            f"Urban Shadow {role} artifact not found at {path}"
        )
    try:
        bundle = joblib.load(path)
    except Exception as exc:
        raise UrbanShadowUnavailable(
            f"Urban Shadow {role} artifact could not be loaded: {exc}"
        ) from exc
    columns = list(bundle.get("columns") or [])
    if columns != FEATURE_COLUMNS:
        raise UrbanShadowUnavailable(
            f"Urban Shadow {role} artifact feature contract mismatch"
        )
    return bundle


@lru_cache(maxsize=1)
def _cached_model_dir(model_dir_str: str) -> tuple[Any, Any]:
    base = Path(model_dir_str)
    regressor = _load_bundle(base / REGRESSOR_FILENAME, "regressor")
    classifier = _load_bundle(base / CLASSIFIER_FILENAME, "classifier")
    logger.info("Urban Shadow models loaded from %s", base)
    return regressor, classifier


def status() -> dict[str, Any]:
    base = _model_dir()
    regressor_path = base / REGRESSOR_FILENAME
    classifier_path = base / CLASSIFIER_FILENAME
    available = regressor_path.exists() and classifier_path.exists()
    info: dict[str, Any] = {
        "integration": "urban-shadow",
        "mode": settings.URBAN_SHADOW_MODE,
        "model_dir": str(base),
        "available": False,
        "feature_count": len(FEATURE_COLUMNS),
        "feature_groups": sorted(GROUP_FEATURES.keys()),
        "reason": None,
    }
    if settings.URBAN_SHADOW_MODE == "api":
        info["api_url"] = settings.URBAN_SHADOW_API_URL or "(not configured)"
        info["available"] = bool(settings.URBAN_SHADOW_API_URL)
        if not info["available"]:
            info["reason"] = "URBAN_SHADOW_API_URL is not configured"
        return info
    if not available:
        info["reason"] = "Regressor and/or classifier joblib artifacts not found"
        return info
    try:
        regressor_bundle, classifier_bundle = _cached_model_dir(str(base))
        estimator = regressor_bundle["model"]
        classes = [str(c) for c in getattr(classifier_bundle["model"], "classes_", [])]
        info.update(
            {
                "available": True,
                "model_type": type(estimator).__name__,
                "output_classes": classes,
            }
        )
    except UrbanShadowUnavailable as exc:
        info["reason"] = str(exc)
    return info


def predict(payload: UrbanRiskInput) -> dict[str, Any]:
    if settings.URBAN_SHADOW_MODE == "api":
        return _predict_via_api(payload)
    return _predict_local(payload)


def _predict_local(payload: UrbanRiskInput) -> dict[str, Any]:
    base_str = str(_model_dir())
    try:
        regressor_bundle, classifier_bundle = _cached_model_dir(base_str)
    except UrbanShadowUnavailable:
        raise
    row = pd.DataFrame(
        [[getattr(payload, col) for col in FEATURE_COLUMNS]],
        columns=FEATURE_COLUMNS,
    )
    regressor = regressor_bundle["model"]
    classifier = classifier_bundle["model"]
    try:
        score = float(regressor.predict(row)[0])
        usability_class = str(classifier.predict(row)[0])
    except Exception as exc:
        raise UrbanShadowUnavailable(f"Urban Shadow inference failed: {exc}") from exc
    return {
        "model": "urban-shadow-random-forest",
        "mode": "local-artifacts",
        "feature_count": len(FEATURE_COLUMNS),
        "urban_usability_score": round(score, 2),
        "usability_class": usability_class,
    }


def _predict_via_api(payload: UrbanRiskInput) -> dict[str, Any]:
    import httpx

    api_url = settings.URBAN_SHADOW_API_URL.strip().rstrip("/")
    if not api_url:
        raise UrbanShadowUnavailable("URBAN_SHADOW_API_URL is not configured")
    try:
        response = httpx.post(
            f"{api_url}/api/v1/score/predict",
            json=payload.model_dump(),
            timeout=15.0,
        )
        response.raise_for_status()
        body = response.json()
    except Exception as exc:
        raise UrbanShadowUnavailable(
            f"Urban Shadow API at {api_url} is unavailable: {exc}"
        ) from exc
    return {
        "model": "urban-shadow-random-forest",
        "mode": "remote-api",
        "feature_count": len(FEATURE_COLUMNS),
        "urban_usability_score": body.get("urban_usability_score"),
        "usability_class": body.get("usability_class"),
    }
