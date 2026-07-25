from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db, User, AthleteProfile, Commitment, ActionCompletion, CheckIn
from app.schemas import ArtifactOut, PeerSupportOut, TechSupportIn

router = APIRouter(tags=["misc"])


@router.get("/artifacts", response_model=list[ArtifactOut])
def list_artifacts(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Which artifacts the athlete has unlocked (REDESIGN_BRIEF §12)."""
    profile = user.profile
    intake_done = bool(profile and profile.intake_done)
    committed = bool(user.commitment and user.commitment.path_id)
    completed = db.query(ActionCompletion).filter(ActionCompletion.user_id == user.id).count()
    check_ins = db.query(CheckIn).filter(CheckIn.user_id == user.id).count()

    return [
        ArtifactOut(id="day_counter", unlocked=True, title="Day Counter"),
        ArtifactOut(id="weekly_recap", unlocked=True, title="Weekly Recap"),
        ArtifactOut(id="skill_map", unlocked=intake_done, title="Skill Map"),
        ArtifactOut(id="path_commitment", unlocked=committed, title="Path Commitment"),
    ]


@router.post("/support/peer", response_model=PeerSupportOut)
def request_peer_support(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    from app.database import PeerSupportRequest
    req = PeerSupportRequest(user_id=user.id, status="notified")
    db.add(req)
    db.commit()
    return PeerSupportOut(status="notified", message="We've notified the community. A peer will reach out soon.")


@router.post("/support/tech", response_model=PeerSupportOut)
def request_tech_support(body: TechSupportIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    from app.database import TechSupportRequest
    req = TechSupportRequest(user_id=user.id, message=body.message, status="open")
    db.add(req)
    db.commit()
    return PeerSupportOut(status="open", message="Request sent. We'll be in touch.")