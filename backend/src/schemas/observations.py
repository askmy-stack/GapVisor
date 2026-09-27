from datetime import datetime

from pydantic import BaseModel


class ObservationExtractionOut(BaseModel):
    brand_mentioned: bool
    recommendation_rank: int | None
    outcome: str
    sentiment_label: str
    competitor_mentions: dict[str, bool]
    claims: list
    citations: list
    extraction_confidence: float
    parser_version: int

    model_config = {"from_attributes": True}


class ObservationOut(BaseModel):
    """Summary shape for list views — no raw_text (can be large, and the
    list endpoint is meant for scanning provenance/validation at a glance,
    mirroring AnswerSummaryOut vs. AnswerListOut)."""

    id: str
    workspace_id: str
    prompt_id: str
    prompt_family_id: str | None
    answer_id: str | None
    surface: str
    provider: str | None
    model_id: str
    collection_method: str
    region: str | None
    status: str
    latency_ms: int | None
    validation_status: str
    parser_version: int
    normalizer_version: int
    captured_at: datetime
    extraction: ObservationExtractionOut | None

    model_config = {"from_attributes": True}


class ObservationDetailOut(ObservationOut):
    """Detail shape for get-by-id — includes the raw response so the
    evidence behind any metric can be audited or re-parsed."""

    raw_text: str | None
    raw_response_ref: str | None


class ObservationListOut(BaseModel):
    workspace_id: str
    total: int
    limit: int
    offset: int
    observations: list[ObservationOut]
