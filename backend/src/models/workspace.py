from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.orm import Mapped, mapped_column, relationship

from models.base import Base, TimestampMixin, new_uuid


class Workspace(Base, TimestampMixin):
    __tablename__ = "workspaces"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    org_id: Mapped[str] = mapped_column(String(36), ForeignKey("organizations.id"), nullable=False)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    brand_name: Mapped[str] = mapped_column(Text, nullable=False)
    brand_domains: Mapped[list[str]] = mapped_column(ARRAY(Text), nullable=False, default=list)
    fact_sheet: Mapped[str | None] = mapped_column(Text)
    monitoring_frequency: Mapped[str] = mapped_column(String(32), nullable=False, default="weekly")
    timezone: Mapped[str] = mapped_column(String(64), nullable=False, default="UTC")
    onboarding_completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    organization = relationship("Organization", back_populates="workspaces")
    memberships = relationship("Membership", back_populates="workspace")
