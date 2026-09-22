from pydantic import BaseModel, Field


class WorkspaceCreateRequest(BaseModel):
    name: str = Field(min_length=1)
    brand_name: str = Field(min_length=1)
    brand_domains: list[str] = Field(default_factory=list)
    monitoring_frequency: str = "weekly"
    timezone: str = "UTC"
    competitors: list[str] = Field(default_factory=list)
    categories: list[str] = Field(default_factory=list)
    regions: list[str] = Field(default_factory=list)


class WorkspaceOut(BaseModel):
    id: str
    name: str
    brand_name: str
    brand_domains: list[str]
    monitoring_frequency: str
    timezone: str
    onboarding_completed_at: str | None = None

    model_config = {"from_attributes": True}


class AiModelOut(BaseModel):
    id: str
    name: str
    long_name: str
    badge: str
    measurement_method: str
    enabled: bool

    model_config = {"from_attributes": True}
