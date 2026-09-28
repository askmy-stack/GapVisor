"""vNext G7: external signals (shared envelope)

Revision ID: 008_external_signals
Revises: 007_experiment_lab
Create Date: 2026-09-28

Adds `external_signals` (GAPVISOR_VNEXT_AGENT_PLAN.md Phase G7): the stored
form of the plan's section 5.3 ExternalSignal envelope.
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "008_external_signals"
down_revision: str | None = "007_experiment_lab"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "external_signals",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("workspace_id", sa.String(36), sa.ForeignKey("workspaces.id"), nullable=False),
        sa.Column("entity_type", sa.String(16), nullable=False),
        sa.Column("entity_id", sa.String(36), nullable=False),
        sa.Column("source_system", sa.String(64), nullable=False),
        sa.Column("signal_type", sa.String(64), nullable=False),
        sa.Column("external_signal_id", sa.String(255), nullable=False),
        sa.Column("observed_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("value", sa.JSON(), nullable=False, server_default="{}"),
        sa.Column("confidence", sa.Float()),
        sa.Column("provenance", sa.JSON(), nullable=False, server_default="{}"),
        sa.Column("schema_version", sa.String(16), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index(
        "uq_external_signals_source",
        "external_signals",
        ["workspace_id", "source_system", "external_signal_id"],
        unique=True,
    )
    op.create_index(
        "ix_external_signals_entity_observed",
        "external_signals",
        ["workspace_id", "entity_id", "observed_at"],
    )

    op.execute("ALTER TABLE external_signals ENABLE ROW LEVEL SECURITY")
    op.execute(
        """
        CREATE POLICY tenant_isolation_external_signals ON external_signals
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
    op.drop_table("external_signals")
