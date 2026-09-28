"""Competitor intelligence endpoints (M5 slice)."""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select

from core.deps import DbSession, WorkspaceId
from models import Competitor, MetricDaily

router = APIRouter(prefix="/competitors", tags=["competitors"])


class CompetitorOut(BaseModel):
    id: str
    name: str
    logo_letter: str
    domain: str | None = None
    ticker_symbol: str | None = None
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
            ticker_symbol=r.ticker_symbol,
            is_brand=r.is_brand,
        )
        for r in rows
    ]


class CompetitorPatch(BaseModel):
    domain: str | None = Field(default=None, max_length=255)
    ticker_symbol: str | None = Field(default=None, pattern=r"^[A-Za-z][A-Za-z0-9.\-]{0,15}$")


@router.patch("/{competitor_id}", response_model=CompetitorOut)
def update_competitor(
    competitor_id: str, body: CompetitorPatch, db: DbSession, workspace_id: WorkspaceId
) -> CompetitorOut:
    """Set the identifiers optional company-data adapters join on. An
    explicit null clears a field; an omitted field is left unchanged."""
    competitor = db.get(Competitor, competitor_id)
    if competitor is None or competitor.workspace_id != workspace_id or competitor.archived_at is not None:
        raise HTTPException(status_code=404, detail="Competitor not found")
    fields = body.model_fields_set
    if "domain" in fields:
        competitor.domain = body.domain.strip() if body.domain else None
    if "ticker_symbol" in fields:
        competitor.ticker_symbol = body.ticker_symbol.upper() if body.ticker_symbol else None
    db.commit()
    return CompetitorOut(
        id=competitor.id,
        name=competitor.name,
        logo_letter=competitor.logo_letter,
        domain=competitor.domain,
        ticker_symbol=competitor.ticker_symbol,
        is_brand=competitor.is_brand,
    )
