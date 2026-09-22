from functools import lru_cache
from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict

ScanCommitmentMode = Literal["rotating_weekly", "hard_daily"]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    APP_ENV: str = "development"
    DATABASE_URL: str = "postgresql+psycopg2://visibilityos:visibilityos@localhost:5432/visibilityos"
    REDIS_URL: str = "redis://localhost:6379/0"
    SECRET_KEY: str = "visibilityos-dev-secret-change-me-min-32-chars"

    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30
    REFRESH_COOKIE_NAME: str = "vos_refresh"
    REFRESH_COOKIE_SECURE: bool = False
    REFRESH_COOKIE_SAMESITE: str = "lax"

    CORS_ORIGINS: str = "http://localhost:5173,http://127.0.0.1:5173"

    # FR-012 provisional default — confirm before M3. See DECISIONS.md.
    SCAN_COMMITMENT_MODE: ScanCommitmentMode = "rotating_weekly"
    SYNC_SCANS: bool = True
    PARSER_VERSION: int = 1
    PROMPT_QUOTA_DEFAULT: int = 500


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
