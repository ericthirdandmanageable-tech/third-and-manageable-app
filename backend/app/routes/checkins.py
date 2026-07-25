from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db, User, CheckIn
from app.schemas import CheckInIn, CheckInOut, CheckInUpdateIn

router = APIRouter(prefix="/check-ins", tags=["check-ins"])


@router.get("/today", response_model=CheckInOut | None)
def todays_check_in(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    today = date.today().isoformat()
    ci = db.query(CheckIn).filter(CheckIn.user_id == user.id, CheckIn.date == today).first()
    if not ci:
        return None
    return CheckInOut.model_validate(ci)


@router.post("", response_model=CheckInOut)
def submit_check_in(body: CheckInIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    today = date.today().isoformat()
    if db.query(CheckIn).filter(CheckIn.user_id == user.id, CheckIn.date == today).first():
        raise HTTPException(status_code=409, detail="Already checked in today")
    ci = CheckIn(
        user_id=user.id,
        date=today,
        prompt_id=body.prompt_id,
        prompt_question=body.prompt_question,
        option=body.option,
        journal=body.journal,
        ambient=body.ambient,
    )
    db.add(ci)
    db.commit()
    db.refresh(ci)
    return CheckInOut.model_validate(ci)


@router.patch("/today", response_model=CheckInOut)
def update_todays_check_in(body: CheckInUpdateIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    today = date.today().isoformat()
    ci = db.query(CheckIn).filter(CheckIn.user_id == user.id, CheckIn.date == today).first()
    if not ci:
        raise HTTPException(status_code=404, detail="No check-in today to edit")
    if body.option is not None:
        ci.option = body.option
    if body.journal is not None:
        ci.journal = body.journal or None
    db.commit()
    db.refresh(ci)
    return CheckInOut.model_validate(ci)


@router.get("", response_model=list[CheckInOut])
def list_check_ins(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    rows = db.query(CheckIn).filter(CheckIn.user_id == user.id).order_by(CheckIn.date.desc()).limit(90).all()
    return [CheckInOut.model_validate(r) for r in rows]