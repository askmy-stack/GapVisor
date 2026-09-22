from datetime import datetime

from pydantic import BaseModel, Field


class PromptCreateRequest(BaseModel):
    text: str = Field(min_length=1)
    category_id: str | None = None
    status: str = "active"
    samples_per_run: int = Field(default=1, ge=1)


class PromptPatchRequest(BaseModel):
    text: str | None = Field(default=None, min_length=1)
    category_id: str | None = None
    status: str | None = None
    samples_per_run: int | None = Field(default=None, ge=1)
    archived: bool | None = None


class PromptOut(BaseModel):
    id: str
    workspace_id: str
    text: str
    category_id: str | None
    status: str
    samples_per_run: int
    archived_at: datetime | None = None

    model_config = {"from_attributes": True}


class RunPromptRequest(BaseModel):
    model_ids: list[str] | None = None


class ScanRequest(BaseModel):
    workspace_id: str | None = None
    prompt_id: str | None = None
    model_ids: list[str] | None = None


class AnswerSummaryOut(BaseModel):
    id: str
    prompt_id: str
    model_id: str
    status: str
    brand_position: int | None
    outcome: str
    sentiment_label: str
    parser_version: int
    created_at: datetime

    model_config = {"from_attributes": True}


class AnswerListOut(AnswerSummaryOut):
    prompt_text: str | None = None
    raw_text: str | None = None


class MetricOut(BaseModel):
    metric_key: str
    value: float
    sample_size: int
    model_id: str | None = None
    category_id: str | None = None
    competitor_id: str | None = None


class DashboardOverviewOut(BaseModel):
    workspace_id: str
    metrics: list[MetricOut]


class MonitoringOverviewOut(BaseModel):
    workspace_id: str
    active_prompts: int
    total_answers: int
    latest_answer_at: datetime | None
    sync_scans: bool
