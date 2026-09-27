"""vNext G1: prompt families + observation provenance/validation

Revision ID: 004_observations
Revises: 003_recs_experiments
Create Date: 2026-09-26

Adds the vNext Observation model (GAPVISOR_VNEXT_AGENT_PLAN.md Phase G1):
surface/provider/collection-method provenance and a VALID/UNCERTAIN/INVALID
validation gate, additive to the existing answers/answer_mentions/
metric_daily pipeline, which this migration does not touch.
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "004_observations"
down_revision: str | None = "003_recs_experiments"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


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
        "prompt_families",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("workspace_id", sa.String(36), sa.ForeignKey("workspaces.id"), nullable=False),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("description", sa.Text()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_prompt_families_workspace_id", "prompt_families", ["workspace_id"])

    op.add_column("prompts", sa.Column("prompt_family_id", sa.String(36), sa.ForeignKey("prompt_families.id")))

    op.create_table(
        "observations",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("workspace_id", sa.String(36), sa.ForeignKey("workspaces.id"), nullable=False),
        sa.Column("prompt_id", sa.String(36), sa.ForeignKey("prompts.id"), nullable=False),
        sa.Column("prompt_family_id", sa.String(36), sa.ForeignKey("prompt_families.id")),
        sa.Column("answer_id", sa.String(36), sa.ForeignKey("answers.id")),
        sa.Column("surface", sa.String(64), nullable=False),
        sa.Column("provider", sa.String(64)),
        sa.Column("model_id", sa.String(64), sa.ForeignKey("ai_models.id"), nullable=False),
        sa.Column("collection_method", sa.String(32), nullable=False),
        sa.Column("region", sa.String(32)),
        sa.Column("status", sa.String(32), nullable=False),
        sa.Column("latency_ms", sa.Integer()),
        sa.Column("raw_text", sa.Text()),
        sa.Column("raw_response_ref", sa.Text()),
        sa.Column("validation_status", sa.String(16), nullable=False, server_default="UNCERTAIN"),
        sa.Column("parser_version", sa.Integer(), nullable=False),
        sa.Column("normalizer_version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("captured_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_observations_workspace_captured", "observations", ["workspace_id", "captured_at"])
    op.create_index("ix_observations_prompt_id", "observations", ["prompt_id"])
    op.create_index("ix_observations_validation_status", "observations", ["workspace_id", "validation_status"])

    op.create_table(
        "observation_extractions",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column(
            "observation_id",
            sa.String(36),
            sa.ForeignKey("observations.id"),
            nullable=False,
            unique=True,
        ),
        sa.Column("brand_mentioned", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("recommendation_rank", sa.Integer()),
        sa.Column("outcome", sa.String(32), nullable=False),
        sa.Column("sentiment_label", sa.String(32), nullable=False),
        sa.Column("competitor_mentions", sa.JSON(), nullable=False, server_default="{}"),
        sa.Column("claims", sa.JSON(), nullable=False, server_default="[]"),
        sa.Column("citations", sa.JSON(), nullable=False, server_default="[]"),
        sa.Column("extraction_confidence", sa.Float(), nullable=False),
        sa.Column("parser_version", sa.Integer(), nullable=False),
    )

    _tenant_policy("prompt_families")
    _tenant_policy("observations")

    op.execute("ALTER TABLE observation_extractions ENABLE ROW LEVEL SECURITY")
    op.execute(
        """
        CREATE POLICY tenant_isolation_observation_extractions ON observation_extractions
          FOR ALL
          USING (
            current_setting('app.workspace_id', true) IS NULL
            OR current_setting('app.workspace_id', true) = ''
            OR EXISTS (
              SELECT 1 FROM observations
              WHERE observations.id = observation_extractions.observation_id
              AND observations.workspace_id::text = current_setting('app.workspace_id', true)
            )
          )
          WITH CHECK (
            current_setting('app.workspace_id', true) IS NULL
            OR current_setting('app.workspace_id', true) = ''
            OR EXISTS (
              SELECT 1 FROM observations
              WHERE observations.id = observation_extractions.observation_id
              AND observations.workspace_id::text = current_setting('app.workspace_id', true)
            )
          )
        """
    )


def downgrade() -> None:
    op.drop_table("observation_extractions")
    op.drop_table("observations")
    op.drop_column("prompts", "prompt_family_id")
    op.drop_table("prompt_families")
