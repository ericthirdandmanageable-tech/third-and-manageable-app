def test_health(client):
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json() == {"status": "ok"}


def test_forums_seeded(client):
    r = client.get("/community/forums")
    assert r.status_code == 200
    forums = r.json()
    # 5 Path forums (one per work structure) + 4 standalone
    assert len(forums) == 9
    path_forums = [f for f in forums if f.get("path_id")]
    assert len(path_forums) == 5


def test_register_and_me(client, auth_headers):
    r = client.get("/auth/me", headers=auth_headers)
    assert r.status_code == 200
    assert r.json()["email"] == "api@test.dev"


def test_register_persists_status(client):
    """Onboarding step 1 — the status answer must survive registration."""
    r = client.post("/auth/register", json={
        "email": "status@test.dev", "password": "password123",
        "display_name": "Status", "status": "competing",
    })
    assert r.status_code == 200, r.text
    assert r.json()["user"]["status"] == "competing"
    me = client.get("/auth/me", headers={"Authorization": f"Bearer {r.json()['access_token']}"})
    assert me.json()["status"] == "competing"
    # omitted status falls back to "transitioning"
    r2 = client.post("/auth/register", json={
        "email": "default@test.dev", "password": "password123", "display_name": "Default",
    })
    assert r2.status_code == 200, r2.text
    assert r2.json()["user"]["status"] == "transitioning"


def test_intake_stores_community_choice(client, auth_headers):
    """Onboarding step 4 — join/solo rides along with the intake answers."""
    r = client.post("/profile/intake", json={
        "sport": "Soccer", "role": "Captain", "years": "4",
        "relied_on": "Film study, set plays", "favorite": "Recruiting visits",
        "community": "solo",
    }, headers=auth_headers)
    assert r.status_code == 200, r.text
    assert r.json()["intake_answers"]["community"] == "solo"


def test_intake_drives_skill_map_and_path_fit(client, auth_headers):
    r = client.post("/profile/intake", json={
        "sport": "Soccer", "role": "Captain", "years": "4",
        "relied_on": "Film study, set plays", "favorite": "Recruiting visits",
    }, headers=auth_headers)
    assert r.status_code == 200, r.text

    gp = client.get("/game-plan", headers=auth_headers).json()
    assert gp["intake_done"] is True
    assert len(gp["skill_map"]) >= 1
    assert len(gp["path_fit"]) == 5
    # path fit is ranked — first entry should carry a fit label + rationale
    top = gp["path_fit"][0]
    assert top["fit"] in ("STRONG FIT", "WORTH EXPLORING")
    assert top["rationale"]


def test_commit_and_toggle_action(client, auth_headers):
    r = client.post("/game-plan/commit", json={"path_id": "consulting"}, headers=auth_headers)
    assert r.status_code == 200
    gp = client.get("/game-plan", headers=auth_headers).json()
    assert gp["committed_path_id"] == "consulting"

    # toggle an action on, then off
    aid = gp["weekly_actions"][0]["id"]
    client.post("/game-plan/actions/toggle", json={"action_id": aid}, headers=auth_headers)
    gp2 = client.get("/game-plan", headers=auth_headers).json()
    assert aid in gp2["completed_action_ids"]
    client.post("/game-plan/actions/toggle", json={"action_id": aid}, headers=auth_headers)
    gp3 = client.get("/game-plan", headers=auth_headers).json()
    assert aid not in gp3["completed_action_ids"]


def test_clipboard_short_message_yields_options(client, auth_headers):
    r = client.post("/clipboard/chat", json={"message": "hey", "persona": "analyst"}, headers=auth_headers)
    assert r.status_code == 200
    body = r.json()
    # the invisible adaptation engine: a terse message should drive option chips
    assert body.get("options")


def test_clipboard_clear(client, auth_headers):
    client.post("/clipboard/chat", json={"message": "hi", "persona": "analyst"}, headers=auth_headers)
    assert len(client.get("/clipboard/history", headers=auth_headers).json()["messages"]) >= 1
    d = client.delete("/clipboard/history", headers=auth_headers)
    assert d.status_code == 200
    assert client.get("/clipboard/history", headers=auth_headers).json()["messages"] == []


def test_community_requires_auth_to_post(client):
    r = client.post("/community/forums/consulting/posts", json={
        "flair": "WIN", "title": "t", "body": "b",
    })
    assert r.status_code in (401, 403)


def test_checkin(client, auth_headers):
    r = client.post("/check-ins", json={
        "date": "2026-07-19", "prompt_id": "p1", "prompt_question": "q",
        "option": "Good", "journal": "felt strong",
    }, headers=auth_headers)
    assert r.status_code == 200, r.text
    assert len(client.get("/check-ins", headers=auth_headers).json()) >= 1


def test_unverified_user_cannot_post(client):
    """The verified-athlete gate: an unverified account must be blocked from
    writing to Community (REDESIGN_BRIEF safety constraint)."""
    from app.database import User
    from tests.conftest import TestingSession

    r = client.post("/auth/register", json={
        "email": "unverified@test.dev", "password": "password123", "display_name": "UV",
    })
    tok = r.json()["access_token"]
    # force-verify off for this user directly in the DB
    db = TestingSession()
    u = db.query(User).filter(User.email == "unverified@test.dev").first()
    u.verified = False
    db.commit()
    db.close()

    resp = client.post("/community/forums/consulting/posts", json={
        "flair": "WIN", "title": "t", "body": "b",
    }, headers={"Authorization": f"Bearer {tok}"})
    assert resp.status_code == 403


# ---------- Session 4: journey derivation, profile edits, loose ends ----------


def test_journey_derived_from_check_ins(client):
    """Day/streak must come from real check-in rows, not a hardcoded constant."""
    from datetime import date, timedelta
    from app.database import User, CheckIn
    from tests.conftest import TestingSession

    r = client.post("/auth/register", json={
        "email": "journey@test.dev", "password": "password123", "display_name": "J",
    })
    tok = {"Authorization": f"Bearer {r.json()['access_token']}"}

    # Pre-Day-1: no check-ins → day 1, streak 0
    gp = client.get("/game-plan", headers=tok).json()
    assert gp["day"] == 1 and gp["streak"] == 0 and gp["check_in_count"] == 0

    # Seed 3 consecutive days ending today, directly in the DB
    db = TestingSession()
    uid = db.query(User).filter(User.email == "journey@test.dev").first().id
    for i in (2, 1, 0):
        db.add(CheckIn(
            user_id=uid, date=(date.today() - timedelta(days=i)).isoformat(),
            prompt_id="p1", prompt_question="q", option="ok",
        ))
    db.commit()
    db.close()

    gp = client.get("/game-plan", headers=tok).json()
    assert gp["day"] == 3, gp
    assert gp["streak"] == 3
    assert gp["check_in_count"] == 3
    assert gp["phase"]["id"] == "foundation"

    # A gap breaks the streak but not the count
    db = TestingSession()
    db.add(CheckIn(
        user_id=uid, date=(date.today() - timedelta(days=10)).isoformat(),
        prompt_id="p1", prompt_question="q", option="ok",
    ))
    db.commit()
    db.close()
    gp = client.get("/game-plan", headers=tok).json()
    assert gp["streak"] == 3 and gp["check_in_count"] == 4 and gp["day"] == 11


def test_uncommit_clears_path(client, auth_headers):
    client.post("/game-plan/commit", json={"path_id": "gig"}, headers=auth_headers)
    assert client.get("/game-plan", headers=auth_headers).json()["committed_path_id"] == "gig"
    r = client.post("/game-plan/commit", json={"path_id": None}, headers=auth_headers)
    assert r.status_code == 200, r.text
    assert r.json()["committed_path_id"] is None
    assert client.get("/game-plan", headers=auth_headers).json()["committed_path_id"] is None


def test_profile_patch_updates_user_fields(client, auth_headers):
    r = client.patch("/profile", json={
        "display_name": "New Name", "status": "transitioned",
        "headline": "Former midfielder → future product manager",
    }, headers=auth_headers)
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["display_name"] == "New Name"
    assert body["status"] == "transitioned"
    assert body["headline"].startswith("Former midfielder")
    me = client.get("/auth/me", headers=auth_headers).json()
    assert me["headline"] == body["headline"] and me["status"] == "transitioned"
    # clearing the headline works (empty string -> null)
    r2 = client.patch("/profile", json={"headline": ""}, headers=auth_headers)
    assert r2.json()["headline"] is None


def test_checkin_today_patch_and_double_submit_guard(client):
    r = client.post("/auth/register", json={
        "email": "editor@test.dev", "password": "password123", "display_name": "E",
    })
    tok = {"Authorization": f"Bearer {r.json()['access_token']}"}

    # First check-in of the day succeeds
    r1 = client.post("/check-ins", json={
        "prompt_id": "p1", "prompt_question": "q", "option": "Flat", "journal": "meh",
    }, headers=tok)
    assert r1.status_code == 200, r1.text
    # Second is a conflict, not a silent success
    r2 = client.post("/check-ins", json={
        "prompt_id": "p1", "prompt_question": "q", "option": "Better",
    }, headers=tok)
    assert r2.status_code == 409
    # But editing today's check-in is allowed
    r3 = client.patch("/check-ins/today", json={"option": "Better", "journal": "turned around"}, headers=tok)
    assert r3.status_code == 200, r3.text
    today = client.get("/check-ins/today", headers=tok).json()
    assert today["option"] == "Better" and today["journal"] == "turned around"


def test_tech_support_request_persisted(client, auth_headers):
    r = client.post("/support/tech", json={"message": "Export button does nothing on mobile"}, headers=auth_headers)
    assert r.status_code == 200, r.text
    assert r.json()["status"] == "open"
    # anonymous requests can't be filed (we'd have no way to follow up)
    anon = client.post("/support/tech", json={"message": "help"})
    assert anon.status_code in (401, 403)
