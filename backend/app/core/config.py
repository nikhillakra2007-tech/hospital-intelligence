from pathlib import Path
from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(BASE_DIR / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    DATABASE_URL: str

    URBAN_SHADOW_MODE: Literal["local", "api"] = "local"
    URBAN_SHADOW_MODEL_DIR: str = ""
    URBAN_SHADOW_API_URL: str = ""


settings = Settings()
