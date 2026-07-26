import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
import bcrypt
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db, User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login", auto_error=False)


def normalize_email(email: str) -> str:
    """The single definition of `user_emails.normalized_email`, enforced by a
    database CHECK. Lookups go through this, never through the raw value."""
    return email.strip().lower()


def hash_password(pw: str) -> str:
    # bcrypt truncates at 72 bytes; truncate explicitly to avoid the 4.x ValueError.
    return bcrypt.hashpw(pw.encode("utf-8")[:72], bcrypt.gensalt()).decode("utf-8")


def verify_password(pw: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(pw.encode("utf-8")[:72], hashed.encode("utf-8"))
    except ValueError:
        return False


def create_access_token(user: User) -> str:
    """`sub` is the canonical UUID, not a row number, and `av` pins the user's
    auth version so a suspension or forced logout can invalidate outstanding
    tokens instead of waiting seven days for them to expire (§6.7)."""
    exp = datetime.now(timezone.utc) + timedelta(
        minutes=settings.access_token_expire_minutes
    )
    return jwt.encode(
        {"sub": str(user.id), "av": user.auth_version, "exp": exp},
        settings.jwt_secret,
        algorithm=settings.jwt_alg,
    )


def _user_from_token(token: Optional[str], db: Session) -> Optional[User]:
    if not token:
        return None
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_alg])
        uid = uuid.UUID(str(payload.get("sub", "")))
    except (JWTError, ValueError):
        return None
    user = db.get(User, uid)
    if not user or user.deleted_at is not None:
        return None
    # A token minted before the user's auth version was bumped is dead.
    if payload.get("av") != user.auth_version:
        return None
    return user


def get_current_user(
    token: Optional[str] = Depends(oauth2_scheme), db: Session = Depends(get_db)
) -> User:
    user = _user_from_token(token, db)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated"
        )
    # §6.3: these flags were decorative — the admin portal wrote them and the
    # API never looked, so banning a user did nothing. It does now.
    if user.banned:
        raise HTTPException(status_code=403, detail="Account banned")
    if user.suspended:
        raise HTTPException(status_code=403, detail="Account suspended")
    return user


def require_verified(user: User = Depends(get_current_user)) -> User:
    if not user.verified:
        raise HTTPException(status_code=403, detail="Athlete verification pending")
    if user.chat_banned:
        raise HTTPException(status_code=403, detail="Community access revoked")
    return user


def optional_user(
    token: Optional[str] = Depends(oauth2_scheme), db: Session = Depends(get_db)
) -> Optional[User]:
    user = _user_from_token(token, db)
    if user and (user.banned or user.suspended):
        return None
    return user
