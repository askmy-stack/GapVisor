"""vNext G5: evidence-backed recommendations

Revision ID: 006_evidence_recommendations
Revises: 005_causal_graph
Create Date: 2026-09-28

Adds evidence_refs / evidence_strength / causal_status /
recommended_experiment to content_recommendations
(GAPVISOR_VNEXT_AGENT_PLAN.md Phase G5).
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "006_evidence_recommendations"
down_revision: str | None = "005_causal_graph"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "content_recommendations",
        sa.Column("evidence_refs", sa.JSON(), nullable=False, server_default="[]"),
    )
    op.add_column("content_recommendations", sa.Column("evidence_strength", sa.String(16)))
    op.add_column("content_recommendations", sa.Column("causal_status", sa.String(20)))
    op.add_column("content_recommendations", sa.Column("recommended_experiment", sa.JSON()))


def downgrade() -> None:
    op.drop_column("content_recommendations", "recommended_experiment")
    op.drop_column("content_recommendations", "causal_status")
    op.drop_column("content_recommendations", "evidence_strength")
    op.drop_column("content_recommendations", "evidence_refs")
