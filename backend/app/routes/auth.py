from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.auth import hash_password, verify_password, create_access_token, get_current_user
from app.config import settings
from app.database import get_db, User
from app.schemas import RegisterIn, LoginIn, AuthOut, UserOut

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=AuthOut)
def register(body: RegisterIn, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == body.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    # Verification model: settings.auto_verify is True in dev (full flow walkable),
    # False in production — where a review step (roster DB / .edu allow-list)
    # flips verified=True before the athlete can write to Community.
    user = User(
        email=body.email,
        password_hash=hash_password(body.password),
        display_name=body.display_name,
        school=body.school,
        status=body.status,
        verified=settings.auto_verify,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    token = create_access_token(user.id)
    return AuthOut(access_token=token, user=UserOut.model_validate(user))


@router.post("/login", response_model=AuthOut)
def login(body: LoginIn, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == body.email).first()
    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = create_access_token(user.id)
    return AuthOut(access_token=token, user=UserOut.model_validate(user))


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)):
    return user