from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from models.base import Base


class Membership(Base):
    __tablename__ = "memberships"
    __table_args__ = (UniqueConstraint("user_id", "workspace_id", name="uq_memberships_user_workspace"),)

    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), primary_key=True)
    workspace_id: Mapped[str] = mapped_column(String(36), ForeignKey("workspaces.id"), primary_key=True)
    role: Mapped[str] = mapped_column(String(32), nullable=False)  # owner|admin|analyst|viewer
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="active")
    invited_by: Mapped[str | None] = mapped_column(String(36), ForeignKey("users.id"))
    invited_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    accepted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    user = relationship("User", back_populates="memberships", foreign_keys=[user_id])
    workspace = relationship("Workspace", back_populates="memberships")
