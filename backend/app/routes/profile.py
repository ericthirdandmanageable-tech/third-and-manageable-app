from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db, User, AthleteProfile
from app.schemas import IntakeIn, ProfileOut, ProfileUpdateIn, UserOut
from app.services.skills import derive_skill_map, score_path_fit

router = APIRouter(prefix="/profile", tags=["profile"])


def _ensure_profile(db: Session, user: User) -> AthleteProfile:
    if not user.profile:
        profile = AthleteProfile(user_id=user.id)
        db.add(profile)
        db.commit()
        db.refresh(profile)
    return user.profile


@router.get("", response_model=ProfileOut)
def get_profile(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    profile = _ensure_profile(db, user)
    return {
        "user_id": user.id,
        "intake_done": profile.intake_done,
        "intake_answers": profile.intake_answers or {},
        "skill_map": profile.skill_map or [],
    }


@router.post("/intake", response_model=ProfileOut)
def submit_intake(body: IntakeIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    profile = _ensure_profile(db, user)
    answers = {
        "sport": body.sport,
        "role": body.role,
        "years": body.years,
        "relied_on": body.relied_on,
        "favorite": body.favorite,
    }
    if body.community:
        answers["community"] = body.community
    profile.intake_answers = answers
    profile.intake_done = True
    profile.skill_map = derive_skill_map(answers)
    path_fit = score_path_fit(answers, profile.skill_map)  # noqa: F841 — computed for transparency/logs
    db.commit()
    db.refresh(profile)
    return {
        "user_id": user.id,
        "intake_done": True,
        "intake_answers": profile.intake_answers,
        "skill_map": profile.skill_map,
    }


@router.patch("", response_model=UserOut)
def update_profile(body: ProfileUpdateIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Edit the career-defining profile fields. `None` means "leave as-is";
    to clear a nullable field send an empty string."""
    if body.display_name is not None:
        user.display_name = body.display_name
    if body.school is not None:
        user.school = body.school or None
    if body.status is not None:
        user.status = body.status
    if body.headline is not None:
        user.headline = body.headline or None
    db.commit()
    db.refresh(user)
    return UserOut.model_validate(user)