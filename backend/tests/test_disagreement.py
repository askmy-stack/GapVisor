"""vNext Phase G3: Model Disagreement Index."""

from datetime import UTC, datetime

import pytest
from sqlalchemy import create_engine
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import sessionmaker

from models import AiModel, Observation, ObservationExtraction, Prompt
from models.base import Base
from services.disagreement import (
    CITATION_AGREEMENT_UNAVAILABLE_REASON,
    compute_prompt_disagreement,
    compute_workspace_disagreement,
)

WORKSPACE_ID = "workspace-1"


@pytest.fixture
def db():
    engine = create_engine("sqlite+pysqlite:///:memory:")
    try:
        Base.metadata.create_all(
            engine,
            tables=[
                AiModel.__table__,
                Prompt.__table__,
                Observation.__table__,
                ObservationExtraction.__table__,
            ],
        )
    except SQLAlchemyError as exc:
        pytest.skip(f"SQLite cannot create the disagreement tables in this environment: {exc}")

    Session = sessionmaker(bind=engine)
    session = Session()
    yield session
    session.close()


def _add_observation(
    db,
    *,
    obs_id: str,
    prompt_id: str,
    model_id: str,
    brand_mentioned: bool,
    recommendation_rank: int | None,
    validation_status: str = "VALID",
    captured_at: datetime | None = None,
):
    db.add(
        Observation(
            id=obs_id,
            workspace_id=WORKSPACE_ID,
            prompt_id=prompt_id,
            model_id=model_id,
            surface=model_id,
            provider="test",
            collection_method="api",
            status="completed",
            validation_status=validation_status,
            parser_version=1,
            normalizer_version=1,
            captured_at=captured_at or datetime.now(UTC),
        )
    )
    db.add(
        ObservationExtraction(
            observation_id=obs_id,
            brand_mentioned=brand_mentioned,
            recommendation_rank=recommendation_rank,
            outcome="recommended" if brand_mentioned else "absent",
            sentiment_label="positive" if brand_mentioned else "neutral",
            competitor_mentions={},
            claims=[],
            citations=[],
            extraction_confidence=1.0,
            parser_version=1,
        )
    )


def test_no_observations_returns_none(db):
    db.add(Prompt(id="prompt-1", workspace_id=WORKSPACE_ID, text="Best API gateway?"))
    db.commit()

    result = compute_prompt_disagreement(db, workspace_id=WORKSPACE_ID, prompt_id="prompt-1")
    assert result is None


def test_wrong_workspace_returns_none(db):
    db.add(Prompt(id="prompt-1", workspace_id="other-workspace", text="Best API gateway?"))
    db.commit()

    result = compute_prompt_disagreement(db, workspace_id=WORKSPACE_ID, prompt_id="prompt-1")
    assert result is None


def test_unanimous_agreement_is_high_stability(db):
    """All 4 models mention the brand at rank 1 -> perfect agreement both
    ways -> HIGH stability, matching the plan's own worked example shape
    (four models, ranks visible) but with real agreement math."""
    db.add(Prompt(id="prompt-1", workspace_id=WORKSPACE_ID, text="Best API gateway?"))
    db.commit()
    for i, model_id in enumerate(["chatgpt", "claude", "gemini", "perplexity"]):
        _add_observation(
            db,
            obs_id=f"obs-{i}",
            prompt_id="prompt-1",
            model_id=model_id,
            brand_mentioned=True,
            recommendation_rank=1,
        )
    db.commit()

    result = compute_prompt_disagreement(db, workspace_id=WORKSPACE_ID, prompt_id="prompt-1")
    assert result is not None
    assert len(result.models) == 4
    assert result.presence_agreement == 1.0
    assert result.rank_agreement == 1.0
    assert result.stability_band == "HIGH"
    assert result.citation_agreement is None
    assert result.citation_agreement_reason == CITATION_AGREEMENT_UNAVAILABLE_REASON


def test_mixed_presence_and_rank_is_lower_stability(db):
    """3 of 4 models mention the brand (presence_agreement = 0.75, matching
    the plan's own worked example number), and their ranks vary a lot."""
    db.add(Prompt(id="prompt-1", workspace_id=WORKSPACE_ID, text="Best API gateway?"))
    db.commit()
    _add_observation(db, obs_id="o1", prompt_id="prompt-1", model_id="chatgpt", brand_mentioned=True, recommendation_rank=1)
    _add_observation(db, obs_id="o2", prompt_id="prompt-1", model_id="claude", brand_mentioned=True, recommendation_rank=3)
    _add_observation(db, obs_id="o3", prompt_id="prompt-1", model_id="gemini", brand_mentioned=False, recommendation_rank=None)
    _add_observation(db, obs_id="o4", prompt_id="prompt-1", model_id="perplexity", brand_mentioned=True, recommendation_rank=2)
    db.commit()

    result = compute_prompt_disagreement(db, workspace_id=WORKSPACE_ID, prompt_id="prompt-1")
    assert result is not None
    assert result.presence_agreement == 0.75
    # ranks [1, 2, 3]: mean=2, pstdev=sqrt(2/3)≈0.816 -> agreement ≈ 1 - 0.408 ≈ 0.592
    assert result.rank_agreement is not None
    assert 0.55 < result.rank_agreement < 0.65
    assert result.stability_band == "MODERATE"


def test_single_ranked_model_has_no_rank_agreement(db):
    """Rank agreement needs at least two ranked models to measure spread;
    with only one, it's undefined rather than a fake perfect 1.0."""
    db.add(Prompt(id="prompt-1", workspace_id=WORKSPACE_ID, text="Best API gateway?"))
    db.commit()
    _add_observation(db, obs_id="o1", prompt_id="prompt-1", model_id="chatgpt", brand_mentioned=True, recommendation_rank=1)
    db.commit()

    result = compute_prompt_disagreement(db, workspace_id=WORKSPACE_ID, prompt_id="prompt-1")
    assert result is not None
    assert result.rank_agreement is None
    # presence_agreement alone still drives the band (1.0 -> HIGH)
    assert result.presence_agreement == 1.0
    assert result.stability_band == "HIGH"


def test_uses_latest_observation_per_model_not_oldest(db):
    """A model that flips from mentioning to not-mentioning over time
    should count by its latest scan, not an earlier one."""
    db.add(Prompt(id="prompt-1", workspace_id=WORKSPACE_ID, text="Best API gateway?"))
    db.commit()
    _add_observation(
        db,
        obs_id="o-old",
        prompt_id="prompt-1",
        model_id="chatgpt",
        brand_mentioned=True,
        recommendation_rank=1,
        captured_at=datetime(2026, 1, 1, tzinfo=UTC),
    )
    _add_observation(
        db,
        obs_id="o-new",
        prompt_id="prompt-1",
        model_id="chatgpt",
        brand_mentioned=False,
        recommendation_rank=None,
        captured_at=datetime(2026, 6, 1, tzinfo=UTC),
    )
    db.commit()

    result = compute_prompt_disagreement(db, workspace_id=WORKSPACE_ID, prompt_id="prompt-1")
    assert result is not None
    assert len(result.models) == 1
    assert result.models[0].brand_mentioned is False


def test_ignores_uncertain_and_invalid_observations(db):
    """Only VALID observations feed the index — an UNCERTAIN/INVALID one
    shouldn't quietly count as a real model opinion."""
    db.add(Prompt(id="prompt-1", workspace_id=WORKSPACE_ID, text="Best API gateway?"))
    db.commit()
    _add_observation(
        db,
        obs_id="o1",
        prompt_id="prompt-1",
        model_id="chatgpt",
        brand_mentioned=True,
        recommendation_rank=1,
        validation_status="UNCERTAIN",
    )
    db.commit()

    result = compute_prompt_disagreement(db, workspace_id=WORKSPACE_ID, prompt_id="prompt-1")
    assert result is None


def test_compute_workspace_disagreement_skips_prompts_with_no_data(db):
    db.add(Prompt(id="prompt-1", workspace_id=WORKSPACE_ID, text="Has data"))
    db.add(Prompt(id="prompt-2", workspace_id=WORKSPACE_ID, text="No data yet"))
    db.commit()
    _add_observation(db, obs_id="o1", prompt_id="prompt-1", model_id="chatgpt", brand_mentioned=True, recommendation_rank=1)
    db.commit()

    results = compute_workspace_disagreement(db, workspace_id=WORKSPACE_ID, prompt_ids=["prompt-1", "prompt-2"])
    assert len(results) == 1
    assert results[0].prompt_id == "prompt-1"
