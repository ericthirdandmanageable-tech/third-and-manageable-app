from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db, User, ClipboardMessage
from app.schemas import ClipboardChatIn, ClipboardMessageOut, ClipboardHistoryOut
from app.services.gemini import chat as gemini_chat

router = APIRouter(prefix="/clipboard", tags=["clipboard"])


def _history(db: Session, user: User, limit: int = 20) -> list[dict]:
    rows = (
        db.query(ClipboardMessage)
        .filter(ClipboardMessage.user_id == user.id)
        .order_by(ClipboardMessage.created_at.desc())
        .limit(limit)
        .all()
    )
    rows = list(reversed(rows))
    return [{"role": m.role, "text": m.text} for m in rows]


@router.get("/history", response_model=ClipboardHistoryOut)
def history(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    rows = (
        db.query(ClipboardMessage)
        .filter(ClipboardMessage.user_id == user.id)
        .order_by(ClipboardMessage.created_at)
        .all()
    )
    msgs = []
    for m in rows:
        out = ClipboardMessageOut(id=m.id, role=m.role, text=m.text, persona=m.persona, created_at=m.created_at)
        msgs.append(out)
    return {"messages": msgs}


@router.delete("/history")
def clear_history(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Wipe the athlete's Clipboard conversation so they can start fresh."""
    deleted = (
        db.query(ClipboardMessage)
        .filter(ClipboardMessage.user_id == user.id)
        .delete(synchronize_session=False)
    )
    db.commit()
    return {"cleared": deleted}


@router.post("/chat", response_model=ClipboardMessageOut)
def send(body: ClipboardChatIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # persist the user's message
    user_msg = ClipboardMessage(user_id=user.id, role="user", text=body.message, persona=body.persona)
    db.add(user_msg)
    db.commit()

    history = _history(db, user)
    reply = gemini_chat(history, persona_id=body.persona)

    ai_msg = ClipboardMessage(
        user_id=user.id,
        role="ai",
        text=reply["text"],
        persona=body.persona,
    )
    db.add(ai_msg)
    db.commit()
    db.refresh(ai_msg)

    return ClipboardMessageOut(
        id=ai_msg.id,
        role="ai",
        text=ai_msg.text,
        persona=ai_msg.persona,
        created_at=ai_msg.created_at,
        options=reply.get("options", []),
    )