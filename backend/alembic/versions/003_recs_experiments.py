"""M5+ tables: recommendations and experiments

Revision ID: 003_recs_experiments
Revises: 002_platform_core
Create Date: 2026-09-15
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "003_recs_experiments"
down_revision: str | None = "002_platform_core"
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
        "content_recommendations",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("workspace_id", sa.String(36), sa.ForeignKey("workspaces.id"), nullable=False),
        sa.Column("title", sa.Text(), nullable=False),
        sa.Column("rationale", sa.Text()),
        sa.Column("predicted_impact", sa.String(64)),
        sa.Column("status", sa.String(32), nullable=False, server_default="draft"),
        sa.Column("source", sa.String(32), nullable=False, server_default="platform"),
        sa.Column("assignee_user_id", sa.String(36), sa.ForeignKey("users.id")),
        sa.Column("archived_at", sa.DateTime(timezone=True)),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_content_recommendations_workspace_id", "content_recommendations", ["workspace_id"])

    op.create_table(
        "experiments",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("workspace_id", sa.String(36), sa.ForeignKey("workspaces.id"), nullable=False),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("hypothesis", sa.Text()),
        sa.Column("recommendation_id", sa.String(36), sa.ForeignKey("content_recommendations.id")),
        sa.Column("start_date", sa.Date()),
        sa.Column("status", sa.String(32), nullable=False, server_default="planned"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_experiments_workspace_id", "experiments", ["workspace_id"])

    _tenant_policy("content_recommendations")
    _tenant_policy("experiments")


def downgrade() -> None:
    op.drop_table("experiments")
    op.drop_table("content_recommendations")
