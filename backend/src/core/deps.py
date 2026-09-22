from typing import Annotated
from uuid import UUID

from fastapi import Depends, Header, HTTPException, status
from sqlalchemy.orm import Session

from core.db import get_db, set_workspace_rls
from core.security import verify_access_token
from models.membership import Membership
from models.user import User


def get_current_user(
    db: Annotated[Session, Depends(get_db)],
    authorization: Annotated[str | None, Header()] = None,
) -> User:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    token = authorization.split(" ", 1)[1].strip()
    try:
        payload = verify_access_token(token)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid session") from None

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid session")

    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user


def get_workspace_id(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
    x_workspace_id: Annotated[str | None, Header(alias="X-Workspace-Id")] = None,
) -> str:
    if not x_workspace_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="X-Workspace-Id header is required",
        )
    try:
        workspace_uuid = UUID(x_workspace_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid workspace id") from None

    membership = (
        db.query(Membership)
        .filter(
            Membership.user_id == current_user.id,
            Membership.workspace_id == str(workspace_uuid),
            Membership.status == "active",
        )
        .one_or_none()
    )
    if membership is None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not a member of this workspace")

    set_workspace_rls(db, str(workspace_uuid))
    return str(workspace_uuid)


CurrentUser = Annotated[User, Depends(get_current_user)]
WorkspaceId = Annotated[str, Depends(get_workspace_id)]
DbSession = Annotated[Session, Depends(get_db)]
