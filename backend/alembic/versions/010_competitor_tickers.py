"""vNext G9: competitor ticker symbols

Revision ID: 010_competitor_tickers
Revises: 009_anomalies
Create Date: 2026-09-28

Adds a nullable `competitors.ticker_symbol` so the optional MarketPulse
adapter can map market events to a tracked company. StartupIntel matches on
the existing `competitors.domain` and needs no schema change.
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "010_competitor_tickers"
down_revision: str | None = "009_anomalies"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("competitors", sa.Column("ticker_symbol", sa.String(16)))


def downgrade() -> None:
    op.drop_column("competitors", "ticker_symbol")
