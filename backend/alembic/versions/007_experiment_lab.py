"""vNext G6: Experiment Lab

Revision ID: 007_experiment_lab
Revises: 006_evidence_recommendations
Create Date: 2026-09-28

Adds primary_metric / secondary_metrics / measurement_window_days /
intervention / holdout_definition / supporting_evidence_refs to
experiments (GAPVISOR_VNEXT_AGENT_PLAN.md Phase G6).
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "007_experiment_lab"
down_revision: str | None = "006_evidence_recommendations"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "experiments",
        sa.Column("primary_metric", sa.String(64), nullable=False, server_default="inclusion_rate"),
    )
    op.add_column(
        "experiments", sa.Column("secondary_metrics", sa.JSON(), nullable=False, server_default="[]")
    )
    op.add_column(
        "experiments",
        sa.Column("measurement_window_days", sa.Integer(), nullable=False, server_default="28"),
    )
    op.add_column("experiments", sa.Column("intervention", sa.JSON()))
    op.add_column("experiments", sa.Column("holdout_definition", sa.JSON()))
    op.add_column(
        "experiments",
        sa.Column("supporting_evidence_refs", sa.JSON(), nullable=False, server_default="[]"),
    )


def downgrade() -> None:
    op.drop_column("experiments", "supporting_evidence_refs")
    op.drop_column("experiments", "holdout_definition")
    op.drop_column("experiments", "intervention")
    op.drop_column("experiments", "measurement_window_days")
    op.drop_column("experiments", "secondary_metrics")
    op.drop_column("experiments", "primary_metric")
