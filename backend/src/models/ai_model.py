from sqlalchemy import Boolean, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from models.base import Base


class AiModel(Base):
    """Global catalog of tracked AI surfaces (not tenant-scoped)."""

    __tablename__ = "ai_models"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    long_name: Mapped[str] = mapped_column(Text, nullable=False)
    badge: Mapped[str] = mapped_column(String(8), nullable=False)
    provider: Mapped[str | None] = mapped_column(String(64))
    provider_model_id: Mapped[str | None] = mapped_column(String(128))
    # api | proxy | derived | unavailable | customer_key
    measurement_method: Mapped[str] = mapped_column(String(32), nullable=False)
    supports_native_citations: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    cost_per_1k_input: Mapped[float | None] = mapped_column(Numeric(10, 6))
    cost_per_1k_output: Mapped[float | None] = mapped_column(Numeric(10, 6))
    enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
