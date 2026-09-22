from collections.abc import Generator

from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session, sessionmaker

from core.config import settings

engine = create_engine(settings.DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def set_workspace_rls(db: Session, workspace_id: str | None) -> None:
    """SET LOCAL app.workspace_id for Postgres RLS policies."""
    if workspace_id is None:
        db.execute(text("RESET app.workspace_id"))
    else:
        db.execute(
            text("SELECT set_config('app.workspace_id', :wid, true)"),
            {"wid": workspace_id},
        )
