from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, HTTPException, Request, Response, status
from sqlalchemy import select

from core.config import settings
from core.deps import CurrentUser, DbSession
from core.security import (
    create_access_token,
    hash_password,
    hash_refresh_token,
    new_refresh_token,
    verify_password,
)
from models import Membership, Organization, RefreshToken, User, Workspace
from schemas import LoginRequest, LoginResponse, MembershipOut, MeResponse, RegisterRequest, UserOut

router = APIRouter(prefix="/auth", tags=["auth"])


def _memberships_for(db: DbSession, user_id: str) -> list[MembershipOut]:
    rows = db.execute(
        select(Membership, Workspace)
        .join(Workspace, Workspace.id == Membership.workspace_id)
        .where(Membership.user_id == user_id)
    ).all()
    return [
        MembershipOut(
            workspace_id=m.workspace_id,
            role=m.role,
            status=m.status,
            workspace_name=w.name,
            brand_name=w.brand_name,
        )
        for m, w in rows
    ]


def _set_refresh_cookie(response: Response, raw_token: str) -> None:
    response.set_cookie(
        key=settings.REFRESH_COOKIE_NAME,
        value=raw_token,
        httponly=True,
        secure=settings.REFRESH_COOKIE_SECURE,
        samesite=settings.REFRESH_COOKIE_SAMESITE,
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 3600,
        path="/api/v1/auth",
    )


def _issue_tokens(
    db: DbSession,
    response: Response,
    user: User,
    request: Request | None = None,
) -> str:
    access = create_access_token(subject=user.id)
    raw, token_hash, family_id = new_refresh_token()
    db.add(
        RefreshToken(
            user_id=user.id,
            token_hash=token_hash,
            family_id=family_id,
            expires_at=datetime.now(UTC) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
            user_agent=(request.headers.get("user-agent") if request else None),
            ip=(request.client.host if request and request.client else None),
        )
    )
    db.commit()
    _set_refresh_cookie(response, raw)
    return access


@router.post("/register", response_model=LoginResponse, status_code=status.HTTP_201_CREATED)
def register(body: RegisterRequest, db: DbSession, response: Response, request: Request) -> LoginResponse:
    existing = db.scalar(select(User).where(User.email == body.email.lower()))
    if existing is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

    org = Organization(name=body.organization_name)
    db.add(org)
    db.flush()

    workspace = Workspace(
        org_id=org.id,
        name=f"{body.brand_name} Workspace",
        brand_name=body.brand_name,
        brand_domains=[],
        monitoring_frequency="weekly",
    )
    db.add(workspace)
    db.flush()

    user = User(
        email=body.email.lower(),
        password_hash=hash_password(body.password),
        name=body.name,
    )
    db.add(user)
    db.flush()

    db.add(
        Membership(
            user_id=user.id,
            workspace_id=workspace.id,
            role="owner",
            status="active",
            accepted_at=datetime.now(UTC),
        )
    )
    db.commit()
    db.refresh(user)

    access = _issue_tokens(db, response, user, request)
    return LoginResponse(
        access_token=access,
        user=UserOut.model_validate(user),
        memberships=_memberships_for(db, user.id),
    )


@router.post("/login", response_model=LoginResponse)
def login(body: LoginRequest, db: DbSession, response: Response, request: Request) -> LoginResponse:
    user = db.scalar(select(User).where(User.email == body.email.lower()))
    if user is None or not user.password_hash or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")

    user.last_active_at = datetime.now(UTC)
    db.commit()

    access = _issue_tokens(db, response, user, request)
    return LoginResponse(
        access_token=access,
        user=UserOut.model_validate(user),
        memberships=_memberships_for(db, user.id),
    )


@router.post("/refresh", response_model=LoginResponse)
def refresh(db: DbSession, request: Request, response: Response) -> LoginResponse:
    raw = request.cookies.get(settings.REFRESH_COOKIE_NAME)
    if not raw:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing refresh token")

    token_hash = hash_refresh_token(raw)
    stored = db.scalar(select(RefreshToken).where(RefreshToken.token_hash == token_hash))
    if stored is None or stored.revoked_at is not None:
        # Reuse detection: revoke entire family if hash was already rotated away
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")
    if stored.expires_at < datetime.now(UTC):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token expired")

    user = db.get(User, stored.user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")

    stored.revoked_at = datetime.now(UTC)
    db.commit()
    access = _issue_tokens(db, response, user, request)
    return LoginResponse(
        access_token=access,
        user=UserOut.model_validate(user),
        memberships=_memberships_for(db, user.id),
    )


@router.post("/logout")
def logout(db: DbSession, request: Request, response: Response) -> dict:
    raw = request.cookies.get(settings.REFRESH_COOKIE_NAME)
    if raw:
        token_hash = hash_refresh_token(raw)
        stored = db.scalar(select(RefreshToken).where(RefreshToken.token_hash == token_hash))
        if stored is not None and stored.revoked_at is None:
            stored.revoked_at = datetime.now(UTC)
            # revoke family
            family = db.scalars(
                select(RefreshToken).where(
                    RefreshToken.family_id == stored.family_id,
                    RefreshToken.revoked_at.is_(None),
                )
            ).all()
            now = datetime.now(UTC)
            for t in family:
                t.revoked_at = now
            db.commit()
    response.delete_cookie(key=settings.REFRESH_COOKIE_NAME, path="/api/v1/auth")
    return {"ok": True}


@router.get("/oauth/{provider}")
def oauth_stub(provider: str) -> dict:
    if provider not in {"google", "microsoft"}:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="OAuth provider not found")
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail=f"{provider} OAuth is not implemented yet",
    )


@router.get("/me", response_model=MeResponse)
def me(current_user: CurrentUser, db: DbSession) -> MeResponse:
    return MeResponse(
        user=UserOut.model_validate(current_user),
        memberships=_memberships_for(db, current_user.id),
    )
