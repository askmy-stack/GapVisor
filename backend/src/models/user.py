from datetime import datetime

from sqlalchemy import DateTime, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from models.base import Base, TimestampMixin, new_uuid


class User(Base, TimestampMixin):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    email: Mapped[str] = mapped_column(String(320), unique=True, nullable=False, index=True)
    password_hash: Mapped[str | None] = mapped_column(Text)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    avatar_url: Mapped[str | None] = mapped_column(Text)
    oauth_provider: Mapped[str | None] = mapped_column(String(32))
    oauth_subject: Mapped[str | None] = mapped_column(String(255))
    last_active_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    memberships = relationship("Membership", back_populates="user", foreign_keys="Membership.user_id")
