"""Competitor intelligence endpoints (M5 slice)."""

from fastapi import APIRouter
from pydantic import BaseModel
from sqlalchemy import select

from core.deps import DbSession, WorkspaceId
from models import Competitor, MetricDaily

router = APIRouter(prefix="/competitors", tags=["competitors"])


class CompetitorOut(BaseModel):
    id: str
    name: str
    logo_letter: str
    domain: str | None = None
    is_brand: bool
    share: float | None = None
    sample_size: int | None = None

    model_config = {"from_attributes": True}


class CompetitorsOverviewOut(BaseModel):
    workspace_id: str
    competitors: list[CompetitorOut]


@router.get("/overview", response_model=CompetitorsOverviewOut)
def competitors_overview(db: DbSession, workspace_id: WorkspaceId) -> CompetitorsOverviewOut:
    comps = list(
        db.scalars(
            select(Competitor).where(
                Competitor.workspace_id == workspace_id,
                Competitor.archived_at.is_(None),
            )
        ).all()
    )
    out: list[CompetitorOut] = []
    for c in comps:
        metric = db.scalar(
            select(MetricDaily)
            .where(
                MetricDaily.workspace_id == workspace_id,
                MetricDaily.metric_key == "share_of_voice",
                MetricDaily.competitor_id == c.id,
            )
            .order_by(MetricDaily.date.desc())
            .limit(1)
        )
        out.append(
            CompetitorOut(
                id=c.id,
                name=c.name,
                logo_letter=c.logo_letter,
                domain=c.domain,
                is_brand=c.is_brand,
                share=metric.value if metric else None,
                sample_size=metric.sample_size if metric else None,
            )
        )
    return CompetitorsOverviewOut(workspace_id=workspace_id, competitors=out)


@router.get("", response_model=list[CompetitorOut])
def list_competitors(db: DbSession, workspace_id: WorkspaceId) -> list[CompetitorOut]:
    rows = db.scalars(
        select(Competitor).where(
            Competitor.workspace_id == workspace_id,
            Competitor.archived_at.is_(None),
        )
    ).all()
    return [
        CompetitorOut(
            id=r.id,
            name=r.name,
            logo_letter=r.logo_letter,
            domain=r.domain,
            is_brand=r.is_brand,
        )
        for r in rows
    ]
