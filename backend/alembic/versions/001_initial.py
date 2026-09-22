"""empty

Revision ID: 001_initial
Revises:
Create Date: 2026-09-15
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "001_initial"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS pgcrypto")

    op.create_table(
        "organizations",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("stripe_customer_id", sa.String(255), unique=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )

    op.create_table(
        "users",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("email", sa.String(320), nullable=False, unique=True),
        sa.Column("password_hash", sa.Text()),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("avatar_url", sa.Text()),
        sa.Column("oauth_provider", sa.String(32)),
        sa.Column("oauth_subject", sa.String(255)),
        sa.Column("last_active_at", sa.DateTime(timezone=True)),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_users_email", "users", ["email"])

    op.create_table(
        "workspaces",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("org_id", sa.String(36), sa.ForeignKey("organizations.id"), nullable=False),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("brand_name", sa.Text(), nullable=False),
        sa.Column("brand_domains", postgresql.ARRAY(sa.Text()), nullable=False, server_default="{}"),
        sa.Column("fact_sheet", sa.Text()),
        sa.Column("monitoring_frequency", sa.String(32), nullable=False, server_default="weekly"),
        sa.Column("timezone", sa.String(64), nullable=False, server_default="UTC"),
        sa.Column("onboarding_completed_at", sa.DateTime(timezone=True)),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )

    op.create_table(
        "memberships",
        sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id"), primary_key=True),
        sa.Column("workspace_id", sa.String(36), sa.ForeignKey("workspaces.id"), primary_key=True),
        sa.Column("role", sa.String(32), nullable=False),
        sa.Column("status", sa.String(32), nullable=False, server_default="active"),
        sa.Column("invited_by", sa.String(36), sa.ForeignKey("users.id")),
        sa.Column("invited_at", sa.DateTime(timezone=True)),
        sa.Column("accepted_at", sa.DateTime(timezone=True)),
        sa.UniqueConstraint("user_id", "workspace_id", name="uq_memberships_user_workspace"),
    )

    op.create_table(
        "refresh_tokens",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("token_hash", sa.LargeBinary(), nullable=False),
        sa.Column("family_id", sa.String(36), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("revoked_at", sa.DateTime(timezone=True)),
        sa.Column("user_agent", sa.String(512)),
        sa.Column("ip", postgresql.INET()),
    )
    op.create_index("ix_refresh_tokens_user_id", "refresh_tokens", ["user_id"])
    op.create_index("ix_refresh_tokens_family_id", "refresh_tokens", ["family_id"])

    op.create_table(
        "ai_models",
        sa.Column("id", sa.String(64), primary_key=True),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("long_name", sa.Text(), nullable=False),
        sa.Column("badge", sa.String(8), nullable=False),
        sa.Column("provider", sa.String(64)),
        sa.Column("provider_model_id", sa.String(128)),
        sa.Column("measurement_method", sa.String(32), nullable=False),
        sa.Column("supports_native_citations", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("cost_per_1k_input", sa.Numeric(10, 6)),
        sa.Column("cost_per_1k_output", sa.Numeric(10, 6)),
        sa.Column("enabled", sa.Boolean(), nullable=False, server_default=sa.text("true")),
    )

    # RLS on tenant-scoped tables. Do NOT FORCE here: local docker uses the table
    # owner for migrations/seed. Production must connect the API as a role without
    # BYPASSRLS (and without being table owner) so these policies bind.
    for table in ("workspaces", "memberships"):
        op.execute(f"ALTER TABLE {table} ENABLE ROW LEVEL SECURITY")

    op.execute(
        """
        CREATE POLICY tenant_isolation_workspaces ON workspaces
          FOR ALL
          USING (
            current_setting('app.workspace_id', true) IS NULL
            OR current_setting('app.workspace_id', true) = ''
            OR id::text = current_setting('app.workspace_id', true)
          )
          WITH CHECK (
            current_setting('app.workspace_id', true) IS NULL
            OR current_setting('app.workspace_id', true) = ''
            OR id::text = current_setting('app.workspace_id', true)
          )
        """
    )
    op.execute(
        """
        CREATE POLICY tenant_isolation_memberships ON memberships
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
    op.drop_table("ai_models")
    op.drop_table("refresh_tokens")
    op.drop_table("memberships")
    op.drop_table("workspaces")
    op.drop_table("users")
    op.drop_table("organizations")
