from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db, User, AthleteProfile, Commitment, ActionCompletion
from app.schemas import CommitIn, ActionToggleIn, GamePlanOut
from app.services.registry import (
    WORK_PATHS, WEEKLY_ACTIONS, get_path,
)
from app.services.journey import journey_for
from app.services.skills import derive_skill_map, score_path_fit

router = APIRouter(prefix="/game-plan", tags=["game-plan"])


def _profile(db: Session, user: User) -> AthleteProfile:
    if not user.profile:
        p = AthleteProfile(user_id=user.id)
        db.add(p)
        db.commit()
        db.refresh(p)
        return p
    return user.profile


@router.get("", response_model=GamePlanOut)
def get_game_plan(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    profile = _profile(db, user)
    skill_map = profile.skill_map or []
    path_fit = []

    if profile.intake_done and profile.intake_answers:
        skill_map = profile.skill_map or derive_skill_map(profile.intake_answers)
        scored = score_path_fit(profile.intake_answers, skill_map)
        path_fit = [
            {"id": p["id"], "name": p["name"], "fit": p["fit"], "rationale": p["rationale"], "meta": p["meta"]}
            for p in scored
        ]
    else:
        path_fit = [
            {"id": p["id"], "name": p["name"], "fit": p["fit"], "rationale": p["rationale"], "meta": p["meta"]}
            for p in WORK_PATHS
        ]

    completed = [a.action_id for a in db.query(ActionCompletion).filter(ActionCompletion.user_id == user.id).all()]
    journey = journey_for(db, user.id)

    return {
        "intake_done": profile.intake_done,
        "skill_map": skill_map,
        "path_fit": path_fit,
        "committed_path_id": user.commitment.path_id if user.commitment else None,
        "weekly_actions": WEEKLY_ACTIONS,
        "completed_action_ids": completed,
        "day": journey["day"],
        "streak": journey["streak"],
        "total_days": journey["total_days"],
        "phase": journey["phase"],
        "check_in_count": journey["check_in_count"],
    }


@router.post("/commit", response_model=GamePlanOut)
def commit(body: CommitIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if body.path_id is None:
        # Un-commit — clearing the commitment is a real action, not a no-op.
        if user.commitment:
            db.delete(user.commitment)
            db.commit()
        return get_game_plan(user=user, db=db)  # type: ignore[arg-type]
    if not get_path(body.path_id):
        raise HTTPException(status_code=400, detail="Unknown path")
    if user.commitment:
        user.commitment.path_id = body.path_id
    else:
        db.add(Commitment(user_id=user.id, path_id=body.path_id))
    db.commit()
    return get_game_plan(user=user, db=db)  # type: ignore[arg-type]


@router.post("/actions/toggle", response_model=GamePlanOut)
def toggle_action(body: ActionToggleIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    existing = (
        db.query(ActionCompletion)
        .filter(ActionCompletion.user_id == user.id, ActionCompletion.action_id == body.action_id)
        .first()
    )
    if existing:
        db.delete(existing)
    else:
        db.add(ActionCompletion(user_id=user.id, action_id=body.action_id, week_of=date.today().isocalendar()[1]))
    db.commit()
    return get_game_plan(user=user, db=db)  # type: ignore[arg-type]


@router.get("/paths/{path_id}")
def get_path_detail(path_id: str, user: User = Depends(get_current_user)):
    path = get_path(path_id)
    if not path:
        raise HTTPException(status_code=404, detail="Path not found")
    return {
        "id": path["id"],
        "name": path["name"],
        "icon": path["id"],  # frontend owns icon mapping
        "tagline": path["tagline"],
        "schedule_shape": path["schedule_shape"],
        "income_texture": path["income_texture"],
        "loves": path["loves"],
        "hates": path["hates"],
        "first_reps": path["first_reps"],
        "meta": path["meta"],
        "fit": path["fit"],
        "forum_id": f"path-{path['id']}",
    }