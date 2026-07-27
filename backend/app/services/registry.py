"""Work-path registry — single source of truth for the backend.

Adding a work structure = adding ONE entry here. It automatically appears
in Path Fit ranking, Path Detail, and the Community forum directory
(seeded at startup). Mirrors the frontend registry by intent.
"""

WORK_PATHS = [
    {
        "id": "consulting",
        "name": "Consulting",
        "fit": "STRONG FIT",
        "rationale": "Pattern recognition + pitching map directly to project work. Intensity comes in seasons — like the ones you know.",
        "meta": "Project-based · Variable income",
        "tagline": "Monetize what you already know, one engagement at a time.",
        "schedule_shape": "Sprints and recoveries. Weeks of deep focus on a client problem, then downtime between engagements. Deadlines replace game days.",
        "income_texture": "Variable, project-based. Feast/famine early; retainers smooth it out later.",
        "loves": ["Project intensity feels like a season", "Expertise is the product — no starting from zero", "Every engagement is a new opponent to scout"],
        "hates": ["No built-in team — you bring your own", "Income anxiety in the gaps", "Selling yourself feels unnatural at first"],
        "first_reps": ["List 3 problems your sport expertise solves for someone", "Do one free advisory call for a local club", "Price a 2-week pilot project"],
        "forum": {"title": "The Consulting Circuit", "description": "Project seasons, client games, monetizing what you know.", "member_count": 0, "active_now": 0},
    },
    {
        "id": "nine_to_five",
        "name": "9–5 / Corporate",
        "fit": "STRONG FIT",
        "rationale": "Team structure, clear ladder, playbook culture — the closest analog to a program.",
        "meta": "Salaried · Structured ladder",
        "tagline": "A roster, a playbook, and a ladder. The closest thing to a program.",
        "schedule_shape": "Predictable. Fixed hours, defined role, weekly rhythm — structure arrives pre-built, like a training schedule used to.",
        "income_texture": "Salaried and steady. Raises and titles are the new stat line.",
        "loves": ["Built-in team and routine", "Clear progression — you always know the depth chart", "Benefits and stability lower the background noise"],
        "hates": ["No visible scoreboard — feedback is a yearly PDF", "Imposter syndrome in interviews", "Progress feels slow after sport's immediacy"],
        "first_reps": ["Rewrite one resume bullet in civilian language", "Coffee chat with one former teammate in industry", "Apply to one role a week for a month"],
        "forum": {"title": "Corporate Athletes", "description": "Life in the 9–5. Scoreboards look different here.", "member_count": 0, "active_now": 0},
    },
    {
        "id": "entrepreneurship",
        "name": "Entrepreneurship",
        "fit": "WORTH EXPLORING",
        "rationale": "Ownership and a scoreboard again. Highest variance — test it with small reps first.",
        "meta": "Ownership · High variance",
        "tagline": "The new jersey says \"owner.\" Total control, total exposure.",
        "schedule_shape": "No off-switch. You set the structure — which is exactly the muscle this app builds. Days blur; milestones replace seasons.",
        "income_texture": "Back-loaded. Nothing for a while, then potentially everything. Runway planning is non-negotiable.",
        "loves": ["Competition replacement — the market is a scoreboard", "Identity continuation: founder is a new jersey", "Total ownership of the outcome"],
        "hates": ["Highest failure risk of any path", "No coach, no playbook, no guaranteed teammates", "Runway math is unforgiving"],
        "first_reps": ["Write the one-page version of the idea", "Sell something small this month — anything", "Talk to 3 founders about their worst month"],
        "forum": {"title": "Founders", "description": "The new jersey says owner. Reality-testing welcome.", "member_count": 0, "active_now": 0},
    },
    {
        "id": "gig",
        "name": "Gig Work",
        "fit": "WORTH EXPLORING",
        "rationale": "Income and autonomy now, while you figure out the longer game.",
        "meta": "Immediate income · Self-structured",
        "tagline": "Money this week. Structure you build yourself.",
        "schedule_shape": "You choose every block. Total autonomy — which is freedom on good weeks and a void on bad ones. Pairs well with a daily check-in habit.",
        "income_texture": "Immediate and per-task. You feel every rep in the bank account, for better and worse.",
        "loves": ["Income starts immediately", "Physical autonomy — your body is yours again", "Easy to combine with exploring other paths"],
        "hates": ["No structure at all — the exact void you're grieving", "No team, no ladder, no one keeping score", "Income swings week to week"],
        "first_reps": ["Sign up for one platform and complete one gig", "Set a weekly income target like a training goal", "Design your own weekly schedule — and guard it"],
        "forum": {"title": "Gig Life", "description": "Income now, structure you build yourself.", "member_count": 0, "active_now": 0},
    },
    {
        "id": "overnight",
        "name": "Overnight / Shift",
        "fit": "WORTH EXPLORING",
        "rationale": "Matches athlete wiring for odd hours. A bridge with immediate openings — not a dead end.",
        "meta": "Shift-based · Immediate openings",
        "tagline": "Wired for odd hours? That's an asset here. A bridge, not a dead end.",
        "schedule_shape": "Inverted days. The world is quiet, shifts are defined, and daylight is free for training, classes, or building the next thing.",
        "income_texture": "Hourly and reliable, often with shift differentials. Predictable paychecks while you plan the next move.",
        "loves": ["Odd-hours tolerance most people don't have", "Days stay free for the next chapter", "Immediate openings, low barrier to entry"],
        "hates": ["Sleep debt is a real opponent", "Social isolation — your hours miss everyone else's", "Must stay a bridge: easy to drift"],
        "first_reps": ["Try one overnight shift before committing", "Build a sleep protocol like a recovery protocol", "Set a 90-day review date — bridge or destination?"],
        "forum": {"title": "Night Shift", "description": "For the ones wired for odd hours. A bridge, not a dead end.", "member_count": 0, "active_now": 0},
    },
]

JOURNEY = {"day": 1, "total_days": 90, "streak": 0}
JOURNEY_PHASES = [
    {"id": "foundation", "name": "Foundation", "start_day": 1, "end_day": 30},
    {"id": "exploration", "name": "Exploration", "start_day": 31, "end_day": 60},
    {"id": "commitment", "name": "Commitment", "start_day": 61, "end_day": 90},
]

# §6.5 — the admin's fifteen categorized habits, not the backend's old generic
# `a1`-`a4`. The two were different models, and the admin's won: the retained
# CWRU Firestore `completions` already use these keys, so the pilot data
# migrates cleanly and it was the backend that was the outlier.
#
# `category` is stored on every `action_completions` row because the admin
# groups by it. It is always the segment before the first hyphen, but derive it
# through `category_for_action` rather than re-splitting the string at each
# call site — an unknown id must be rejected, not silently invent a category.
ACTION_CATEGORIES = ["career", "routine", "mindset", "social", "wellness"]

WEEKLY_ACTIONS = [
    {"id": "career-explore", "category": "career", "kind": "WORLD REP", "text": "Career Exploration"},
    {"id": "career-network", "category": "career", "kind": "WORLD REP", "text": "Networking"},
    {"id": "career-resume", "category": "career", "kind": "SKILL REP", "text": "Resume & LinkedIn"},
    {"id": "routine-morning", "category": "routine", "kind": "HABIT", "text": "Morning Routine"},
    {"id": "routine-exercise", "category": "routine", "kind": "HABIT", "text": "Exercise"},
    {"id": "routine-sleep", "category": "routine", "kind": "HABIT", "text": "Sleep Hygiene"},
    {"id": "mindset-journal", "category": "mindset", "kind": "REFLECTION", "text": "Journaling"},
    {"id": "mindset-gratitude", "category": "mindset", "kind": "REFLECTION", "text": "Gratitude"},
    {"id": "mindset-meditation", "category": "mindset", "kind": "REFLECTION", "text": "Meditation"},
    {"id": "social-connect", "category": "social", "kind": "WORLD REP", "text": "Social Connection"},
    {"id": "social-mentor", "category": "social", "kind": "WORLD REP", "text": "Mentorship"},
    {"id": "social-community", "category": "social", "kind": "WORLD REP", "text": "Community"},
    {"id": "wellness-therapy", "category": "wellness", "kind": "HABIT", "text": "Therapy"},
    {"id": "wellness-nutrition", "category": "wellness", "kind": "HABIT", "text": "Nutrition"},
    {"id": "wellness-hobby", "category": "wellness", "kind": "HABIT", "text": "New Hobby"},
]

_ACTIONS_BY_ID = {a["id"]: a for a in WEEKLY_ACTIONS}


def category_for_action(action_id):
    """The action's category, or None if the id is not in the taxonomy."""
    action = _ACTIONS_BY_ID.get(action_id)
    return action["category"] if action else None


def get_path(path_id):
    return next((p for p in WORK_PATHS if p["id"] == path_id), None)


def get_phase_for_day(day):
    for p in JOURNEY_PHASES:
        if p["start_day"] <= day <= p["end_day"]:
            return p
    return JOURNEY_PHASES[0]
