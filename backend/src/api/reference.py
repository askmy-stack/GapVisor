from fastapi import APIRouter
from sqlalchemy import select

from core.deps import DbSession
from models import AiModel
from schemas import AiModelOut

router = APIRouter(prefix="/reference", tags=["reference"])


@router.get("/models", response_model=list[AiModelOut])
def list_models(db: DbSession) -> list[AiModelOut]:
    rows = db.scalars(select(AiModel).where(AiModel.enabled.is_(True)).order_by(AiModel.name)).all()
    return [AiModelOut.model_validate(r) for r in rows]


@router.get("/setup")
def setup_reference() -> dict:
    """Minimal setup reference for the workspace wizard (expanded in M1)."""
    return {
        "suggested_categories": [
            "API Gateways",
            "CI/CD Platforms",
            "Vector Databases",
            "Cloud Infrastructure",
            "Security Orchestration",
            "NoSQL Databases",
        ],
        "regions": [
            {"id": "us", "name": "United States", "region_method": "signaled"},
            {"id": "uk", "name": "United Kingdom", "region_method": "signaled"},
            {"id": "de", "name": "Germany", "region_method": "signaled"},
            {"id": "in", "name": "India", "region_method": "signaled"},
            {"id": "br", "name": "Brazil", "region_method": "signaled"},
            {"id": "global", "name": "Global", "region_method": "signaled"},
        ],
        "frequencies": [
            {"id": "realtime", "label": "Daily", "tier": "Enterprise"},
            {"id": "weekly", "label": "Weekly", "tier": "Pro", "recommended": True},
            {"id": "biweekly", "label": "Bi-weekly", "tier": "Starter"},
        ],
        "defaults": {
            "monitoring_frequency": "weekly",
            "region_method": "signaled",
        },
    }
