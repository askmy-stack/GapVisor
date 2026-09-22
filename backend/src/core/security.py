from datetime import UTC, datetime, timedelta
from hashlib import sha256
from typing import Any
from uuid import uuid4

from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError
from jose import JWTError, jwt

from core.config import settings

_ph = PasswordHasher(time_cost=3, memory_cost=65536, parallelism=4)
ALGORITHM = "HS256"


def hash_password(password: str) -> str:
    return _ph.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return _ph.verify(hashed, plain)
    except VerifyMismatchError:
        return False


def create_access_token(subject: str, extra: dict[str, Any] | None = None) -> str:
    expire = datetime.now(UTC) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    payload: dict[str, Any] = {"sub": subject, "exp": expire, "type": "access"}
    if extra:
        payload.update(extra)
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=ALGORITHM)


def verify_access_token(token: str) -> dict[str, Any]:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError as exc:
        raise ValueError("Invalid or expired token") from exc
    if payload.get("type") != "access":
        raise ValueError("Invalid token type")
    return payload


def new_refresh_token() -> tuple[str, bytes, str]:
    """Return (raw_token, token_hash, family_id)."""
    raw = uuid4().hex + uuid4().hex
    token_hash = sha256(raw.encode("utf-8")).digest()
    family_id = str(uuid4())
    return raw, token_hash, family_id


def hash_refresh_token(raw: str) -> bytes:
    return sha256(raw.encode("utf-8")).digest()
