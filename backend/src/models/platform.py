from datetime import date, datetime

from sqlalchemy import Boolean, Date, DateTime, Float, ForeignKey, Index, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import JSON

from models.base import Base, TimestampMixin, new_uuid


class PromptFamily(Base, TimestampMixin):
    """A cluster of prompts that probe the same underlying buyer intent.

    vNext observation/disagreement/causal-graph work is scoped per prompt
    family rather than per individual prompt string, since disagreement
    across near-duplicate phrasings of the same question is noise, not
    signal. Optional on Prompt for now — existing prompts are ungrouped
    until a workspace explicitly clusters them.
    """

    __tablename__ = "prompt_families"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    workspace_id: Mapped[str] = mapped_column(String(36), ForeignKey("workspaces.id"), nullable=False)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[str | None] = mapped_column(Text)

    prompts = relationship("Prompt", back_populates="prompt_family")


class Competitor(Base):
    __tablename__ = "competitors"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    workspace_id: Mapped[str] = mapped_column(String(36), ForeignKey("workspaces.id"), nullable=False)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    logo_letter: Mapped[str] = mapped_column(String(4), nullable=False)
    domain: Mapped[str | None] = mapped_column(Text)
    is_brand: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    archived_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class Category(Base):
    __tablename__ = "categories"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    workspace_id: Mapped[str] = mapped_column(String(36), ForeignKey("workspaces.id"), nullable=False)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    slug: Mapped[str] = mapped_column(String(128), nullable=False)

    prompts = relationship("Prompt", back_populates="category")


class Region(Base):
    __tablename__ = "regions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    workspace_id: Mapped[str] = mapped_column(String(36), ForeignKey("workspaces.id"), nullable=False)
    code: Mapped[str] = mapped_column(String(32), nullable=False)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    region_method: Mapped[str] = mapped_column(String(32), nullable=False, default="signaled")


class Prompt(Base, TimestampMixin):
    __tablename__ = "prompts"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    workspace_id: Mapped[str] = mapped_column(String(36), ForeignKey("workspaces.id"), nullable=False)
    text: Mapped[str] = mapped_column(Text, nullable=False)
    category_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("categories.id"))
    prompt_family_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("prompt_families.id"))
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="active")
    samples_per_run: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    archived_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    category = relationship("Category", back_populates="prompts")
    prompt_family = relationship("PromptFamily", back_populates="prompts")
    answers = relationship("Answer", back_populates="prompt")


class Answer(Base, TimestampMixin):
    __tablename__ = "answers"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    workspace_id: Mapped[str] = mapped_column(String(36), ForeignKey("workspaces.id"), nullable=False)
    prompt_id: Mapped[str] = mapped_column(String(36), ForeignKey("prompts.id"), nullable=False)
    model_id: Mapped[str] = mapped_column(String(64), ForeignKey("ai_models.id"), nullable=False)
    status: Mapped[str] = mapped_column(String(32), nullable=False)
    raw_text: Mapped[str | None] = mapped_column(Text)
    brand_position: Mapped[int | None] = mapped_column(Integer)
    outcome: Mapped[str] = mapped_column(String(32), nullable=False)
    sentiment_label: Mapped[str] = mapped_column(String(32), nullable=False)
    parser_version: Mapped[int] = mapped_column(Integer, nullable=False)

    prompt = relationship("Prompt", back_populates="answers")
    mentions = relationship("AnswerMention", back_populates="answer")


class AnswerMention(Base):
    __tablename__ = "answer_mentions"

    answer_id: Mapped[str] = mapped_column(String(36), ForeignKey("answers.id"), primary_key=True)
    competitor_id: Mapped[str] = mapped_column(String(36), ForeignKey("competitors.id"), primary_key=True)
    mentioned: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    answer = relationship("Answer", back_populates="mentions")


class MetricDaily(Base):
    __tablename__ = "metric_daily"
    __table_args__ = (
        Index(
            "uq_metric_daily_dimensions",
            "workspace_id",
            "date",
            "metric_key",
            "model_id",
            "category_id",
            "competitor_id",
            unique=True,
        ),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    workspace_id: Mapped[str] = mapped_column(String(36), ForeignKey("workspaces.id"), nullable=False)
    date: Mapped[date] = mapped_column(Date, nullable=False)
    metric_key: Mapped[str] = mapped_column(String(64), nullable=False)
    model_id: Mapped[str | None] = mapped_column(String(64), ForeignKey("ai_models.id"))
    category_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("categories.id"))
    competitor_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("competitors.id"))
    value: Mapped[float] = mapped_column(Float, nullable=False)
    sample_size: Mapped[int] = mapped_column(Integer, nullable=False)
    parser_version: Mapped[int] = mapped_column(Integer, nullable=False)


class ContentRecommendation(Base, TimestampMixin):
    __tablename__ = "content_recommendations"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    workspace_id: Mapped[str] = mapped_column(String(36), ForeignKey("workspaces.id"), nullable=False, index=True)
    title: Mapped[str] = mapped_column(Text, nullable=False)
    rationale: Mapped[str | None] = mapped_column(Text)
    predicted_impact: Mapped[str | None] = mapped_column(String(64))
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="draft")
    source: Mapped[str] = mapped_column(String(32), nullable=False, default="platform")
    assignee_user_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("users.id"))
    archived_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class Experiment(Base, TimestampMixin):
    __tablename__ = "experiments"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    workspace_id: Mapped[str] = mapped_column(String(36), ForeignKey("workspaces.id"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    hypothesis: Mapped[str | None] = mapped_column(Text)
    recommendation_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("content_recommendations.id"))
    start_date: Mapped[date | None] = mapped_column(Date)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="planned")


class Observation(Base):
    """One raw, provenance-tagged collection event: one prompt sent to one
    AI surface and the response that came back, before any brand/claim
    extraction happens.

    This is additive to (not a replacement for) `Answer`: `run_scan` writes
    both an `Answer` (existing dashboard/rollup pipeline, unchanged) and an
    `Observation` (this table) for every generated sample. Observation adds
    the provenance and validation fields the vNext plan requires that
    `Answer` was never designed to carry — surface/provider/collection-method
    labeling and a VALID/UNCERTAIN/INVALID gate on whether an answer is
    trustworthy enough to feed metrics at all.

    `ai_models.id` (e.g. "chatgpt", "claude") already functions as this
    codebase's surface identifier — one row per directly-scannable surface,
    see `AiModel`'s own docstring. `surface` here is a copy of that id at
    observation time, not a new taxonomy, so multiple distinct surfaces per
    model (e.g. a consumer web UI vs. the same model's API) can be
    introduced later without a backfill.
    """

    __tablename__ = "observations"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    workspace_id: Mapped[str] = mapped_column(String(36), ForeignKey("workspaces.id"), nullable=False)
    prompt_id: Mapped[str] = mapped_column(String(36), ForeignKey("prompts.id"), nullable=False)
    prompt_family_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("prompt_families.id"))
    answer_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("answers.id"))

    surface: Mapped[str] = mapped_column(String(64), nullable=False)
    provider: Mapped[str | None] = mapped_column(String(64))
    model_id: Mapped[str] = mapped_column(String(64), ForeignKey("ai_models.id"), nullable=False)
    collection_method: Mapped[str] = mapped_column(String(32), nullable=False)
    # Signaled region for this observation, when known. Nullable: the
    # existing Prompt model has no region assignment yet (see Region model),
    # so this is honestly unset rather than defaulted to a guessed value.
    region: Mapped[str | None] = mapped_column(String(32))

    status: Mapped[str] = mapped_column(String(32), nullable=False)
    latency_ms: Mapped[int | None] = mapped_column(Integer)
    raw_text: Mapped[str | None] = mapped_column(Text)
    # Pointer to externally-stored raw response (e.g. object storage). No
    # blob store is wired up yet, so this stays null until one exists;
    # raw_text above is the source of truth for now.
    raw_response_ref: Mapped[str | None] = mapped_column(Text)

    validation_status: Mapped[str] = mapped_column(String(16), nullable=False, default="UNCERTAIN")
    parser_version: Mapped[int] = mapped_column(Integer, nullable=False)
    normalizer_version: Mapped[int] = mapped_column(Integer, nullable=False, default=1)

    captured_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    extraction = relationship("ObservationExtraction", back_populates="observation", uselist=False)


class ObservationExtraction(Base):
    """Extracted recommendation evidence for one Observation (spec section
    5.2): brand/competitor mentions, rank, and an extraction confidence
    score. Kept as a separate table from Observation (rather than more
    columns bolted onto it) so raw collection and derived extraction can
    evolve — and be re-run at a new parser_version — independently, per the
    plan's `SOURCE.raw_response_ref` / re-parse principle (see also the
    existing backfill-from-raw-answers direction in issue #28).
    """

    __tablename__ = "observation_extractions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    observation_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("observations.id"), nullable=False, unique=True
    )

    brand_mentioned: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    recommendation_rank: Mapped[int | None] = mapped_column(Integer)
    outcome: Mapped[str] = mapped_column(String(32), nullable=False)
    sentiment_label: Mapped[str] = mapped_column(String(32), nullable=False)
    # {competitor_id: mentioned_bool}
    competitor_mentions: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    # Claim/citation extraction (spec section 10: Claim, Citation entities)
    # isn't implemented yet — both stay empty lists until that work lands,
    # rather than fabricating placeholder content.
    claims: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    citations: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    extraction_confidence: Mapped[float] = mapped_column(Float, nullable=False)
    parser_version: Mapped[int] = mapped_column(Integer, nullable=False)

    observation = relationship("Observation", back_populates="extraction")


class CausalEdge(Base, TimestampMixin):
    """One edge in the Causal Visibility Graph (vNext plan section 10): a
    graph-shaped domain model living in Postgres, not a graph database —
    the plan is explicit that a graph DB is premature until this
    relational shape demonstrably can't keep up.

    `source_type`/`target_type` name which table `source_id`/`target_id`
    point into (e.g. "prompt", "observation", "workspace"); there's no FK
    constraint because a single edges table spans several unrelated target
    tables, the same trade-off `MetricDaily` already makes with its
    optional `model_id`/`category_id`/`competitor_id` columns.

    `causal_status` MUST NOT be inferred as SUPPORTED merely from an edge
    existing or from time order (the plan's explicit rule) — every edge
    this codebase currently writes automatically is causal_status
    "OBSERVED" (a structural fact: this response was produced by this
    prompt, this response mentioned the brand), never a causal claim.
    SUPPORTED/NOT_SUPPORTED only make sense once an Experiment resolves
    (G6) and are never set here.
    """

    __tablename__ = "causal_edges"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    workspace_id: Mapped[str] = mapped_column(String(36), ForeignKey("workspaces.id"), nullable=False)

    source_type: Mapped[str] = mapped_column(String(32), nullable=False)
    source_id: Mapped[str] = mapped_column(String(36), nullable=False)
    target_type: Mapped[str] = mapped_column(String(32), nullable=False)
    target_id: Mapped[str] = mapped_column(String(36), nullable=False)

    # PROMPT_PRODUCED_RESPONSE | RESPONSE_MENTIONED_BRAND | RESPONSE_CITED_SOURCE |
    # SOURCE_MAPS_TO_ASSET | ASSET_CHANGED_BY_INTERVENTION |
    # INTERVENTION_TESTED_BY_EXPERIMENT | EXPERIMENT_OBSERVED_METRIC | SIGNAL_PRECEDED_CHANGE
    edge_type: Mapped[str] = mapped_column(String(48), nullable=False)
    observed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    # IDs of the records that back this edge (e.g. the observation_id an
    # OBSERVED edge is derived from) — always non-empty; an edge with no
    # evidence isn't an edge, it's a guess.
    evidence_refs: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    confidence: Mapped[float] = mapped_column(Float, nullable=False)
    # OBSERVED | CORRELATED | SUPPORTED | NOT_SUPPORTED | INCONCLUSIVE
    causal_status: Mapped[str] = mapped_column(String(16), nullable=False, default="OBSERVED")
