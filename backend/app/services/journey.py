"""Journey derivation — the 90-day arc is earned, not hardcoded.

Day number and streak come from the athlete's actual check-in rows:
- day N = N days since the first check-in (clamped to the 90-day arc)
- streak = consecutive days with a check-in, counting back from today
  (yesterday counts while today is still open)
"""
from datetime import date, timedelta

from sqlalchemy.orm import Session

from app.database import CheckIn
from app.services.registry import JOURNEY_PHASES, get_phase_for_day

TOTAL_DAYS = 90


def _check_in_dates(db: Session, user_id: int) -> set[date]:
    rows = db.query(CheckIn.date).filter(CheckIn.user_id == user_id).all()
    return {date.fromisoformat(r[0]) for r in rows}


def journey_for(db: Session, user_id: int) -> dict:
    dates = _check_in_dates(db, user_id)
    today = date.today()

    if dates:
        day = min((today - min(dates)).days + 1, TOTAL_DAYS)
    else:
        day = 1  # pre-Day-1: hasn't checked in yet, still at the start line

    streak = 0
    cursor = today if today in dates else today - timedelta(days=1)
    while cursor in dates:
        streak += 1
        cursor -= timedelta(days=1)

    phase = get_phase_for_day(day)
    return {
        "day": day,
        "streak": streak,
        "total_days": TOTAL_DAYS,
        "phase": {"id": phase["id"], "name": phase["name"]},
        "check_in_count": len(dates),
        "check_in_dates": sorted(d.isoformat() for d in dates),
    }


__all__ = ["journey_for", "TOTAL_DAYS", "JOURNEY_PHASES"]
