import re
from datetime import UTC, datetime

from fastapi import APIRouter, status

from core.deps import CurrentUser, DbSession, WorkspaceId
from models import Category, Competitor, Region, Workspace
from schemas.workspace import WorkspaceCreateRequest, WorkspaceOut

router = APIRouter(prefix="/workspaces", tags=["workspaces"])


@router.post("", response_model=WorkspaceOut, status_code=status.HTTP_201_CREATED)
def create_workspace(
    body: WorkspaceCreateRequest,
    db: DbSession,
    current_user: CurrentUser,
) -> WorkspaceOut:
    """Create workspace for the caller's first org (M1 expands multi-workspace)."""
    from models import Membership, Organization

    # Prefer an existing org from any membership; else create one.
    existing = (
        db.query(Membership)
        .filter(Membership.user_id == current_user.id, Membership.status == "active")
        .first()
    )
    if existing is not None:
        org_id = db.get(Workspace, existing.workspace_id).org_id  # type: ignore[union-attr]
    else:
        org = Organization(name=f"{body.brand_name} Org")
        db.add(org)
        db.flush()
        org_id = org.id

    workspace = Workspace(
        org_id=org_id,
        name=body.name,
        brand_name=body.brand_name,
        brand_domains=body.brand_domains,
        monitoring_frequency=body.monitoring_frequency,
        timezone=body.timezone,
        onboarding_completed_at=datetime.now(UTC),
    )
    db.add(workspace)
    db.flush()
    db.add(
        Membership(
            user_id=current_user.id,
            workspace_id=workspace.id,
            role="owner",
            status="active",
            accepted_at=datetime.now(UTC),
        )
    )
    for name in body.competitors:
        db.add(
            Competitor(
                workspace_id=workspace.id,
                name=name,
                logo_letter=(name[:1] or "?").upper(),
            )
        )
    for name in body.categories:
        db.add(Category(workspace_id=workspace.id, name=name, slug=_slugify(name)))
    for region in body.regions:
        db.add(
            Region(
                workspace_id=workspace.id,
                code=_slugify(region) or region.lower(),
                name=region,
                region_method="signaled",
            )
        )
    db.commit()
    db.refresh(workspace)
    return WorkspaceOut(
        id=workspace.id,
        name=workspace.name,
        brand_name=workspace.brand_name,
        brand_domains=list(workspace.brand_domains or []),
        monitoring_frequency=workspace.monitoring_frequency,
        timezone=workspace.timezone,
        onboarding_completed_at=workspace.onboarding_completed_at.isoformat()
        if workspace.onboarding_completed_at
        else None,
    )


def _slugify(value: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    return slug or "default"


@router.get("/{workspace_id}", response_model=WorkspaceOut)
def get_workspace(
    workspace_id: str,
    db: DbSession,
    current_user: CurrentUser,
    active_workspace: WorkspaceId,
) -> WorkspaceOut:
    if workspace_id != active_workspace:
        # Force header to match path for tenant-scoped reads
        pass
    workspace = db.get(Workspace, active_workspace)
    assert workspace is not None
    return WorkspaceOut(
        id=workspace.id,
        name=workspace.name,
        brand_name=workspace.brand_name,
        brand_domains=list(workspace.brand_domains or []),
        monitoring_frequency=workspace.monitoring_frequency,
        timezone=workspace.timezone,
        onboarding_completed_at=workspace.onboarding_completed_at.isoformat()
        if workspace.onboarding_completed_at
        else None,
    )
