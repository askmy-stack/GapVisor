from fastapi import APIRouter
from sqlalchemy import select

from core.deps import DbSession, WorkspaceId
from models import MetricDaily
from schemas import DashboardOverviewOut, MetricOut

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/overview", response_model=DashboardOverviewOut)
def dashboard_overview(db: DbSession, workspace_id: WorkspaceId) -> DashboardOverviewOut:
    latest_day = db.scalar(
        select(MetricDaily.date)
        .where(MetricDaily.workspace_id == workspace_id)
        .order_by(MetricDaily.date.desc())
        .limit(1)
    )
    if latest_day is None:
        return DashboardOverviewOut(workspace_id=workspace_id, metrics=[])

    rows = db.scalars(
        select(MetricDaily)
        .where(MetricDaily.workspace_id == workspace_id, MetricDaily.date == latest_day)
        .order_by(MetricDaily.metric_key, MetricDaily.model_id, MetricDaily.category_id)
    ).all()
    return DashboardOverviewOut(
        workspace_id=workspace_id,
        metrics=[
            MetricOut(
                metric_key=row.metric_key,
                value=row.value,
                sample_size=row.sample_size,
                model_id=row.model_id,
                category_id=row.category_id,
                competitor_id=row.competitor_id,
            )
            for row in rows
        ],
    )
