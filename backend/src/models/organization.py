from sqlalchemy import String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from models.base import Base, TimestampMixin, new_uuid


class Organization(Base, TimestampMixin):
    __tablename__ = "organizations"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    stripe_customer_id: Mapped[str | None] = mapped_column(String(255), unique=True)

    workspaces = relationship("Workspace", back_populates="organization")
