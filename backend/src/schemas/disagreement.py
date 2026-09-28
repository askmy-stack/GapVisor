from pydantic import BaseModel


class ModelSnapshotOut(BaseModel):
    model_id: str
    surface: str
    brand_mentioned: bool
    recommendation_rank: int | None
    validation_status: str

    model_config = {"from_attributes": True}


class PromptDisagreementOut(BaseModel):
    prompt_id: str
    prompt_text: str
    models: list[ModelSnapshotOut]
    presence_agreement: float | None
    rank_agreement: float | None
    citation_agreement: float | None
    citation_agreement_reason: str | None
    stability_band: str | None

    model_config = {"from_attributes": True}


class DisagreementListOut(BaseModel):
    workspace_id: str
    prompts: list[PromptDisagreementOut]
