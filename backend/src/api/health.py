from fastapi import APIRouter

from core.config import settings

router = APIRouter(tags=["health"])


@router.get("/healthz")
def healthz() -> dict:
    return {
        "status": "ok",
        "service": "visibilityos-api",
        "env": settings.APP_ENV,
        "scan_commitment_mode": settings.SCAN_COMMITMENT_MODE,
    }
