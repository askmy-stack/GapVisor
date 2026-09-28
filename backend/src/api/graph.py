"""Causal Visibility Graph query API (vNext plan section 20)."""

from fastapi import APIRouter, Query

from core.deps import DbSession, WorkspaceId
from schemas.causal_graph import CausalEdgeOut, EdgeListOut
from services.causal_graph import edges_for_entity, trace_prompt_to_brand_mentions

router = APIRouter(prefix="/graph", tags=["graph"])


@router.get("/entities/{entity_id}", response_model=EdgeListOut)
def get_entity_edges(
    entity_id: str,
    db: DbSession,
    workspace_id: WorkspaceId,
    entity_type: str = Query(..., description='e.g. "prompt", "observation", "workspace"'),
) -> EdgeListOut:
    """Every edge where this entity is the source or the target."""
    edges = edges_for_entity(db, workspace_id=workspace_id, entity_type=entity_type, entity_id=entity_id)
    return EdgeListOut(workspace_id=workspace_id, edges=[CausalEdgeOut.model_validate(e) for e in edges])


@router.get("/paths", response_model=EdgeListOut)
def get_paths(
    db: DbSession,
    workspace_id: WorkspaceId,
    prompt_id: str = Query(...),
) -> EdgeListOut:
    """The currently-populated slice of the evidence chain for one prompt:
    prompt -> observations -> brand mentions. See
    services/causal_graph.py's trace_prompt_to_brand_mentions docstring for
    why this is partial by design."""
    edges = trace_prompt_to_brand_mentions(db, workspace_id=workspace_id, prompt_id=prompt_id)
    return EdgeListOut(workspace_id=workspace_id, edges=[CausalEdgeOut.model_validate(e) for e in edges])
