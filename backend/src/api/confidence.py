"""006 Confidence API — inspect whether a metric move is noise."""

from fastapi import APIRouter
from pydantic import BaseModel, Field

from services.confidence import is_meaningful_change, mean_with_interval

router = APIRouter(prefix="/confidence", tags=["confidence"])


class SeriesRequest(BaseModel):
    values: list[float] = Field(default_factory=list)


class ChangeRequest(BaseModel):
    before: float
    after: float
    sample_size: int


@router.post("/series")
def analyze_series(body: SeriesRequest) -> dict:
    return mean_with_interval(body.values)


@router.post("/change")
def analyze_change(body: ChangeRequest) -> dict:
    return is_meaningful_change(body.before, body.after, body.sample_size)
