"""Behaviour that the UUID/timezone migration is supposed to guarantee.

`test_schema_contract.py` proves the shapes line up. This proves the bridge
actually behaves correctly against them — the parts a shape check cannot see.
"""
from datetime import date, datetime, timedelta, timezone
from uuid import UUID

import pytest

from app.database import ActionCompletion, CheckIn, User, utcnow
from app.routes.gameplan import _week_of
from app.services.registry import WEEKLY_ACTIONS, category_for_action
from tests.conftest import TestingSession, user_by_email


@pytest.fixture(scope="module")
def athlete(client):
    r = client.post("/auth/register", json={
        "email": "Compat@Test.dev", "password": "password123", "display_name": "Compat",
    })
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


# ---------- identity ----------

def test_user_id_is_a_uuid_not_a_row_number(client, athlete):
    body = client.get("/auth/me", headers=athlete).json()
    parsed = UUID(body["id"])
    assert parsed.version == 4
    assert str(parsed) != "1"


def test_jwt_subject_is_the_uuid(client, athlete):
    from jose import jwt
    from app.config import settings

    token = athlete["Authorization"].removeprefix("Bearer ")
    claims = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_alg])
    me = client.get("/auth/me", headers=athlete).json()
    assert claims["sub"] == me["id"]


def test_email_lookup_is_case_and_whitespace_insensitive(client):
    """Registration stored `Compat@Test.dev`; login must normalise both sides,
    and a second registration of the same address must be rejected."""
    r = client.post("/auth/login", json={
        "email": "  COMPAT@test.DEV  ", "password": "password123",
    })
    assert r.status_code == 200, r.text
    dupe = client.post("/auth/register", json={
        "email": "compat@TEST.dev", "password": "password123", "display_name": "Dupe",
    })
    assert dupe.status_code == 400


def test_email_is_not_stored_on_the_user_row(client, athlete):
    """§2.4/§6.7: emails are attributes in `user_emails`, never the key."""
    assert not hasattr(User, "email")
    db = TestingSession()
    try:
        user = user_by_email(db, "compat@test.dev")
        assert user is not None
        # Local-part casing is preserved (Pydantic's EmailStr lowercases only
        # the domain); the normalized column is what lookups and the unique
        # index use, so the two must not be conflated.
        assert user.primary_email == "Compat@test.dev"
        assert [e.normalized_email for e in user.emails] == ["compat@test.dev"]
    finally:
        db.close()


# ---------- timezone ----------

def test_timestamps_round_trip_timezone_aware(client, athlete):
    client.post("/clipboard/chat", json={"message": "hi", "persona": "analyst"},
                headers=athlete)
    body = client.get("/clipboard/history", headers=athlete).json()
    created = datetime.fromisoformat(body["messages"][0]["created_at"])
    assert created.tzinfo is not None, "instant came back naive"
    assert abs((datetime.now(timezone.utc) - created).total_seconds()) < 300


def test_naive_datetime_is_rejected_at_the_boundary(client):
    """The failure mode this migration exists to remove: a naive datetime
    silently stored as if it were UTC."""
    db = TestingSession()
    try:
        user = user_by_email(db, "compat@test.dev")
        user.verification_requested_at = datetime.now()  # naive, on purpose
        with pytest.raises(Exception, match="naive datetime rejected"):
            db.commit()
    finally:
        db.rollback()
        db.close()


def test_utcnow_is_aware():
    assert utcnow().tzinfo is not None


def test_check_in_date_is_a_calendar_day(client, athlete):
    r = client.post("/check-ins", json={
        "prompt_id": "p1", "prompt_question": "q", "option": "Good",
    }, headers=athlete)
    assert r.status_code == 200, r.text
    assert r.json()["date"] == date.today().isoformat()
    db = TestingSession()
    try:
        user = user_by_email(db, "compat@test.dev")
        row = db.query(CheckIn).filter(CheckIn.user_id == user.id).first()
        assert isinstance(row.date, date) and not isinstance(row.date, datetime)
    finally:
        db.close()


# ---------- weekly actions (§6.5) ----------

def test_taxonomy_is_the_admins_fifteen_habits():
    assert len(WEEKLY_ACTIONS) == 15
    assert {a["id"] for a in WEEKLY_ACTIONS} == {
        "career-explore", "career-network", "career-resume",
        "routine-morning", "routine-exercise", "routine-sleep",
        "mindset-journal", "mindset-gratitude", "mindset-meditation",
        "social-connect", "social-mentor", "social-community",
        "wellness-therapy", "wellness-nutrition", "wellness-hobby",
    }
    # The backend's old generic reps are gone, not merely supplemented.
    assert not {"a1", "a2", "a3", "a4"} & {a["id"] for a in WEEKLY_ACTIONS}
    assert category_for_action("a1") is None


def test_week_of_is_the_monday_of_the_iso_week():
    wednesday = date(2026, 7, 22)
    assert _week_of(wednesday) == date(2026, 7, 20)
    assert _week_of(date(2026, 7, 20)) == date(2026, 7, 20)  # Monday
    assert _week_of(date(2026, 7, 26)) == date(2026, 7, 20)  # Sunday
    # A bare week *number* collided across years; a date cannot.
    assert _week_of(date(2025, 7, 23)) != _week_of(date(2026, 7, 22))


def test_toggle_records_week_and_category(client, athlete):
    r = client.post("/game-plan/actions/toggle",
                    json={"action_id": "wellness-therapy"}, headers=athlete)
    assert r.status_code == 200, r.text
    db = TestingSession()
    try:
        user = user_by_email(db, "compat@test.dev")
        row = (
            db.query(ActionCompletion)
            .filter(ActionCompletion.user_id == user.id)
            .one()
        )
        assert row.category == "wellness"
        assert row.week_of == _week_of()
        assert row.completed_at.tzinfo is not None
    finally:
        db.close()


def test_toggle_rejects_an_id_outside_the_taxonomy(client, athlete):
    r = client.post("/game-plan/actions/toggle", json={"action_id": "a1"},
                    headers=athlete)
    assert r.status_code == 400


def test_completed_actions_are_scoped_to_the_current_week(client, athlete):
    """A rep completed last week must not show as done this week."""
    db = TestingSession()
    try:
        user = user_by_email(db, "compat@test.dev")
        db.add(ActionCompletion(
            user_id=user.id, action_id="career-resume", category="career",
            week_of=_week_of() - timedelta(days=7),
        ))
        db.commit()
    finally:
        db.close()
    completed = client.get("/game-plan", headers=athlete).json()["completed_action_ids"]
    assert "wellness-therapy" in completed
    assert "career-resume" not in completed


# ---------- moderation enforcement (§6.3) ----------

@pytest.mark.parametrize("flag,expected_detail", [
    ("banned", "Account banned"),
    ("suspended", "Account suspended"),
])
def test_moderation_flags_actually_lock_the_account(client, flag, expected_detail):
    """These were decorative: the admin portal wrote them and the API never
    read them, so banning a user did nothing at all."""
    r = client.post("/auth/register", json={
        "email": f"{flag}@test.dev", "password": "password123", "display_name": "M",
    })
    headers = {"Authorization": f"Bearer {r.json()['access_token']}"}
    assert client.get("/auth/me", headers=headers).status_code == 200

    db = TestingSession()
    try:
        setattr(user_by_email(db, f"{flag}@test.dev"), flag, True)
        db.commit()
    finally:
        db.close()

    blocked = client.get("/auth/me", headers=headers)
    assert blocked.status_code == 403
    assert blocked.json()["detail"] == expected_detail
    # and the door is shut at login too, not just for existing tokens
    assert client.post("/auth/login", json={
        "email": f"{flag}@test.dev", "password": "password123",
    }).status_code == 403


def test_chat_ban_blocks_community_but_not_the_rest_of_the_app(client):
    r = client.post("/auth/register", json={
        "email": "chatban@test.dev", "password": "password123", "display_name": "C",
    })
    headers = {"Authorization": f"Bearer {r.json()['access_token']}"}
    db = TestingSession()
    try:
        user_by_email(db, "chatban@test.dev").chat_banned = True
        db.commit()
    finally:
        db.close()
    assert client.get("/auth/me", headers=headers).status_code == 200
    posted = client.post("/community/forums/path-consulting/posts",
                         json={"flair": "WIN", "title": "hi", "body": "there"},
                         headers=headers)
    assert posted.status_code == 403


def test_logout_revokes_tokens_already_issued(client):
    """A stateless JWT could not be revoked before; `auth_version` fixes that
    without waiting seven days for expiry."""
    r = client.post("/auth/register", json={
        "email": "revoke@test.dev", "password": "password123", "display_name": "R",
    })
    headers = {"Authorization": f"Bearer {r.json()['access_token']}"}
    assert client.get("/auth/me", headers=headers).status_code == 200
    assert client.post("/auth/logout", headers=headers).status_code == 200
    assert client.get("/auth/me", headers=headers).status_code == 401


# ---------- votes ----------

def test_votes_are_foreign_keyed_per_target(client, athlete):
    post = client.post("/community/forums/path-consulting/posts",
                       json={"flair": "WIN", "title": "Signed", "body": "Got the role"},
                       headers=athlete)
    assert post.status_code == 200, post.text
    post_id = post.json()["id"]
    UUID(post_id)  # ids are UUIDs on the wire, not sequence numbers

    up = client.post("/community/vote",
                     json={"target_type": "post", "target_id": post_id},
                     headers=athlete)
    assert up.json() == {"upvotes": 1, "voted": True}
    # toggling is per (user, target); a second call removes the vote
    assert client.post("/community/vote",
                       json={"target_type": "post", "target_id": post_id},
                       headers=athlete).json() == {"upvotes": 0, "voted": False}

    # The same id read as a *comment* must not resolve — the old polymorphic
    # table would have happily matched an unrelated row with the same number.
    missing = client.post("/community/vote",
                          json={"target_type": "comment", "target_id": post_id},
                          headers=athlete)
    assert missing.status_code == 404
