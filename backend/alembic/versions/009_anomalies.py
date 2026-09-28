"""vNext G8: anomalies

Revision ID: 009_anomalies
Revises: 008_external_signals
Create Date: 2026-09-28

Adds `anomalies` (GAPVISOR_VNEXT_AGENT_PLAN.md Phase G8): visibility
time-series shifts flagged by Py-Outlier, as investigation candidates.
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "009_anomalies"
down_revision: str | None = "008_external_signals"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "anomalies",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("workspace_id", sa.String(36), sa.ForeignKey("workspaces.id"), nullable=False),
        sa.Column("metric_key", sa.String(64), nullable=False),
        sa.Column("model_id", sa.String(64)),
        sa.Column("competitor_id", sa.String(36)),
        sa.Column("entity_type", sa.String(16), nullable=False),
        sa.Column("entity_id", sa.String(36), nullable=False),
        sa.Column("detected_for", sa.Date(), nullable=False),
        sa.Column("observed_value", sa.Float(), nullable=False),
        sa.Column("target_sample_size", sa.Integer(), nullable=False),
        sa.Column("baseline_mean", sa.Float(), nullable=False),
        sa.Column("baseline_stdev", sa.Float(), nullable=False),
        sa.Column("baseline_points", sa.Integer(), nullable=False),
        sa.Column("delta", sa.Float(), nullable=False),
        sa.Column("direction", sa.String(8), nullable=False),
        sa.Column("score", sa.Float(), nullable=False),
        sa.Column("threshold", sa.Float(), nullable=False),
        sa.Column("method", sa.String(64), nullable=False),
        sa.Column("detector_version", sa.String(64), nullable=False),
        sa.Column("status", sa.String(16), nullable=False, server_default="OPEN"),
        sa.Column(
            "hypothesis_recommendation_id",
            sa.String(36),
            sa.ForeignKey("content_recommendations.id"),
        ),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index(
        "uq_anomalies_series_day",
        "anomalies",
        ["workspace_id", "metric_key", "model_id", "competitor_id", "detected_for"],
        unique=True,
        # Brand series have competitor_id NULL and share_of_voice has
        # model_id NULL; without this, Postgres treats those NULLs as
        # distinct and the index never dedupes them.
        postgresql_nulls_not_distinct=True,
    )

    op.execute("ALTER TABLE anomalies ENABLE ROW LEVEL SECURITY")
    op.execute(
        """
        CREATE POLICY tenant_isolation_anomalies ON anomalies
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


def downgrade() -> None:
    op.drop_table("anomalies")
