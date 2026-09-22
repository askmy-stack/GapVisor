"""Seed demo workspace (Northstar) + AI model catalog."""

from __future__ import annotations

import sys
from datetime import UTC, datetime
from pathlib import Path

# Allow running as `python scripts/seed.py` from backend/
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from sqlalchemy import select
from sqlalchemy.orm import Session

from core.db import SessionLocal
from core.security import hash_password
from models import (
    AiModel,
    Answer,
    Category,
    Competitor,
    Membership,
    Organization,
    Prompt,
    Region,
    User,
    Workspace,
)
from services.scan import run_scan

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
PROMPTS = [
    "What are the best API gateway platforms for developer-first teams?",
    "Which tools should I consider for API monitoring and visibility?",
    "Recommend a platform for managing API programs across engineering teams.",
]


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

    default_category = categories_by_name["API Gateways"]
    for text in PROMPTS:
        existing = db.scalar(
            select(Prompt).where(Prompt.workspace_id == workspace.id, Prompt.text == text)
        )
        if existing is None:
            db.add(
                Prompt(
                    workspace_id=workspace.id,
                    text=text,
                    category_id=default_category.id,
                    status="active",
                    samples_per_run=1,
                )
            )

    db.commit()
    first_prompt = db.scalar(
        select(Prompt).where(Prompt.workspace_id == workspace.id).order_by(Prompt.created_at).limit(1)
    )
    existing_answer = db.scalar(select(Answer).where(Answer.workspace_id == workspace.id).limit(1))
    if first_prompt is not None and existing_answer is None:
        run_scan(workspace.id, first_prompt.id, ["chatgpt"], db=db)
        print("Seeded one mock scan for dashboard metrics")


if __name__ == "__main__":
    seed()
