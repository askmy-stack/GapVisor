"""vNext G4: Causal Visibility Graph foundation

Revision ID: 005_causal_graph
Revises: 004_observations
Create Date: 2026-09-28

Adds `causal_edges` (GAPVISOR_VNEXT_AGENT_PLAN.md Phase G4): a graph-shaped
relational table, not a graph database — the plan is explicit one isn't
warranted yet.
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "005_causal_graph"
down_revision: str | None = "004_observations"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "causal_edges",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("workspace_id", sa.String(36), sa.ForeignKey("workspaces.id"), nullable=False),
        sa.Column("source_type", sa.String(32), nullable=False),
        sa.Column("source_id", sa.String(36), nullable=False),
        sa.Column("target_type", sa.String(32), nullable=False),
        sa.Column("target_id", sa.String(36), nullable=False),
        sa.Column("edge_type", sa.String(48), nullable=False),
        sa.Column("observed_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("evidence_refs", sa.JSON(), nullable=False, server_default="[]"),
        sa.Column("confidence", sa.Float(), nullable=False),
        sa.Column("causal_status", sa.String(16), nullable=False, server_default="OBSERVED"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_causal_edges_workspace_id", "causal_edges", ["workspace_id"])
    op.create_index(
        "ix_causal_edges_source",
        "causal_edges",
        ["workspace_id", "source_type", "source_id"],
    )
    op.create_index(
        "ix_causal_edges_target",
        "causal_edges",
        ["workspace_id", "target_type", "target_id"],
    )
    op.create_index("ix_causal_edges_edge_type", "causal_edges", ["workspace_id", "edge_type"])

    op.execute("ALTER TABLE causal_edges ENABLE ROW LEVEL SECURITY")
    op.execute(
        """
        CREATE POLICY tenant_isolation_causal_edges ON causal_edges
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
    op.drop_table("causal_edges")
