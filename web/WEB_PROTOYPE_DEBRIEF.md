# Session Debrief for Web Protype Build-out — Third & Manageable Redesign + Build

**Last updated:** Sun Jul 19 2026 (post-Session-4) · **Mode:** Build (read/write) · **For:** session handoff / continuity post-compact

Read this first if you're picking up the work. §0 is the running change log; the rest is the current state.

---

## 0. Change History (concise)

- **Session 1 (Jul 19):** Built the three artifacts from scratch — `REDESIGN_BRIEF.md`, the `web-prototype/` frontend (4 tabs + Support + Progress, all registry-driven), and the `backend/` FastAPI app (auth, game plan, clipboard w/ invisible adaptation, Reddit-model community, artifacts, support). Wired frontend↔backend with offline fallback. Verified end-to-end.
- **Session 2 (Jul 19):** Addressed the §9 next-steps. Shipped: Alembic migrations (baseline `9b002fad09d3`); zeroed lint warnings (split `useAuth`, removed dead dep); registry-drift contract test + dev warning; `DELETE /clipboard/history` + "start fresh" button; phase-grouped scrollable 90-day arc on Progress; fixed mobile sign-in overlap; pytest scaffold (13 passing); env-gated `auto_verify`; real artifact PNG export via `html-to-image`. Deferred deliberately: LLM prompt-ops audit, Option B (swipe-to-fit), Option C (mentor matching). Also reorganized the repo root: the shipped iOS bundle + extraction dumps now live in `/original-app/` (was scattered at root).
- **Session 3 (Jul 19):** Onboarding. New `/onboarding` flow (outside `MainLayout`, like the original app's `(auth)` group) mirroring the shipped app's 4 steps with copy recovered verbatim from `original-app/bundle_strings.txt`: welcome manifesto ("No scoreboard. No comparison. Just your journey.") → status → skill intake (existing `IntakeFlow`, gained `onBackAtStart`) → account → community choice → complete ("You're in the game."). Gating: register → onboarding; login with `intake_done=false` → onboarding; completed users hitting `/onboarding` bounce home; anonymous CheckIn visitors get a "New here?" entry card. Backend: `users.status` finally persisted (was accepted-then-dropped since Session 1; migration `4c7e1a9f2b08`), `community` join/solo rides in `intake_answers`, fresh-DB startup now stamps head. Tests 13 → 15.
- **Session 4 (Jul 19):** Loose-ends audit + end-to-end completion, prioritized profile → check-ins → life progress. **New screens:** `/profile` (career-defining page: identity edit, the "headline" — *Former Soccer athlete → future product manager* — direction, journey stats, sign-out; mobile's 5th tab, which also makes Support + sign-out reachable on phones) and `/404`-style `NotFound` catch-all. **Real data:** day/streak now derived from check-in rows (`services/journey.py`) — was hardcoded 14/14 on both sides; CheckIn preloads today's check-in, edits it (new `PATCH /check-ins/today`), and ends in an "Up next" nudge that routes to the next most-valuable action (intake → path fit → today's rep → community); Progress shows the identity arc (sport → committed path), milestone dots, real stats (streak, check-ins, reps, coach chats), the 90-day arc filled by actual check-in dates, recent-moods list, and artifacts fed real skill-map data. **Profile backend:** `PATCH /profile` + `users.headline` (migration `7d2e5f8a1c34`, also `tech_support_requests`). **Fixes:** un-commit was a silent no-op (commit endpoint now accepts null); check-in double-submit no longer shows fake success; Support page buttons hit real endpoints (`POST /support/peer` wired, `POST /support/tech` new, tech card gained a message field); artifact "Share to forum" prefills a real composer draft instead of faking it; community search filters; post upvote button added (was an unreachable backend feature + a mislabeled icon); intake is retakable (Game Plan "Retake" + `/game-plan?retake=1`); onboarding persists status for already-authed users; Clipboard seed message grounds in the actual check-in instead of always claiming "Rest Day"; anonymous useGamePlan no longer pre-marks a fake rep; `return null` pages render real not-found states; skills.py tenure heuristic fixed ("15+" only). Tests 15 → 20; full Playwright e2e (17 screenshots) green.

---

## 1. The Three Artifacts in the Repo

| Path | What it is |
|---|---|
| `/REDESIGN_BRIEF.md` | Source-of-truth: product briefing + design spec + redesign guidance. |
| `/web-prototype/` | The redesigned app — React 19 + Vite 8 + Tailwind v4. Wired to the API. |
| `/backend/` | FastAPI app (SQLAlchemy 2, JWT, bcrypt, Gemini optional). Deploys to Render via `/render.yaml`. |
| `/Aura/` | Compiled Aura iOS bundle — aesthetic/sharing reference. Read-only. |
| `/original-app/` | The shipped Third & Manageable iOS bundle (binary, `main.jsbundle`, plists, icons, assets) + extraction dumps (`bundle_strings.txt`, `features.txt`). Read-only reference. |

---

## 2. What the App Is Now

Repositioned from "transition wellness companion" → **"the athlete's guide to a working life that fits."**
Two pillars:
1. **Wellness / identity** (preserved): daily check-in w/ progressive-disclosure journaling, The Clipboard AI coach (4 personas), verified community.
2. **Career transition** (new): 5 work structures (9–5, consulting, gig, overnight, entrepreneurship), Skill Translation Engine, Path Fit (transparent ranking), weekly "reps," journaled commitment, shareable artifacts.

Design language: fresh, Aura-led — near-black surfaces, **volt** `#C8F04B` signal accent, **sand** `#E8DCC8` editorial serif, mono numerals. Inter + Instrument Serif + JetBrains Mono. "Yard Line" 1px gradient rule is the brand mark. Dark-first. Film grain on hero/artifact surfaces.

---

## 3. Frontend (`web-prototype/`) — Structure

### Tech
- React **19.2.7**, Vite **8.1.1**, TS ~6.0.2. Tailwind **v4.3.3** via `@tailwindcss/vite`, **CSS-first** config in `src/index.css` `@theme` (no `tailwind.config.js`).
- `react-router-dom` 7.18, `lucide-react` 1.25, `clsx`, `html-to-image`. `oxlint` (lint, 0 warnings), `npm run build` = `tsc -b && vite build`.
- Fonts via Google Fonts `<link>` in `index.html`. `VITE_API_URL` (`.env`) → `http://localhost:8001`.

### Routes (`src/App.tsx`)
```
/onboarding                   First-run flow (no shell): welcome → status → intake → account → community → complete
/                             Check-in (preloads + edits today's; "Up next" nudge; anonymous get a "New here?" card)
/game-plan                    Game Plan (career home; intake retakable via "Retake" or ?retake=1)
/game-plan/paths/:pathId      Path Detail (commit/un-commit, loves/hates, first reps, forum)
/clipboard                    The Clipboard (AI chat; seed message grounds in today's real check-in)
/community                    Forum directory (working search)
/community/:threadId          Forum view (posts, sort, compose — accepts artifact share-drafts via nav state)
/community/:threadId/:postId  Post detail (nested comments, post + comment votes)
/progress                     Life progress: identity arc, milestones, real stats, 90-day arc by date, mood list, artifacts
/support                      Crisis (911/988), peer support (real), technical support (real, with message)
/profile                      Career-defining profile: identity edit, headline, direction, journey, sign-out
/*                            NotFound catch-all
```
Shell: `MainLayout.tsx` — desktop sidebar (account block opens `/profile`) + mobile bottom tab bar (5 tabs: core 4 + Profile — which is how phones reach Support, Progress, and sign-out); signed-out mobile users get a slim "browsing offline / Sign in" banner (real layout space, no overlap). `AuthModal.tsx` handles sign-in/register and routes post-auth: register → `/onboarding`; login → `/onboarding` only when `intake_done` is false. `Onboarding.tsx` skips the account step for signed-in users (step list frozen once auth loading resolves, so numbering doesn't shift mid-flow) and submits intake + community choice + status at Finish.

### Data registries (`src/data/`) — key architectural choice
All placeholder content lives in registries; **pages have zero inline content**. One line in one file adds a thing everywhere:

| File | One-line addition produces |
|---|---|
| `paths.ts` | New work structure → Path Fit card + Path Detail **and** its Path forum |
| `personas.ts` | New Clipboard persona → picker entry + tone directive |
| `checkin.ts` | New prompt → joins day-of-year rotation |
| `skills.ts` | Skill translations + intake guided prompts |
| `journey.ts` | Phases, journey state, weekly action templates |
| `community.ts` | Standalone forums (Path forums derive from `paths.ts`, never drift) |

### State / data
- `useAuth` (`src/lib/useAuth.ts`): hook over `AuthContext` (context object in `lib/auth-context.ts`, provider in `lib/AuthContext.tsx`). JWT in `localStorage`; validates on mount via `GET /auth/me`; `refreshUser()` after profile edits.
- `useGamePlan` (`src/hooks/useGamePlan.ts`): backend-backed when authed, `localStorage` registry fallback offline. UI never branches on source. Includes a dev-only registry-drift `console.warn`.
- `useCheckIns` (`src/hooks/useCheckIns.ts`): check-in history from the API when authed, `localStorage` when anonymous. Derives streak + day number via `lib/journeyMath.ts` (mirrors `services/journey.py`); `submit` returns 'saved'|'already' so double-submits never fake-succeed; `editToday` patches today's record.
- Other pages hydrate from the API with the local registry as initial state.

### Artifacts (`src/components/artifacts.tsx`)
Four template cards (`SkillMapCard`, `DayCounterCard`, `PathCommitmentCard`, `WeeklyRecapCard`). Export = real PNG raster via `html-to-image` `toPng(cardRef, {pixelRatio:2})` → `<name>.png` download. Share-to-forum navigates to the path's forum. Private by default.

### Interaction patterns carried forward
1. Progressive-disclosure journaling · 2. Passive-data-aware framing · 3. Reddit-model community · 4. **Invisible** self-writing system prompt (never user-facing) · 5. Responsive shell.

---

## 4. Backend (`backend/`) — Structure

### Tech
- Python **3.12** (local venv via **uv** at `.venv/`; Py 3.14 lacks wheels for pydantic-core/psycopg — don't try).
- FastAPI 0.115, Uvicorn 0.34, SQLAlchemy 2.0.36, Pydantic 2.10, `python-jose`, **`bcrypt` 4.3** (NOT passlib), **`psycopg[binary]` v3** (not psycopg2), `google-generativeai` (optional), `alembic 1.14`, `httpx`, `pytest`.
- SQLite locally (`third_manageable.db`); Postgres on Render. `config.py` normalizes `postgres://` → `postgresql+psycopg://`.

### Layout
```
backend/
  alembic/           env.py (wired to app config+metadata) + versions/9b002fad09d3_baseline_schema.py
  alembic.ini        pytest.ini   conftest.py (sys.path)   tests/ (test_registry, test_api, conftest)
  app/
    main.py          FastAPI app; startup: Alembic-aware schema + seed_forums
    config.py        Settings (db_url, jwt, gemini, cors, auto_verify)
    auth.py          bcrypt, JWT, get_current_user, require_verified, optional_user
    database.py      SQLAlchemy models
    schemas.py       Pydantic v2 I/O
    routes/          auth, profile, checkins, gameplan, clipboard, community, misc
    services/
      registry.py    WORK_PATHS (mirrors frontend) + JOURNEY + WEEKLY_ACTIONS
      skills.py      derive_skill_map(intake) + score_path_fit (transparent)
      gemini.py      Gemini + INVISIBLE adaptation engine; safe seeded fallback
  requirements.txt   render.yaml (repo root)   .env.example
```

### Tables
`users, athlete_profiles, check_ins, commitments, action_completions, clipboard_messages, forums, posts, comments, votes, peer_support_requests, tech_support_requests`.

### Key behaviors
- **Auth:** JWT 7-day. `verified` at register = `settings.auto_verify` (True in dev, set `AUTO_VERIFY=false` in prod → real review flips it). `require_verified` guards Community writes. Register persists `status` ("competing"/"transitioning"/"transitioned", from onboarding step 1) on `users.status` — returned by `/auth/me`.
- **Schema:** Alembic owns it. Revisions: `9b002fad09d3` baseline → `4c7e1a9f2b08` (`users.status`) → `7d2e5f8a1c34` (`users.headline`, `tech_support_requests`). On a brand-new empty dev DB, startup `create_all` + stamps **head** (`7d2e5f8a1c34`); existing DBs upgrade via Alembic (a pre-Alembic dev DB: `alembic stamp 9b002fad09d3` once, then `upgrade head`).
- **Journey:** day/streak are **derived** from check-in rows (`services/journey.py`: day = days since first check-in clamped to 90; streak = consecutive days ending today/yesterday) and served by `GET /game-plan` — nothing is hardcoded anymore. `PATCH /check-ins/today` edits today's record; `POST /game-plan/commit` with `path_id: null` un-commits.
- **Profile:** `PATCH /profile` writes `display_name`, `school`, `status`, `headline` (the career-defining one-liner, 140 chars); `GET /profile` returns intake answers + skill map.
- **Game Plan:** `intake_done`, `skill_map` (JSON), `commitment.path_id`, `action_completions`. Path Fit scored transparently from intake signals + skill-map.
- **Clipboard:** persists user+AI messages; `services.gemini.chat(history, persona)` computes the **invisible** adaptation (avg msg length → "terse ⇒ multiple-choice", "long ⇒ Analyst"), builds `SAFETY_TEMPLATE` + persona + adaptation, calls Gemini or safe fallback. `DELETE /clipboard/history` clears the caller's conversation. Adapted prompt is **never** shown in UI.
- **Community:** forums seeded from `WORK_PATHS` (5 Path) + standalone (Davis soccer, NYC swimmers, ACL, Transition Stories). Posts have flair (WIN/VENT/QUESTION/RESOURCE/MILESTONE), one-toggle votes (posts + comments), nested comments (`parent_id`), server-built tree. Icons as strings → client `ICONS` map.
- **Support:** `POST /support/peer` (existing) and `POST /support/tech` (new, with message) both persist real rows; the UI never shows success without a persisted request. Both require auth.
- **Safety (non-negotiable):** crisis surfaces (911/988) first on Support; clipboard safety instructions dominate persona/adaptation; verified-athlete gate on writes.

---

## 5. Verified Working

**Backend:** 20/20 pytest passing (3 registry-contract + 17 API: health, forums seeded [9], register/me, register-persists-status, intake→skill-map+path-fit, intake-stores-community, commit+toggle, clipboard options, clipboard clear, auth-required-to-post, check-in, unverified-cannot-post, journey-derived-from-check-ins [day/streak/count/gap], un-commit, profile-patch [incl. headline clear], check-in-today-patch + 409 guard, tech-support persist + anon-403). Dev DB upgraded through `7d2e5f8a1c34`.

**Frontend:** `npm run lint` 0 warnings · `npm run build` green (`tsc -b && vite build`, ~109 KB gzip JS). `vite dev` serves :5173, hits backend :8001. Full Playwright e2e (11 scenarios, 17+ screenshots, desktop + mobile): day-1 check-in → success with real streak → reload shows done-state + nudge → edit persists; intake → skill map + retake; commit → un-commit → recommit (regression-covered); profile edit incl. headline (sidebar picks it up via `refreshUser`); progress identity arc + recent moods + real arc fill; artifact share prefills forum composer (title + body); both support requests persist; clipboard seed grounded in the actual check-in; `/banana` → NotFound; community search filters; mobile profile tab renders + sign-out present. (Artifact PNG export verified at build/bundle level; a true raster needs a real browser — confirm visually once.)

---

## 6. How to Run

```bash
# Backend
cd backend
cp .env.example .env
uv venv .venv --python 3.12 && uv pip install -r requirements.txt
.venv/bin/uvicorn app.main:app --port 8001     # auto-creates SQLite + seeds
.venv/bin/pytest -q                            # 20 tests

# Migrations (against any DB)
DATABASE_URL="sqlite:///./third_manageable.db" .venv/bin/alembic upgrade head

# Frontend (separate shell)
cd web-prototype
npm install
npm run dev      # http://localhost:5173
```
Test account (Session-1 SQLite): `test@tm.dev` / `password123` (consulting committed, intake done, one check-in, one WIN post). Dev accounts auto-verified.

**Deploy:** `render.yaml` builds `backend/`, provisions `tm-db` Postgres, injects `DATABASE_URL`. Set `JWT_SECRET`, `AUTO_VERIFY=false`, optionally `GEMINI_API_KEY` in the Render dashboard. Frontend deploys separately (set `VITE_API_URL` to the backend URL at build time).

---

## 7. Known Issues / Small TODOs

- Clipboard chat offline: the "long reflective" branch only fires on turn 2; later turns fall through to the canned mock (fine for prototype — the real engine is server-side).
- Pre-existing deprecation warnings in test output (`datetime.utcnow()` in `auth.py`, jose, SQLAlchemy) — cosmetic.
- Artifact PNG export not yet visually confirmed in a real browser.

---

## 8. What's Left — Build Roadmap Status

From `REDESIGN_BRIEF.md §15`:

- ✅ **Phase 1** — design system + shell + reskin + Game Plan scaffold.
- ✅ **Phase 2** — Skill intake (Option A), Skill Map, Path Fit (transparent), Path Detail, commitment, "why ranking," weekly action engine.
- ⚠️ **Phase 2.5** — §16.1 Option B (swipe-to-fit), not built (deferred, see §9).
- ✅ **Phase 3** — 4 artifacts + Progress + share-into-forum + **real PNG export**.
- ⚠️ **Phase 4** — community depth done (posts/flair/votes/nested comments/sort); **missing:** mod tools, mobile new-post composer polish, "peer support right now" as a priority-post to a Support forum (currently just a row + message).
- ⬜ **Later** — health integrations (Apple Health / Terra), mentor matching (Option C), monetization, native app parity.

### Open questions (§16.2 — still open)
1. **Verification model** — dev auto-verifies. Production: roster DB? `.edu` allow-list? Manual review? (Gate + tests in place; policy undecided.)
2. **Health data** — Apple Health only, or Terra-style multi-device?
3. **Monetization** — subscription vs. free + partnerships. **Constraint: crisis support, core community, check-ins never paywalled.**
4. **Platform** — web-only, RN/Expo rewrite, or shared component language?
5. **LLM ops** — who owns adaptation-prompt governance; how are directive changes audited?

---

## 9. Recommendations (status)

**Done (Session 2):** 1 registry contract · 2 Alembic · 3 split useAuth · 4 artifact PNG export · 5 env-gated verification · 6 clipboard reset · 10 design polish (arc + sign-in).

**Still open:**
- **7. LLM-assisted path fit (v1.5):** layer over `derive_skill_map`/`score_path_fit`, don't replace — keep the transparent deterministic baseline + add an LLM second opinion with a confidence flag. The "why ranking" panel is the trust moat; never silently replace it.
- **8. Prompt-ops audit:** log which adaptation directive fired per turn, behind an admin flag. Never expose to the user.
- **9. Hold off on Option B/C:** Option A works; ship the intake, watch whether athletes want more exploration before adding surfaces.

---

## 10. Critical Files to Read First (post-compact)

1. `/REDESIGN_BRIEF.md` — the spec.
2. `/web-prototype/src/data/paths.ts` — canonical work-structure content (mirrors `backend/app/services/registry.py`).
3. `/web-prototype/src/hooks/useGamePlan.ts` — backend-first/local-fallback state pattern.
4. `/web-prototype/src/lib/api.ts` — every endpoint the frontend knows.
5. `/backend/app/services/gemini.py` — the invisible adaptation engine (most sensitive piece).
6. `/backend/app/routes/community.py` — `seed_forums` derives Path forums from the registry.
7. `/backend/tests/` — `test_registry.py` (drift contract) + `test_api.py` (behavior).

Ports: backend `:8001`, frontend `:5173`. Confirm with `lsof -i :8001` / `:5173`; restart per §6.
