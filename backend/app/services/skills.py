"""
Skill Translation Engine + Path Fit — the deterministic core of the career
pillar (REDESIGN_BRIEF §9). Rule-based v1; the LLM-assisted v1.5 layers on
top of these same shapes.
"""
from app.services.registry import WORK_PATHS


def derive_skill_map(intake: dict) -> list[dict]:
    """Build the Transferable Skill Map from intake answers.

    A small, explicit mapping table: intake keys -> sport-native skill ->
    civilian translation + origin. Transparent — the app always shows its
    work.
    """
    role = (intake.get("role") or "").lower()
    favorite = (intake.get("favorite") or "").lower()
    relied_on = (intake.get("relied_on") or "").lower()

    entries = []

    # Role-driven skills
    if "captain" in role or "leader" in role:
        entries.append({"skill": "Captain", "translation": "Leading peers without authority", "origin": "Team leadership role"})
    if "engine" in role:
        entries.append({"skill": "Two-a-days", "translation": "Sustained output under fatigue", "origin": "Set the pace every session"})
    if "strategist" in role:
        entries.append({"skill": "Film study", "translation": "Pattern recognition & rapid preparation", "origin": "Game planning weekly"})
    if "spark" in role:
        entries.append({"skill": "Bench spark", "translation": "High-impact bursts on demand", "origin": "Energy off the bench"})
    if "steady" in role:
        entries.append({"skill": "Consistency", "translation": "Reliable performance under load", "origin": "Being the steady one"})

    # Favorite-part skill
    if "preparation" in favorite:
        entries.append({"skill": "Preparation", "translation": "Process-oriented delivery", "origin": "Loved the prep"})
    elif "competition itself" in favorite:
        entries.append({"skill": "Competitiveness", "translation": "Ownership of outcomes", "origin": "Lived for the game"})
    elif "team" in favorite:
        entries.append({"skill": "Teammate", "translation": "Cross-functional collaboration", "origin": "Loved the team"})
    elif "mastery" in favorite:
        entries.append({"skill": "Mastery pursuit", "translation": "Deliberate practice & iteration", "origin": "Loved the pursuit"})

    # Story-prompt skill (heuristic — reward length as "reflection")
    if len(relied_on.split()) >= 8:
        entries.append({"skill": "Recruiting visits", "translation": "Stakeholder management & pitching", "origin": "Story shared in intake"})

    if not entries:
        entries = [
            {"skill": "Film study", "translation": "Pattern recognition & rapid preparation", "origin": "Default mapping"},
            {"skill": "Two-a-days", "translation": "Sustained output under fatigue", "origin": "Default mapping"},
        ]

    # De-dup by skill
    seen = set()
    out = []
    for e in entries:
        if e["skill"] in seen:
            continue
        seen.add(e["skill"])
        out.append(e)
    return out


def score_path_fit(intake: dict, skill_map: list[dict]) -> list[dict]:
    """Transparent ranking: each path gets a rational score from intake signals,
    returned as PathFit rows ordered strong-first with the contributing signals.
    """
    favorite = (intake.get("favorite") or "").lower()
    role = (intake.get("role") or "").lower()
    skill_labels = {e["skill"] for e in skill_map}

    scores = {}
    rationale_overrides = {}

    # Base signal mapping
    if "competition itself" in favorite:
        scores["entrepreneurship"] = scores.get("entrepreneurship", 0) + 2
    if "preparation" in favorite:
        scores["consulting"] = scores.get("consulting", 0) + 2
    if "team" in favorite:
        scores["nine_to_five"] = scores.get("nine_to_five", 0) + 2
    if "mastery" in favorite:
        scores["consulting"] = scores.get("consulting", 0) + 1
        scores["gig"] = scores.get("gig", 0) + 1
    if "strategist" in role:
        scores["consulting"] = scores.get("consulting", 0) + 2
    if "captain" in role or "leader" in role:
        scores["nine_to_five"] = scores.get("nine_to_five", 0) + 1
        scores["consulting"] = scores.get("consulting", 0) + 1
    years = (intake.get("years") or "").lower()
    if "15+" in years:  # the longest-tenured athletes skew toward structure
        scores["nine_to_five"] = scores.get("nine_to_five", 0) + 1

    # Skill map contributions
    if "Captain" in skill_labels:
        scores["nine_to_five"] = scores.get("nine_to_five", 0) + 1
    if "Film study" in skill_labels:
        scores["consulting"] = scores.get("consulting", 0) + 1

    ranked = sorted(WORK_PATHS, key=lambda p: scores.get(p["id"], 0), reverse=True)

    out = []
    for i, path in enumerate(ranked):
        score = scores.get(path["id"], 0)
        # Use the strong/worth label from registry by default, bump edge cases transparently
        if i == 0 and score >= 2:
            fit = "STRONG FIT"
        elif score >= 1:
            fit = "STRONG FIT"
        else:
            fit = path["fit"]
        out.append({
            "id": path["id"],
            "name": path["name"],
            "fit": fit,
            "rationale": path["rationale"],
            "meta": path["meta"],
            "score": score,
        })
    return out