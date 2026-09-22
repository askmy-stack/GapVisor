from datetime import date, datetime

from sqlalchemy import Boolean, Date, DateTime, Float, ForeignKey, Index, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from models.base import Base, TimestampMixin, new_uuid


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
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="active")
    samples_per_run: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    archived_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    category = relationship("Category", back_populates="prompts")
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
