# Third & Manageable — Vercel Consolidation Plan

**Goal:** collapse the current multi-vendor footprint (Render + Firebase + Appwrite + Google AI + un-hosted Vite SPA) onto Vercel, keeping Render **only** if the FastAPI service genuinely cannot move. Sequenced to serve the three-step objective:

1. Situate `web-prototype` into the foundation of the pre-redesign app (`third-and-manageable-admin-main`).
2. Migrate backend + frontend dependencies onto Vercel.
3. Keep building on that combined foundation.

Companion documents: `FEATURE_ANALYSIS.md` (feature/architecture inventory), `WEB_PROTOYPE_DEBRIEF.md` (prototype state), `REDESIGN_BRIEF.md` (product direction).

---

## 0. Current Status — read this first

**All five scoping questions are resolved.** Decisions, in one place:

| Decision | Answer |
|---|---|
| Backend | Bridge FastAPI onto Vercel Python first, then port to TypeScript route-by-route behind it (§2.2, §7.1) |
| Repo shape | **One** Next.js app, **one** Vercel project, no monorepo (§2.0) |
| Vercel plan | Pro, already held (§5) |
| Firestore data | **Retain** the CWRU pilot data; scripted export in Phase 3 (§7.2) |
| Weekly actions | **Fifteen categorized habits** — admin's taxonomy wins, backend's `a1`–`a4` is replaced (§6.5) |

### Phase 0 progress

- [x] **Step 1 — `git init`.** Repo created on `main`; initial commit `479ceeb`, 143 files. Root `.gitignore` excludes `node_modules/`, `.venv/`, `dist/`, `*.db`, `.env`.
- [x] **§6.2 credential sanitization** — done *before* the first commit, so nothing sensitive is in history. **Rotation at the source is still outstanding and is on you** (see §6.2).
- [x] **Step 2 — promote the admin app to the repo root.** Commit `27f496c`; pure `git mv`, no source changes. Three scoping fixes the move forced: `tsconfig`/`eslint` now exclude `web-prototype/` and `backend/` (the root `**/*.ts` include would otherwise typecheck the Vite SPA's 32 files); `next.config.ts` pins `turbopack.root` (a lockfile in a parent directory was winning workspace-root inference); the admin `.gitignore` folded into the root one.
  - Follow-on commit `0230ae1` — **`firebase-admin` now initialises lazily** (`adminDb` → `getAdminDb()`, 12 files). It ran `cert()`/`initializeApp()` at module scope, and since Next imports every route module during page-data collection, a build failed outright without the service-account vars. Builds no longer need runtime secrets — which is what lets step 5 proceed while the §6.2 rotation is still pending. Whole module dies at Phase 3 step 20.
  - `next build` passes: 19 routes, every Firestore-backed page/route correctly `ƒ` (dynamic); only `/login` and `/_not-found` prerender.
- [~] **Step 3 — provision Neon Postgres.** Vercel project **created and linked**: `ling-iq/third-and-manageable` (`prj_QaCgXSSn1sXJSob2T0qhYSLiJ1ek`). CLI scope switched off the personal Hobby account onto the **LingIQ** team. `vercel integration add neon` returns `action_required` — **blocked on you**, see below.
  - ⚠️ `vercel link` auto-detected `backend/` and wrote a `vercel.json` rewriting **`/(.*)` → the FastAPI service**, which would have shadowed the entire admin app. **Deleted.** Worth knowing for Phase 2 step 11: Vercel detects and bridges the FastAPI service natively, so §2.2 is less work than assumed — but that config must not land until step 11.
- [x] **Step 4 — SQLAlchemy → Drizzle.** Commit `80a7e11`. 12 tables in `src/lib/db/schema.ts`; the models were already the post-Alembic state, so the three revisions replay as one baseline (`drizzle/0000_*.sql`), not three migrations. All 8 `index=True` columns carried over. §3 columns added: `users.{suspended,banned,chat_banned,verification_requested,streak}`, `check_ins.mood`, `forums.{daily_prompt,daily_prompt_author,daily_prompt_updated_at}`, `action_completions.category`. `getDb()` is lazy, same build-time reason as `getAdminDb()`. **Not yet applied to a database** — that needs step 3's Neon.
  - Timestamps are `timestamp` *without* time zone, matching SQLAlchemy's naive `DateTime`. The Phase 2 bridge shares this database, so the types must agree. Revisit at step 16.
- [~] **Step 5 — first deploy.** Pipeline **proven** (build + deploy + routes served), then **the deployment was removed**. See below.

#### ⚠️ Step 5 outcome — production went public, and was taken down

`vercel deploy` without `--prod` still shipped to **production**: Vercel auto-promotes a project's *first* deployment. It was reachable with no Deployment Protection, and **§6.1 was confirmed exploitable in the wild** — `curl -H 'Cookie: admin_session=authenticated' .../users` was served the dashboard instead of being redirected to `/login`. It returned 500 only because the Firebase vars are unset; with them set, that response is every user's email and journal entries.

Deployment `dpl_5ow9wGMVv7hzvAAUURiVednVXdU3` removed; both URLs now 404. **No data was exposed** — Firestore was unreachable for the whole window, and `ADMIN_PASSWORD` was unset.

Related, found while checking: `/api/login` compares `password === process.env.ADMIN_PASSWORD`. With the env var unset, a POST that **omits** `password` compares `undefined === undefined` and **succeeds**. Fix alongside §6.1.

**Step 5 does not complete until §6.1 is fixed.** Before any redeploy, in order:
1. Rewrite admin auth — signed session (`iron-session` or JWT), per-admin accounts, hashed passwords. This was Phase 3 step 21; **it has to move to Phase 0**, because the portal cannot be internet-reachable without it.
2. Turn on Deployment Protection (Vercel Authentication) for the project, production included.
3. Set `ADMIN_PASSWORD` + `FIREBASE_*` in Vercel — **rotated values only** (§6.2).

Project settings note: `vercel link` pinned the framework preset to **Services** (FastAPI residue). `vercel.json` now pins `"framework": "nextjs"` to override it.

### Blocked on you

1. **Rotate the leaked credentials** — admin password, and revoke + reissue the Firebase service-account key (§6.2).
2. **Accept Neon's marketplace terms** — <https://vercel.com/ling-iq/~/integrations/accept-terms/neon?source=cli>. A legal acceptance, so it cannot be automated. Then re-run `vercel integration add neon` to finish step 3 and auto-inject `DATABASE_URL`.
3. ~~**Re-authenticate the Vercel MCP against the Pro account**~~ — **done.** CLI is on the `ling-iq` team scope (`vercel switch ling-iq`).

---

## 1. Complete Service & Dependency Inventory

Every external dependency found across `third-and-manageable-admin-main/`, `web-prototype/`, `backend/`, `render.yaml`, and the shipped iOS bundle described in `FEATURE_ANALYSIS.md`.

### 1.1 Hosting & Compute

| # | Service | Where it's declared | What it does | Cost today | Vercel verdict |
|---|---|---|---|---|---|
| 1 | **Render Web Service** `third-and-manageable-api` | `render.yaml:2-11` | FastAPI/Uvicorn REST API | Free tier — **spins down after 15 min idle, ~50s cold start**. $7/mo to fix | ✅ **Migratable** — port to Next.js Route Handlers (recommended), or run as a Vercel Python Function (bridge) |
| 2 | **Render PostgreSQL** `tm-db` | `render.yaml:18-22` | Primary relational store | Free tier — **free Postgres instances are deleted after 30 days**; $7/mo Basic after | ✅ **Migratable** — Neon Postgres via Vercel Marketplace (free tier, native integration) |
| 3 | **Next.js admin app** | `third-and-manageable-admin-main/` | Operator dashboard | Not deployed anywhere yet | ✅ **Native** — Next 16.1.6 / React 19.2.3 / Tailwind 4, zero-config on Vercel |
| 4 | **Vite SPA** `web-prototype` | `web-prototype/` | Redesigned athlete app | Not deployed anywhere (local `vite dev` only) | ✅ **Migratable** — port into Next.js App Router (recommended) or ship as static SPA |
| 5 | **Expo / EAS Build** | iOS bundle, `FEATURE_ANALYSIS.md` §5.1 | Native iOS build + App Store submission | EAS free tier / $99/yr Apple Developer | ❌ **Cannot move.** Vercel does not build native binaries. EAS + Apple stay |

### 1.2 Data Stores

| # | Service | Where | Collections / Tables | Vercel verdict |
|---|---|---|---|---|
| 6 | **Firebase Firestore** | `src/lib/firebase-admin.ts`, 17 call sites | `profiles`, `checkins`, `messages`, `rooms`, `support_requests`, `completions` | ✅ **Eliminable** — every collection maps onto an existing (or trivially extended) SQL table. See §3 |
| 7 | **Firebase Admin SDK service account** | `FIREBASE_PROJECT_ID` / `CLIENT_EMAIL` / `PRIVATE_KEY` | Server-side Firestore credentials | ✅ **Eliminable** with #6. Removes a long-lived private key from env |
| 8 | **SQLite** `third_manageable.db` | `backend/app/config.py:16` | Local dev DB, 106 KB, has real test data | ⚠️ **Not deployable** — Vercel functions have an ephemeral filesystem. Dev-only; replace with a Neon dev branch |
| 9 | **Firebase Storage** (implied) | iOS `NSPhotoLibraryUsageDescription`, `NSCameraUsageDescription` | Profile photos | ✅ **Migratable** — Vercel Blob (1 GB free) |

### 1.3 Authentication

| # | Service | Where | Vercel verdict |
|---|---|---|---|
| 10 | **Backend JWT auth** | `backend/app/auth.py` — bcrypt + `python-jose`, HS256, 7-day | ✅ **Migratable, no vendor** — `jose` (TS) + `bcryptjs`/`@node-rs/bcrypt`. Self-hosted, $0 |
| 11 | **Firebase Auth** | Original mobile app (`FEATURE_ANALYSIS.md` §1) | ✅ **Eliminable** when mobile is rebuilt against #10 |
| 12 | **Appwrite Auth** | `FEATURE_ANALYSIS.md` §6.2 — original MVP | ✅ **Delete outright.** Already a documented defect: *"free plan pauses during inactivity, blocking user sign-ins"* |
| 13 | **Admin password auth** | `src/lib/auth.ts`, `src/app/api/login/route.ts` | ⚠️ **Migratable but must be rewritten — see §6.1 (security).** Shared plaintext password + a constant, unsigned cookie value |

### 1.4 AI / Third-Party APIs

| # | Service | Where | Vercel verdict |
|---|---|---|---|
| 14 | **Google Gemini API** | `backend/app/services/gemini.py`, `google-generativeai==0.8.3`, model `gemini-1.5-flash` | ✅ **Route through Vercel AI Gateway** — one key, unified billing, observability, provider failover. **Also: `gemini-1.5-flash` is retired — the model ID must be bumped regardless of this migration** |
| 15 | **Gemini in-app (mobile)** | Original Expo bundle calls Gemini client-side | ⚠️ **Security issue independent of hosting** — an in-app LLM key is extractable from the bundle. Move behind the server `/clipboard` endpoint |
| 16 | **Google Fonts CDN** | `web-prototype/index.html` `<link>` — Inter, Instrument Serif, JetBrains Mono | ✅ **Eliminable** — `next/font/google` self-hosts at build time. Removes a render-blocking third-party request |

### 1.5 Platform Capabilities Currently Unserved

Nothing provides these today; Vercel covers them at no added vendor cost.

| # | Need | Vercel primitive |
|---|---|---|
| 17 | Daily check-in reminders, weekly action rollover, streak recompute | **Vercel Cron** (`vercel.json` `crons`) |
| 18 | Push notifications (`NSUserNotificationsUsageDescription`) | ❌ Not Vercel — Expo Push (free) triggered *from* a Vercel Cron function |
| 19 | Analytics / product metrics | **Vercel Web Analytics + Speed Insights** (free on Hobby) |
| 20 | Rate limiting on `/auth/login` and `/clipboard/chat` (LLM cost abuse) | **Vercel WAF** rate-limit rules |
| 21 | Runtime flags — `AUTO_VERIFY`, paywall toggles, crisis-resource copy | **Vercel Edge Config** |
| 22 | Preview environments per PR | **Vercel Preview Deployments + Neon DB branching** |

### 1.6 Explicitly Out of Scope for Vercel

- **EAS Build / App Store Connect** — native binaries and submission.
- **Real-time presence / live chat sockets.** Community is Reddit-model request/response (`backend/app/routes/community.py`), so nothing breaks today. If live chat is ever wanted, that needs Upstash Redis or Ably — note it as a future line item, not a current one.
- **Apple Health / Terra** integrations (`WEB_PROTOYPE_DEBRIEF.md` §8, deferred).

---

## 2. Recommended Target Architecture

**One Next.js app. One Vercel project. One database. One language.**

`web-prototype` was a design spike built in a vacuum — it is not a second product to be merged. It contributes screens, design system, and data registries, which get rebuilt on the Next.js foundation that `third-and-manageable-admin-main` already provides. Both are Next 16 / React 19 / Tailwind 4, so component code moves nearly verbatim; the router is the only real work.

```
3rd_and_manageable/
├── app/
│   ├── (athlete)/    check-in · game-plan · clipboard · community · progress · profile · support
│   ├── admin/        dashboard · users · checkins · community · support · gameplans
│   │                 (middleware-gated; from third-and-manageable-admin-main)
│   └── api/          Route Handlers — ported from FastAPI
├── lib/
│   ├── db/           Drizzle schema + migrations   ← single source of truth for data
│   ├── core/         skill engine · path scoring · journey math · work-path registry
│   │                 ← single source of truth for rules; imported by BOTH pages and handlers
│   └── auth/         athlete JWT · admin session
├── components/       shared UI, Tailwind v4 theme tokens
└── (mobile/          Expo app — later, consumes the same Route Handlers)
```

**Everything on Vercel:** app + admin + API in one deployment · Neon Postgres (Marketplace) · Blob (photos) · Cron (reminders) · Edge Config (flags) · AI Gateway (Gemini) · WAF (rate limits) · Analytics.

**Nothing on Render. Nothing on Firebase. Nothing on Appwrite.**

### 2.0 Why one project, not two

Two projects buy independent deploy cadence and separate blast radius — both worth paying for when different people ship the admin and the app on different schedules. That is not this team. The admin is 6 pages and 9 API routes; the cost of splitting (two builds, two env var sets, two dashboards, a workspace boundary) is concrete and the benefit is hypothetical.

The blast-radius argument in particular does not hold: both halves query the same database with the same credentials, so a deployment boundary protects nothing that `middleware.ts` on `/admin/*` doesn't. Next.js also code-splits per route, so athlete users never download admin JavaScript.

A single app additionally makes the §2.1 duplication fix as clean as it can get — `lib/core/paths.ts` is a plain import for both the pages and the Route Handlers. No package boundary, no workspace linking, no publish step.

Domains stay flexible either way: one Vercel project can serve `thirdandmanageable.com` and `admin.thirdandmanageable.com` via a rewrite, so choosing one project now does not commit the URL structure.

**Temporary exception:** during the bridge phase the FastAPI app is a second, short-lived Vercel deployment (Python does not sit cleanly inside a Next.js project). It is scaffolding — deleted at the end of Phase 2.

### 2.1 Why one language, not two

The Python backend is ~1,100 lines and it is *already duplicated in TypeScript*. **The duplication is between `backend/` and `web-prototype/` — the admin duplicates none of it** (grepping `third-and-manageable-admin-main/` for `consulting`, `nine_to_five`, `foundation`, `exploration` returns zero hits). Verified identical:

| Python | TypeScript mirror that already exists | Verified |
|---|---|---|
| `services/journey.py` | `web-prototype/src/lib/journeyMath.ts` — header: *"mirroring backend services/journey.py"* | Same 90-day clamp, same streak rule |
| `services/registry.py` `JOURNEY_PHASES` | `web-prototype/src/data/journey.ts` | `foundation` 1–30, `exploration` 31–60, `commitment` 61–90 — identical |
| `services/registry.py` `WEEKLY_ACTIONS` | `web-prototype/src/data/journey.ts` | `a1`–`a4`, identical text down to the em-dash |
| `services/registry.py` `WORK_PATHS` | `web-prototype/src/data/paths.ts` | `consulting`, `nine_to_five`, `entrepreneurship`, `gig`, `overnight` — identical, same order |
| `services/skills.py` | `web-prototype/src/data/skills.ts` | Skill translation table |

There is a runtime drift-detection warning in the codebase because two hand-maintained copies of the same rules already exist. Porting to TypeScript collapses the mirrors into `lib/core/` — **the strongest argument for the port is correctness, not hosting cost.** Killing Render is the bonus.

The rest of the backend is ordinary CRUD over 12 tables. Direct substitutions:

| Python | TypeScript |
|---|---|
| FastAPI routes | Next.js Route Handlers (`app/api/**/route.ts`) |
| SQLAlchemy + Alembic | Drizzle ORM + Drizzle Kit |
| Pydantic v2 schemas | Zod |
| `python-jose` | `jose` |
| `bcrypt` | `@node-rs/bcrypt` (or `bcryptjs`) |
| `google-generativeai` | Vercel AI SDK + `@ai-sdk/google` via AI Gateway |
| Uvicorn / `render.yaml` | Vercel Functions (Fluid Compute) |

### 2.2 The bridge option, if speed matters more

Vercel's Python runtime serves ASGI apps. `api/index.py` re-exporting `app` from `backend.app.main` deploys FastAPI to Vercel unchanged — Render dies immediately, with zero rewrite.

Two required fixes before that works:

- `backend/app/main.py:21-43` runs `create_all` + `alembic stamp` + `seed_forums` inside `@app.on_event("startup")`. On serverless that fires on **every cold start**. Move to a build-step migration + one-off seed script.
- Neon's TCP **pooler** endpoint must be used, not the direct endpoint — serverless functions exhaust direct connections.

Use this only as a bridge. It leaves two languages and the duplicated rule engines in place, which works against goal #3.

---

## 3. Firestore → Postgres Mapping

`FEATURE_ANALYSIS.md` §4.1 offered Option A (unify on SQL) vs Option B (dual-write Firestore sync). **Option A.** Option B means paying for and operating two databases forever and keeps the admin portal reading a different truth than the app.

| Firestore collection | Target SQL table | Columns that must be **added** |
|---|---|---|
| `profiles` | `users` + `athlete_profiles` | `sport` → `athlete_profiles.sport` ✅ exists; **`suspended`**, **`banned`**, **`chat_banned`**, **`verification_requested`**, **`streak`** (or derive), `joined_at` → `users.created_at` ✅ exists |
| `checkins` | `check_ins` | **`mood`** (1–5 int — admin `/checkins` charts it; SQL only has `option`), `note` → `journal` ✅ exists |
| `messages` | `posts` + `comments` | ✅ maps. Admin reads `display_name`, `sport`, `content`, `room_id`, `created_at` |
| `rooms` | `forums` | **`daily_prompt`**, **`daily_prompt_author`**, **`daily_prompt_updated_at`** (used by `/api/update-prompt`) |
| `support_requests` | `peer_support_requests` + `tech_support_requests` | ✅ maps. Admin's flat `type` field discriminates — either add a `type` column and merge into one table, or `UNION` in a view |
| `completions` | `action_completions` | `date` (SQL has `week_of` + `completed_at`), **`category`** (§6.5) |

**Admin moderation fields (`suspended` / `banned` / `chat_banned`) have no backend enforcement today** — the API never checks them. They exist only as Firestore writes. The migration must add both the columns and the enforcement in `require_verified` / auth middleware, otherwise banning a user does nothing.

---

## 4. Phased Execution Plan

### Directory lifecycle — what is kept, and until when

`web-prototype/` and `backend/` are **retained in the initial commit as reference material**, then deleted once their content has been absorbed. Nothing is discarded up front: both remain readable (and `backend/` remains *runnable*) throughout the migration, and git history preserves them permanently after deletion.

| Directory | Role | Deleted at |
|---|---|---|
| `third-and-manageable-admin-main/` | **The foundation.** Promoted to repo root in Phase 0 | — (becomes the app) |
| `web-prototype/` | Reference for screens, design system, data registries, and the API contract (`src/lib/api.ts`) | **End of Phase 1**, once all 14 routes exist under `app/(athlete)/` and the registries are lifted into `lib/core/` |
| `backend/` | Reference for API semantics + the running FastAPI bridge | **End of Phase 2** (step 16), once every route handler is ported and the Vitest suite passes |
| `render.yaml` | — | Phase 2 step 11, when the bridge goes live |

Rationale: the port is verified *against* these directories, not from memory. `web-prototype/src/lib/api.ts` is the endpoint checklist and `backend/tests/` is the behavioral spec — deleting either early would mean porting blind. Keeping them costs nothing but disk.

### Phase 0 — Foundation (no behavior change)
1. `git init` at the repo root. **This directory is not a git repository** — Vercel's Git integration, preview deploys, and rollbacks all require one. `web-prototype/` and `backend/` are included in this commit per the lifecycle table above; `node_modules/`, `.venv/`, `dist/`, `*.db`, and `.env` are gitignored.
2. Promote `third-and-manageable-admin-main` to the repo root as the single Next.js app. It is the foundation: it is already Next 16 / React 19 / Tailwind 4 and already deployable.
3. Provision **Neon Postgres** via Vercel Marketplace (free tier). `DATABASE_URL` auto-injects.
4. Port the SQLAlchemy schema to Drizzle in `lib/db/`, replaying the three Alembic revisions (`9b002fad09d3` → `4c7e1a9f2b08` → `7d2e5f8a1c34`) as the baseline, **plus the §3 added columns**.
5. Deploy to Vercel as-is (admin only, still on Firestore) to prove the pipeline end to end.

### Phase 1 — Situate the prototype (goal #1)
6. Move the existing admin pages under `app/admin/`; add `middleware.ts` gating `/admin/*`.
7. Port `web-prototype`'s 14 react-router routes into `app/(athlete)/`. Same React 19 + Tailwind 4 versions, so component code moves nearly verbatim; the router is the only real work.
8. Google Fonts `<link>` → `next/font/google` (self-hosted Inter / Instrument Serif / JetBrains Mono).
9. Lift `src/data/*` registries and `lib/journeyMath.ts` into `lib/core/` — the single source of truth, imported by pages and Route Handlers alike.
10. Redeploy. `VITE_API_URL` → `NEXT_PUBLIC_API_URL`, still pointing at FastAPI. **Delete `web-prototype/`** — its content now lives in `app/(athlete)/` and `lib/core/`.

### Phase 2 — Migrate the backend (goal #2)

*Bridge first (§2.2), then port behind it — decided; see §7.1.*

11. **Bridge:** deploy FastAPI to Vercel's Python runtime as a temporary second deployment. Apply the two §2.2 fixes (move the startup hook to a build-step migration + seed script; use Neon's pooler endpoint). **Delete `render.yaml`. Render bill → $0**, and the 30-day free-Postgres deletion clock stops.
12. Port `backend/app/services/{skills,journey,registry}.py` → `lib/core/`. Pure functions with 3 registry-contract tests already covering them — port the tests first.
13. Port the 7 route modules to Route Handlers under `app/api/`, one at a time, cutting traffic over per route while the Python bridge serves the rest. The API contract is fully specified by `web-prototype/src/lib/api.ts` (148 lines, every endpoint typed) — that file is the porting checklist.
14. Gemini → Vercel AI Gateway. Keep `SAFETY_TEMPLATE` and `_summarize_adaptation` verbatim; **bump off the retired `gemini-1.5-flash`.**
15. Port the 20 pytest cases to Vitest. Do not retire a Python route until its replacement passes.
16. Delete the Python deployment and **`backend/`**. **One deployment, one language.**

### Phase 3 — Unify the data layer
17. Resolve the §6.5 weekly-action taxonomy conflict — **blocks this phase.**
18. Repoint all 17 `adminDb` call sites at Drizzle.
19. **Scripted Firestore → Postgres export — the CWRU pilot data is retained** (84 users, their check-ins, messages, support requests, and `completions`). Must include the §6.4 email-leak scrub on message bodies. `completions` maps cleanly, since Firestore already uses the fifteen-key taxonomy chosen in §6.5.
20. Remove `firebase-admin`, the service-account env vars, and the Firebase project. **Firebase bill → $0.**
21. Rewrite admin auth (§6.1).

### Phase 4 — Absorb the unserved capabilities
22. Vercel Cron: daily reminders, weekly action rollover, streak recompute.
23. Vercel Blob: profile photos.
24. Edge Config: `AUTO_VERIFY` and the verification-policy flags (`WEB_PROTOYPE_DEBRIEF.md` §16.2 Q1 is still open).
25. WAF rate limits on `/auth/login` + `/clipboard/chat`.
26. Web Analytics + Speed Insights.

### Phase 5 — Mobile parity (goal #3, later)
27. Rebuild the Expo app against the Vercel Route Handlers. Retires Firebase Auth **and** the client-side Gemini key. EAS Build stays — that part never moves.

---

## 5. Cost Comparison

| Line item | Today | After |
|---|---|---|
| Render web service | $0 free tier (50s cold starts) → **$7/mo** to be usable | **$0** — gone |
| Render Postgres | $0 for 30 days → **$7/mo** | **$0** — Neon free tier on Vercel Marketplace |
| Firebase Firestore | $0 Spark → Blaze usage-based as the pilot scales | **$0** — gone |
| Appwrite | $0 free (pauses, breaks sign-in) | **$0** — gone |
| Vercel hosting (1 project) | n/a | **$20/mo** Pro (already held) |
| Gemini | usage-based | usage-based via AI Gateway ($5 free credit) |
| Blob / Cron / Edge Config / Analytics / WAF | n/a | included |
| Apple Developer + EAS | $99/yr | unchanged |

**Vendor count: 5 → 2** (Vercel + Apple/EAS), with Google as a metered API behind the AI Gateway.

**Pro is already held**, which settles the licensing question — Hobby's license prohibits commercial use, and the $7,500/yr Team License in `FEATURE_ANALYSIS.md` §6.3 is unambiguously commercial. Pro also unlocks the WAF rules (§1.5 #20) and longer function durations, both assumed by this plan.

⚠️ **The Vercel MCP in this session is authenticated to a personal Hobby account** (`list_teams` returned empty). Before any deploy step, re-auth against the Pro team or projects will land in the wrong account.

---

## 6. Issues This Migration Must Fix

These are pre-existing defects that the migration touches directly. Flagging rather than silently carrying them forward.

### 6.1 Admin session cookie is forgeable — **critical**
`src/lib/auth.ts:8` — `verifyAdmin()` returns true when the cookie `admin_session` literally equals the string `"authenticated"`. The value is not signed, not encrypted, and not derived from any secret. Anyone can set that cookie in devtools and get the full operator portal: every user's email, every check-in journal entry, plus ban/suspend/delete. All 7 mutating API routes call `verifyAdmin`, so the check is applied consistently — it just doesn't check anything.

Fix during Phase 3: signed session (`iron-session` or a JWT), per-admin accounts with hashed passwords, replacing the single shared `ADMIN_PASSWORD`.

### 6.2 Credentials committed to the repo
`third-and-manageable-admin-main/env.example` contained a **real** admin password, a real service-account email, and a key-shaped value. `FEATURE_ANALYSIS.md` §5.2 re-published the same password in prose.

**Status: sanitized before the initial commit** — both files now hold placeholders, so nothing sensitive entered git history. `backend/.env` held only a placeholder JWT secret and an empty Gemini key, and is gitignored regardless.

⚠️ **Still required of you, outside the repo:** the exposed values were live before sanitization and must be **rotated at the source** — change the admin password, and revoke + reissue the Firebase service-account key in the Firebase Console. Sanitizing the file does not invalidate a credential that already leaked.

### 6.3 Moderation flags are decorative
Per §3 — `suspended` / `banned` / `chat_banned` are written by the admin portal and read by nothing. Add enforcement alongside the columns.

### 6.4 Email exposure in community content
`FEATURE_ANALYSIS.md` §1.4 — full user emails visible inside the Global Athlete Room. The new `posts`/`comments` schema stores `author_name` only, which fixes this by construction. Verify during the Firestore export that no email leaks into migrated message bodies.

### 6.5 Admin and backend disagree about what a "weekly action" is — **RESOLVED: fifteen categorized habits**
`(dashboard)/gameplans/page.tsx:5` hardcodes **15** action IDs in a categorized taxonomy (`career-explore`, `career-network`, `routine-morning`, `mindset-journal`, `wellness-therapy`, …). `backend/app/services/registry.py:88` defines **4** generic reps (`a1`–`a4`).

These are not two copies of one model — they are two different models. The admin was built against the original app's Firestore schema; the backend was written fresh for the redesign. Nothing reconciles them.

**Consequence:** when the admin routes repoint at Postgres in Phase 3, `/gameplans` returns nothing — it queries `action_completions` for IDs that the backend never writes. Phase 3 cannot complete until a taxonomy is chosen.

**Decision: the admin's fifteen categorized habits win.** Consequences for the port:

- `backend/app/services/registry.py` `WEEKLY_ACTIONS` (`a1`–`a4`) is **not** ported as-is. `lib/core/actions.ts` is seeded from the admin's `ACTION_LABELS` map — 5 categories × 3 actions: `career-{explore,network,resume}`, `routine-{morning,exercise,sleep}`, `mindset-{journal,gratitude,meditation}`, `social-{connect,mentor,community}`, `wellness-{therapy,nutrition,hobby}`.
- Add a `category` column to `action_completions` (the admin groups by it), and keep `action_id` as the stable string key.
- `web-prototype/src/data/journey.ts` `WEEKLY_ACTIONS` is likewise replaced, not ported — its `a1`–`a4` entries and their `kind` values (`REFLECTION` / `SKILL REP` / `WORLD REP`) are superseded by the category taxonomy.
- Any existing `action_completions` rows written against `a1`–`a4` need remapping or discarding. The dev SQLite DB has some; the Firestore `completions` collection already uses the fifteen-key taxonomy, so **the retained CWRU data migrates cleanly** — it is the backend that was the outlier.

This does tension against `REDESIGN_BRIEF`'s "keep it simple — one action, one mindset prompt, one habit." Fifteen actions is the data model; the UI can still surface one at a time. Worth revisiting as a UI question later, but it does not change the schema.

### 6.6 Retired model
`gemini-1.5-flash` (`services/gemini.py:102`) is retired. The safe-fallback path means this fails silently into canned responses rather than erroring — worth checking whether production is currently serving real AI at all.

---

## 7. Open Scoping Questions

Answers change the plan; everything above is written to be true regardless.

1. ~~**Backend strategy**~~ — **resolved: bridge then port.** Deploy FastAPI to Vercel's Python runtime first (Render dies immediately, stopping the 30-day Postgres deletion clock and the ~50s cold starts), then port to TypeScript route-by-route behind it. Cost of the hedge is configuring the deploy twice; benefit is nothing is ever down and the pilot keeps running.

1b. ~~**Weekly-action taxonomy**~~ — **resolved: fifteen categorized habits.** The admin's taxonomy wins; the backend's `a1`–`a4` is rewritten to match. See §6.5.
2. ~~**Firestore live data**~~ — **resolved: retain.** The CWRU pilot data must survive. Phase 3 includes a scripted Firestore → Postgres export, and §6.4's email-leak scrub is mandatory, not optional.
3. ~~**Repo shape**~~ — **resolved: one Next.js app, one Vercel project, no monorepo.** `web-prototype` was a design spike built in a vacuum, not a parallel product, so there is nothing to merge — its screens and registries get rebuilt on the admin's Next.js foundation. Rationale in §2.0.
4. ~~**Vercel plan**~~ — **resolved: Pro.** Only remaining action is re-authenticating this session's Vercel MCP against the Pro account before deploying.
5. **Verification policy** (`WEB_PROTOYPE_DEBRIEF.md` §16.2 Q1, still open) — roster DB, `.edu` allow-list, or manual review? The gate and tests exist; the policy decides whether Phase 4's Edge Config flag is a stopgap or the mechanism.

---

## 8. Item-by-Item Summary

| Dependency | Verdict |
|---|---|
| Render web service | ✅ Migrate — Vercel Functions |
| Render Postgres | ✅ Migrate — Neon (Vercel Marketplace) |
| Firestore | ✅ Eliminate — fold into Postgres |
| Firebase Admin SDK | ✅ Eliminate |
| Firebase Auth | ✅ Eliminate — self-hosted JWT |
| Appwrite | ✅ Delete — already broken |
| Firebase Storage (photos) | ✅ Migrate — Vercel Blob |
| Backend JWT auth | ✅ Migrate — `jose` + bcrypt, no vendor |
| Admin password auth | ⚠️ Migrate **and rewrite** — §6.1 |
| Gemini API | ✅ Route via Vercel AI Gateway + bump model |
| Gemini in mobile client | ⚠️ Move server-side — key is extractable |
| Google Fonts CDN | ✅ Eliminate — `next/font` |
| Next.js admin | ✅ Native on Vercel |
| Vite SPA | ✅ Migrate — port to App Router |
| SQLite dev DB | ⚠️ Dev-only — replace with a Neon branch |
| Cron / Blob / Flags / Analytics / WAF | ✅ Adopt — included |
| Expo / EAS Build | ❌ Stays — Vercel doesn't build binaries |
| Apple Developer Program | ❌ Stays |
| Push notifications | ❌ Expo Push, triggered from Vercel Cron |
| Realtime sockets | ❌ Not needed today; future Upstash/Ably if live chat is added |
