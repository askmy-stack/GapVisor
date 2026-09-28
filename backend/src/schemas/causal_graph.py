from datetime import datetime

from pydantic import BaseModel


class CausalEdgeOut(BaseModel):
    id: str
    source_type: str
    source_id: str
    target_type: str
    target_id: str
    edge_type: str
    observed_at: datetime
    evidence_refs: list
    confidence: float
    causal_status: str

    model_config = {"from_attributes": True}


class EdgeListOut(BaseModel):
    workspace_id: str
    edges: list[CausalEdgeOut]
