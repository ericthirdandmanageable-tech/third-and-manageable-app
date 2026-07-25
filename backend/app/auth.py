from datetime import datetime, timedelta
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
import bcrypt
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db, User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login", auto_error=False)


def hash_password(pw: str) -> str:
    # bcrypt truncates at 72 bytes; truncate explicitly to avoid the 4.x ValueError.
    return bcrypt.hashpw(pw.encode("utf-8")[:72], bcrypt.gensalt()).decode("utf-8")


def verify_password(pw: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(pw.encode("utf-8")[:72], hashed.encode("utf-8"))
    except ValueError:
        return False


def create_access_token(user_id: int) -> str:
    exp = datetime.utcnow() + timedelta(minutes=settings.access_token_expire_minutes)
    return jwt.encode({"sub": str(user_id), "exp": exp}, settings.jwt_secret, algorithm=settings.jwt_alg)


def get_current_user(token: Optional[str] = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    cred_exc = HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    if not token:
        raise cred_exc
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_alg])
        uid = int(payload.get("sub", 0))
    except (JWTError, ValueError):
        raise cred_exc
    user = db.get(User, uid)
    if not user:
        raise cred_exc
    return user


def require_verified(user: User = Depends(get_current_user)) -> User:
    if not user.verified:
        raise HTTPException(status_code=403, detail="Athlete verification pending")
    return user


def optional_user(token: Optional[str] = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> Optional[User]:
    if not token:
        return None
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_alg])
        uid = int(payload.get("sub", 0))
    except (JWTError, ValueError):
        return None
    return db.get(User, uid)