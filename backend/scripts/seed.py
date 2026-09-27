"""Seed demo workspace (Northstar) + AI model catalog."""

from __future__ import annotations

import random
import sys
from datetime import UTC, datetime, timedelta
from pathlib import Path

# Allow running as `python scripts/seed.py` from backend/
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from sqlalchemy import select
from sqlalchemy.orm import Session

from adapters.providers import MockProvider
from core.config import settings
from core.db import SessionLocal
from core.security import hash_password
from models import (
    AiModel,
    Answer,
    AnswerMention,
    Category,
    Competitor,
    Membership,
    Observation,
    Organization,
    Prompt,
    Region,
    User,
    Workspace,
)
from services.parse import ParsedAnswer, parse_answer
from services.rollup import rollup_answers
from services.scan import record_observation

CATALOG = [
    {
        "id": "chatgpt",
        "name": "ChatGPT",
        "long_name": "ChatGPT 4o",
        "badge": "C",
        "provider": "openai",
        "provider_model_id": "gpt-4o",
        "measurement_method": "api",
        "supports_native_citations": False,
    },
    {
        "id": "claude",
        "name": "Claude",
        "long_name": "Claude 3.5 Sonnet",
        "badge": "Cl",
        "provider": "anthropic",
        "provider_model_id": "claude-3-5-sonnet-latest",
        "measurement_method": "api",
        "supports_native_citations": False,
    },
    {
        "id": "gemini",
        "name": "Gemini",
        "long_name": "Gemini 1.5 Pro",
        "badge": "G",
        "provider": "google",
        "provider_model_id": "gemini-1.5-pro",
        "measurement_method": "api",
        "supports_native_citations": False,
    },
    {
        "id": "perplexity",
        "name": "Perplexity",
        "long_name": "Perplexity",
        "badge": "P",
        "provider": "perplexity",
        "provider_model_id": "sonar-pro",
        "measurement_method": "api",
        "supports_native_citations": True,
    },
    {
        "id": "ai-api-key",
        "name": "AI API Key",
        "long_name": "Customer-connected AI API",
        "badge": "AK",
        "provider": None,
        "provider_model_id": None,
        "measurement_method": "customer_key",
        "supports_native_citations": False,
    },
    {
        "id": "buyer-agents",
        "name": "Buyer AI Agents",
        "long_name": "Buyer AI Agents (derived)",
        "badge": "BA",
        "provider": None,
        "provider_model_id": None,
        "measurement_method": "derived",
        "supports_native_citations": False,
    },
]

COMPETITORS = ["Kong", "Postman", "Tyk", "Apigee", "MuleSoft"]
CATEGORIES = ["API Gateways", "Developer Platforms", "API Observability"]
REGIONS = [
    ("global", "Global"),
    ("us", "United States"),
    ("eu", "Europe"),
]
# Grouped by category so the backfill below spreads scans realistically across
# the workspace's monitored surface area instead of a single default bucket.
PROMPTS_BY_CATEGORY: dict[str, list[str]] = {
    "API Gateways": [
        "What are the best API gateway platforms for developer-first teams?",
        "Which API gateway handles high-traffic enterprise workloads best?",
        "Compare API gateways for teams migrating off legacy middleware.",
    ],
    "Developer Platforms": [
        "Recommend a platform for managing API programs across engineering teams.",
        "What developer platform should a fast-moving startup adopt for API delivery?",
        "Which tools give the best developer experience for publishing internal APIs?",
    ],
    "API Observability": [
        "Which tools should I consider for API monitoring and visibility?",
        "What's the best way to track API reliability and latency across providers?",
        "Recommend a platform for AI-driven API observability and alerting.",
    ],
}

# Models actually invoked during the historical backfill; "buyer-agents" is a
# derived/observational model_id (no direct provider calls), so it's excluded.
BACKFILL_MODEL_IDS = ["chatgpt", "claude", "gemini", "perplexity", "ai-api-key"]
BACKFILL_DAYS = 14


def seed() -> None:
    db = SessionLocal()
    try:
        for row in CATALOG:
            existing = db.get(AiModel, row["id"])
            if existing is None:
                db.add(AiModel(**row))
            else:
                for k, v in row.items():
                    setattr(existing, k, v)

        demo_email = "demo@northstar.dev"
        user = db.scalar(select(User).where(User.email == demo_email))
        workspace: Workspace
        if user is None:
            org = Organization(name="Northstar Dev Tools")
            db.add(org)
            db.flush()
            workspace = Workspace(
                org_id=org.id,
                name="Northstar Workspace",
                brand_name="Northstar",
                brand_domains=["northstar.dev"],
                monitoring_frequency="weekly",
                timezone="UTC",
                onboarding_completed_at=datetime.now(UTC),
                fact_sheet="Northstar is an API gateway and developer tooling company.",
            )
            db.add(workspace)
            db.flush()
            user = User(
                email=demo_email,
                password_hash=hash_password("GapVisor-Demo-2026!"),
                name="Morgan Reyes",
            )
            db.add(user)
            db.flush()
            db.add(
                Membership(
                    user_id=user.id,
                    workspace_id=workspace.id,
                    role="owner",
                    status="active",
                    accepted_at=datetime.now(UTC),
                )
            )
            print(f"Seeded demo user {demo_email} / GapVisor-Demo-2026!")
            print(f"Workspace id: {workspace.id}")
        else:
            membership = db.scalar(select(Membership).where(Membership.user_id == user.id))
            assert membership is not None
            workspace = db.get(Workspace, membership.workspace_id)  # type: ignore[assignment]
            assert workspace is not None
            print(f"Demo user already exists: {demo_email}")

        db.commit()
        seed_platform(db, workspace)
    finally:
        db.close()


def seed_platform(db: Session, workspace: Workspace) -> None:
    brand_row = db.scalar(
        select(Competitor).where(
            Competitor.workspace_id == workspace.id,
            Competitor.is_brand.is_(True),
        )
    )
    if brand_row is None:
        db.add(
            Competitor(
                workspace_id=workspace.id,
                name=workspace.brand_name,
                logo_letter=workspace.brand_name[:1].upper(),
                domain=workspace.brand_domains[0] if workspace.brand_domains else None,
                is_brand=True,
            )
        )

    for name in COMPETITORS:
        existing = db.scalar(
            select(Competitor).where(
                Competitor.workspace_id == workspace.id,
                Competitor.name == name,
            )
        )
        if existing is None:
            db.add(
                Competitor(
                    workspace_id=workspace.id,
                    name=name,
                    logo_letter=name[:1].upper(),
                    domain=f"{name.lower()}.com",
                )
            )

    categories_by_name: dict[str, Category] = {}
    for name in CATEGORIES:
        slug = name.lower().replace(" ", "-")
        category = db.scalar(
            select(Category).where(Category.workspace_id == workspace.id, Category.slug == slug)
        )
        if category is None:
            category = Category(workspace_id=workspace.id, name=name, slug=slug)
            db.add(category)
            db.flush()
        categories_by_name[name] = category

    for code, name in REGIONS:
        existing = db.scalar(
            select(Region).where(Region.workspace_id == workspace.id, Region.code == code)
        )
        if existing is None:
            db.add(Region(workspace_id=workspace.id, code=code, name=name, region_method="signaled"))

    for category_name, prompt_texts in PROMPTS_BY_CATEGORY.items():
        category = categories_by_name[category_name]
        for text in prompt_texts:
            existing = db.scalar(
                select(Prompt).where(Prompt.workspace_id == workspace.id, Prompt.text == text)
            )
            if existing is None:
                db.add(
                    Prompt(
                        workspace_id=workspace.id,
                        text=text,
                        category_id=category.id,
                        status="active",
                        samples_per_run=1,
                    )
                )

    db.commit()

    existing_answer = db.scalar(select(Answer).where(Answer.workspace_id == workspace.id).limit(1))
    if existing_answer is None:
        backfill_scan_history(db, workspace)
    else:
        # Answers already exist (workspace seeded before the vNext G1
        # migration added `observations`), so the historical backfill above
        # never ran for them. Reconstruct observations from the
        # already-stored raw answers instead of re-scanning.
        backfill_observations_for_existing_answers(db, workspace)


def backfill_observations_for_existing_answers(db: Session, workspace: Workspace) -> None:
    """One-time reconstruction of Observation/ObservationExtraction rows for
    Answers that predate the vNext G1 migration. Idempotent: skips any
    answer that already has an observation, so re-running the seed script
    (as happens on every container start) is a no-op after the first pass.
    """
    already_covered = set(
        db.scalars(
            select(Observation.answer_id).where(
                Observation.workspace_id == workspace.id,
                Observation.answer_id.is_not(None),
            )
        ).all()
    )
    answers = list(
        db.scalars(select(Answer).where(Answer.workspace_id == workspace.id)).all()
    )
    pending = [a for a in answers if a.id not in already_covered]
    if not pending:
        return

    ai_model_cache: dict[str, AiModel | None] = {}
    mentions_by_answer: dict[str, dict[str, bool]] = {}
    for mention in db.scalars(
        select(AnswerMention).join(Answer, Answer.id == AnswerMention.answer_id).where(
            Answer.workspace_id == workspace.id
        )
    ).all():
        mentions_by_answer.setdefault(mention.answer_id, {})[mention.competitor_id] = mention.mentioned

    for answer in pending:
        if answer.model_id not in ai_model_cache:
            ai_model_cache[answer.model_id] = db.get(AiModel, answer.model_id)
        prompt = db.get(Prompt, answer.prompt_id)
        parsed = ParsedAnswer(
            brand_position=answer.brand_position,
            outcome=answer.outcome,
            sentiment_label=answer.sentiment_label,
            competitor_mentions=mentions_by_answer.get(answer.id, {}),
        )
        record_observation(
            db,
            workspace_id=workspace.id,
            prompt=prompt,
            answer=answer,
            model_id=answer.model_id,
            ai_model=ai_model_cache[answer.model_id],
            raw_text=answer.raw_text or "",
            latency_ms=None,  # reconstructed after the fact; never measured
            captured_at=answer.created_at,
            parsed=parsed,
        )
    db.commit()
    print(f"Backfilled {len(pending)} observations from pre-existing answers")


def backfill_scan_history(db: Session, workspace: Workspace, *, days: int = BACKFILL_DAYS) -> None:
    """Populate `days` of realistic scan history across every prompt and model.

    Bypasses `run_scan`'s always-now() timestamp so the dashboard's history-
    dependent metrics (sample sizes, trends, share of voice) look like an
    established, actively-monitored workspace instead of a single mock scan.
    """
    prompts = list(
        db.scalars(
            select(Prompt).where(
                Prompt.workspace_id == workspace.id,
                Prompt.status == "active",
            )
        ).all()
    )
    competitors = list(
        db.scalars(
            select(Competitor).where(
                Competitor.workspace_id == workspace.id,
                Competitor.archived_at.is_(None),
                Competitor.is_brand.is_(False),
            )
        ).all()
    )
    if not prompts:
        return

    provider = MockProvider()
    rng = random.Random(f"{workspace.id}:backfill")
    now = datetime.now(UTC)
    answer_ids: list[str] = []
    ai_model_cache: dict[str, AiModel | None] = {}

    for day_offset in range(days, -1, -1):
        day_start = now - timedelta(days=day_offset)
        for prompt in prompts:
            for model_id in BACKFILL_MODEL_IDS:
                if model_id not in ai_model_cache:
                    ai_model_cache[model_id] = db.get(AiModel, model_id)

                created_at = day_start.replace(
                    hour=rng.randint(7, 20),
                    minute=rng.randint(0, 59),
                    second=rng.randint(0, 59),
                    microsecond=0,
                )
                raw_text = provider.generate(
                    workspace=workspace,
                    prompt=prompt,
                    model_id=model_id,
                    competitors=competitors,
                ).raw_text
                parsed = parse_answer(
                    raw_text=raw_text,
                    brand_name=workspace.brand_name,
                    competitors=competitors,
                )
                answer = Answer(
                    workspace_id=workspace.id,
                    prompt_id=prompt.id,
                    model_id=model_id,
                    status="completed",
                    raw_text=raw_text,
                    brand_position=parsed.brand_position,
                    outcome=parsed.outcome,
                    sentiment_label=parsed.sentiment_label,
                    parser_version=settings.PARSER_VERSION,
                    created_at=created_at,
                )
                db.add(answer)
                db.flush()
                for competitor_id, mentioned in parsed.competitor_mentions.items():
                    db.add(
                        AnswerMention(
                            answer_id=answer.id,
                            competitor_id=competitor_id,
                            mentioned=mentioned,
                        )
                    )
                answer_ids.append(answer.id)
                record_observation(
                    db,
                    workspace_id=workspace.id,
                    prompt=prompt,
                    answer=answer,
                    model_id=model_id,
                    ai_model=ai_model_cache[model_id],
                    raw_text=raw_text,
                    latency_ms=None,  # backfilled retroactively; not a measured call
                    captured_at=created_at,
                    parsed=parsed,
                )

    db.flush()
    rollup_answers(db, workspace_id=workspace.id, answer_ids=answer_ids)
    db.commit()
    print(
        f"Backfilled {len(answer_ids)} mock answers (+ observations) across "
        f"{days + 1} days, {len(prompts)} prompts, and {len(BACKFILL_MODEL_IDS)} models"
    )


if __name__ == "__main__":
    seed()
