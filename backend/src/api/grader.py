"""003 GTM — free visibility grader (public, no login)."""

from dataclasses import dataclass

from fastapi import APIRouter
from pydantic import BaseModel, Field

from services.parse import parse_answer
from services.provider import MockProvider

router = APIRouter(tags=["public-grader"])


class GraderRequest(BaseModel):
    brand_name: str = Field(min_length=1)
    domain: str | None = None
    competitors: list[str] = Field(default_factory=list)
    prompt: str = Field(
        default="What are the best tools in this category for a mid-size company?"
    )


class GraderResponse(BaseModel):
    brand_name: str
    visibility_score: float
    outcome: str
    brand_position: int | None
    sample_note: str
    dimensions: dict[str, float]


@dataclass
class _FakeCompetitor:
    id: str
    name: str


@dataclass
class _FakeWorkspace:
    id: str
    brand_name: str


@dataclass
class _FakePrompt:
    id: str
    text: str


@router.post("/public/grader", response_model=GraderResponse)
def visibility_grader(body: GraderRequest) -> GraderResponse:
    """One-shot free diagnostic (HubSpot AEO Grader motion). Mock until live keys."""
    names = body.competitors or ["Competitor A", "Competitor B"]
    competitors = [_FakeCompetitor(id=f"c{i}", name=n) for i, n in enumerate(names)]
    workspace = _FakeWorkspace(id="grader", brand_name=body.brand_name)
    prompt = _FakePrompt(id="grader-prompt", text=body.prompt)
    raw = MockProvider().generate(
        workspace=workspace,  # type: ignore[arg-type]
        prompt=prompt,  # type: ignore[arg-type]
        model_id="chatgpt",
        competitors=competitors,  # type: ignore[arg-type]
    )
    parsed = parse_answer(
        raw_text=raw,
        brand_name=body.brand_name,
        competitors=competitors,  # type: ignore[arg-type]
    )
    score = {"recommended": 82.0, "mentioned": 58.0, "absent": 22.0}.get(parsed.outcome, 40.0)
    if parsed.brand_position:
        score = max(20.0, score - (parsed.brand_position - 1) * 6)
    return GraderResponse(
        brand_name=body.brand_name,
        visibility_score=round(score, 1),
        outcome=parsed.outcome,
        brand_position=parsed.brand_position,
        sample_note="Single mock run — not a statistically reliable sample",
        dimensions={
            "inclusion": 100.0 if parsed.outcome != "absent" else 0.0,
            "position_score": max(0.0, 100.0 - ((parsed.brand_position or 5) - 1) * 15),
            "recommendation": 100.0 if parsed.outcome == "recommended" else 0.0,
        },
    )
