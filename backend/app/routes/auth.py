from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.auth import (
    create_access_token,
    get_current_user,
    hash_password,
    normalize_email,
    verify_password,
)
from app.config import settings
from app.database import (
    PasswordCredential,
    User,
    UserEmail,
    get_db,
    utcnow,
)
from app.schemas import RegisterIn, LoginIn, AuthOut, UserOut

router = APIRouter(prefix="/auth", tags=["auth"])


def _lookup_by_email(db: Session, email: str) -> User | None:
    row = (
        db.query(UserEmail)
        .filter(UserEmail.normalized_email == normalize_email(email))
        .first()
    )
    return row.user if row else None


@router.post("/register", response_model=AuthOut)
def register(body: RegisterIn, db: Session = Depends(get_db)):
    if _lookup_by_email(db, body.email):
        raise HTTPException(status_code=400, detail="Email already registered")
    # Verification model: settings.auto_verify is True in dev (full flow walkable),
    # False in production — where a review step (roster DB / .edu allow-list)
    # flips verified=True before the athlete can write to Community.
    user = User(
        display_name=body.display_name,
        school=body.school,
        status=body.status,
        verified=settings.auto_verify,
    )
    # Identity, email and credential are three rows now, written in one
    # transaction. The email is an attribute of the user, not the key to them.
    user.emails.append(
        UserEmail(
            email=body.email,
            normalized_email=normalize_email(body.email),
            primary=True,
            verified=False,
        )
    )
    user.password = PasswordCredential(password_hash=hash_password(body.password))
    db.add(user)
    db.commit()
    db.refresh(user)
    return AuthOut(access_token=create_access_token(user), user=UserOut.from_user(user))


@router.post("/login", response_model=AuthOut)
def login(body: LoginIn, db: Session = Depends(get_db)):
    user = _lookup_by_email(db, body.email)
    if (
        not user
        or user.deleted_at is not None
        or not user.password
        or not verify_password(body.password, user.password.password_hash)
    ):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if user.banned:
        raise HTTPException(status_code=403, detail="Account banned")
    if user.suspended:
        raise HTTPException(status_code=403, detail="Account suspended")
    return AuthOut(access_token=create_access_token(user), user=UserOut.from_user(user))


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)):
    return UserOut.from_user(user)


@router.post("/logout")
def logout(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Server-side revocation. Bumping `auth_version` kills every token already
    issued to this user, which a stateless JWT could not do before."""
    user.auth_version += 1
    user.updated_at = utcnow()
    db.commit()
    return {"status": "logged_out"}
