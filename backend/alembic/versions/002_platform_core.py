"""platform core

Revision ID: 002_platform_core
Revises: 001_initial
Create Date: 2026-09-15
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "002_platform_core"
down_revision: str | None = "001_initial"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


TENANT_TABLES = (
    "competitors",
    "categories",
    "regions",
    "prompts",
    "answers",
    "metric_daily",
)


def _tenant_policy(table: str) -> None:
    op.execute(f"ALTER TABLE {table} ENABLE ROW LEVEL SECURITY")
    op.execute(
        f"""
        CREATE POLICY tenant_isolation_{table} ON {table}
          FOR ALL
          USING (
            current_setting('app.workspace_id', true) IS NULL
            OR current_setting('app.workspace_id', true) = ''
            OR workspace_id::text = current_setting('app.workspace_id', true)
          )
          WITH CHECK (
            current_setting('app.workspace_id', true) IS NULL
            OR current_setting('app.workspace_id', true) = ''
            OR workspace_id::text = current_setting('app.workspace_id', true)
          )
        """
    )


def upgrade() -> None:
    op.create_table(
        "competitors",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("workspace_id", sa.String(36), sa.ForeignKey("workspaces.id"), nullable=False),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("logo_letter", sa.String(4), nullable=False),
        sa.Column("domain", sa.Text()),
        sa.Column("is_brand", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("archived_at", sa.DateTime(timezone=True)),
    )
    op.create_index("ix_competitors_workspace_id", "competitors", ["workspace_id"])

    op.create_table(
        "categories",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("workspace_id", sa.String(36), sa.ForeignKey("workspaces.id"), nullable=False),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("slug", sa.String(128), nullable=False),
        sa.UniqueConstraint("workspace_id", "slug", name="uq_categories_workspace_slug"),
    )

    op.create_table(
        "regions",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("workspace_id", sa.String(36), sa.ForeignKey("workspaces.id"), nullable=False),
        sa.Column("code", sa.String(32), nullable=False),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("region_method", sa.String(32), nullable=False, server_default="signaled"),
        sa.UniqueConstraint("workspace_id", "code", name="uq_regions_workspace_code"),
    )

    op.create_table(
        "prompts",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("workspace_id", sa.String(36), sa.ForeignKey("workspaces.id"), nullable=False),
        sa.Column("text", sa.Text(), nullable=False),
        sa.Column("category_id", sa.String(36), sa.ForeignKey("categories.id")),
        sa.Column("status", sa.String(32), nullable=False, server_default="active"),
        sa.Column("samples_per_run", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("archived_at", sa.DateTime(timezone=True)),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_prompts_workspace_id", "prompts", ["workspace_id"])

    op.create_table(
        "answers",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("workspace_id", sa.String(36), sa.ForeignKey("workspaces.id"), nullable=False),
        sa.Column("prompt_id", sa.String(36), sa.ForeignKey("prompts.id"), nullable=False),
        sa.Column("model_id", sa.String(64), sa.ForeignKey("ai_models.id"), nullable=False),
        sa.Column("status", sa.String(32), nullable=False),
        sa.Column("raw_text", sa.Text()),
        sa.Column("brand_position", sa.Integer()),
        sa.Column("outcome", sa.String(32), nullable=False),
        sa.Column("sentiment_label", sa.String(32), nullable=False),
        sa.Column("parser_version", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_answers_workspace_created", "answers", ["workspace_id", "created_at"])
    op.create_index("ix_answers_prompt_id", "answers", ["prompt_id"])

    op.create_table(
        "answer_mentions",
        sa.Column("answer_id", sa.String(36), sa.ForeignKey("answers.id"), primary_key=True),
        sa.Column("competitor_id", sa.String(36), sa.ForeignKey("competitors.id"), primary_key=True),
        sa.Column("mentioned", sa.Boolean(), nullable=False, server_default=sa.text("false")),
    )

    op.create_table(
        "metric_daily",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("workspace_id", sa.String(36), sa.ForeignKey("workspaces.id"), nullable=False),
        sa.Column("date", sa.Date(), nullable=False),
        sa.Column("metric_key", sa.String(64), nullable=False),
        sa.Column("model_id", sa.String(64), sa.ForeignKey("ai_models.id")),
        sa.Column("category_id", sa.String(36), sa.ForeignKey("categories.id")),
        sa.Column("competitor_id", sa.String(36), sa.ForeignKey("competitors.id")),
        sa.Column("value", sa.Float(), nullable=False),
        sa.Column("sample_size", sa.Integer(), nullable=False),
        sa.Column("parser_version", sa.Integer(), nullable=False),
    )
    op.create_index(
        "uq_metric_daily_dimensions",
        "metric_daily",
        ["workspace_id", "date", "metric_key", "model_id", "category_id", "competitor_id"],
        unique=True,
    )

    for table in TENANT_TABLES:
        _tenant_policy(table)

    op.execute("ALTER TABLE answer_mentions ENABLE ROW LEVEL SECURITY")
    op.execute(
        """
        CREATE POLICY tenant_isolation_answer_mentions ON answer_mentions
          FOR ALL
          USING (
            current_setting('app.workspace_id', true) IS NULL
            OR current_setting('app.workspace_id', true) = ''
            OR EXISTS (
              SELECT 1 FROM answers
              WHERE answers.id = answer_mentions.answer_id
              AND answers.workspace_id::text = current_setting('app.workspace_id', true)
            )
          )
          WITH CHECK (
            current_setting('app.workspace_id', true) IS NULL
            OR current_setting('app.workspace_id', true) = ''
            OR EXISTS (
              SELECT 1 FROM answers
              WHERE answers.id = answer_mentions.answer_id
              AND answers.workspace_id::text = current_setting('app.workspace_id', true)
            )
          )
        """
    )


def downgrade() -> None:
    op.drop_table("metric_daily")
    op.drop_table("answer_mentions")
    op.drop_table("answers")
    op.drop_table("prompts")
    op.drop_table("regions")
    op.drop_table("categories")
    op.drop_table("competitors")
