# Third & Manageable — Vercel Consolidation Plan

**Goal:** collapse the current multi-vendor footprint (Render + Firebase + Appwrite + Google AI + un-hosted Vite SPA) onto Vercel, keeping Firebase temporarily as a mobile compatibility dependency and Render **only** if the FastAPI service genuinely cannot move. Sequenced to serve the three-step objective:

1. Situate `web-prototype` into the foundation of the pre-redesign app (`third-and-manageable-admin-main`).
2. Migrate backend + frontend dependencies onto Vercel.
3. Keep building on that combined foundation.

Companion documents: `FEATURE_ANALYSIS.md` (feature/architecture inventory), `WEB_PROTOYPE_DEBRIEF.md` (prototype state), `REDESIGN_BRIEF.md` (product direction).

---

## 0. Current Status — read this first

**All original scoping questions are resolved.** Decisions, in one place:

| Decision | Answer |
|---|---|
| Backend | Bridge FastAPI onto Vercel Python first, then port to TypeScript route-by-route behind it (§2.2, §7.1) |
| Repo shape | **One** Next.js app, **one** Vercel project, no monorepo (§2.0) |
| Bridge topology | Next.js + FastAPI are two Vercel Services in **one project and one shared deployment**; the browser calls a same-origin `/bridge/*` route that Vercel maps to FastAPI. A private server-only binding cannot serve the current client-side fetches. |
| Vercel plan | Pro, already held (§5) |
| Firestore data | **Retain** the CWRU pilot data; scripted export in Phase 3 (§7.2) |
| Firebase retirement | **Hold.** Do not delete Firebase until the replacement mobile release is adopted, or until a compatibility/token-validation bridge makes old clients safe to retire (§2.3, Phase 3) |
| User sign-in | Preserve existing Google and Apple account continuity; implement Auth.js + provider-subject identity mapping (§2.4, §6.7) |
| Admin authorization | Explicit database allowlist/role assignments, protected by signed sessions and append-only admin-action audit logs (§6.1, §6.7) |
| Weekly actions | **Fifteen categorized habits** — admin's taxonomy wins, backend's `a1`–`a4` is replaced (§6.5) |
| Compliance gate | Purchase Vercel's HIPAA add-on and complete the BAA **before any live workload may handle PHI** (§6.8) |

### Phase 0 progress

- [x] **Step 1 — `git init`.** Repo created on `main`; initial commit `479ceeb`, 143 files. Root `.gitignore` excludes `node_modules/`, `.venv/`, `dist/`, `*.db`, `.env`.
- [x] **§6.2 credential sanitization** — done *before* the first commit, so nothing sensitive is in history. **Rotation at the source is still outstanding and is on you** (see §6.2).
- [x] **Step 2 — promote the admin app to the repo root.** Commit `27f496c`; pure `git mv`, no source changes. Three scoping fixes the move forced: `tsconfig`/`eslint` now exclude `web-prototype/` and `backend/` (the root `**/*.ts` include would otherwise typecheck the Vite SPA's 32 files); `next.config.ts` pins `turbopack.root` (a lockfile in a parent directory was winning workspace-root inference); the admin `.gitignore` folded into the root one.
  - Follow-on commit `0230ae1` — **`firebase-admin` now initialises lazily** (`adminDb` → `getAdminDb()`, 12 files). It ran `cert()`/`initializeApp()` at module scope, and since Next imports every route module during page-data collection, a build failed outright without the service-account vars. Builds no longer need runtime secrets — which is what lets step 5 proceed while the §6.2 rotation is still pending. The module remains only through the mobile/data compatibility window (§2.3).
  - `next build` passes: 19 routes, every Firestore-backed page/route correctly `ƒ` (dynamic); only `/login` and `/_not-found` prerender.
- [~] **Step 3 — provision Neon Postgres.** Vercel project **created and linked**: `ling-iq/third-and-manageable` (`prj_QaCgXSSn1sXJSob2T0qhYSLiJ1ek`). Neon resource `third-and-manageable-db` is provisioned on the free plan in `iad1`, connected to production/preview/development, and injects pooled + unpooled Postgres variables. It was deliberately provisioned with `auth=false`; the first empty resource was immediately replaced after Neon's default `auth=true` conflicted with the Auth.js decision. The remaining acceptance check is running the baseline on an actual disposable **Neon branch**; see the provider-console blocker below.
  - ⚠️ `vercel link` auto-detected `backend/` and wrote a `vercel.json` rewriting **`/(.*)` → the FastAPI service**, which would have shadowed the entire admin app. **Deleted.** Worth knowing for Phase 2 step 11: Vercel detects and bridges the FastAPI service natively, so §2.2 is less work than assumed — but that config must not land until step 11.
- [x] **Step 4 — SQLAlchemy → Drizzle baseline revised before application.** The initial 12-table draft has been replaced by a 19-table baseline implementing §3.1: UUID domain IDs; provider-subject identities and Firebase UID mapping support; normalized emails; isolated legacy credentials; revocable session records; active admin-role grants; trigger-enforced append-only audit logs; FK-backed post/comment votes; `date`/`timestamptz`; and database checks, uniqueness rules, partial/composite indexes, and soft-delete/retention fields. `npm run db:test:neon` applied the migration twice to an isolated temporary database in the Neon project, wrote identity/role/audit fixtures, proved constraint and audit-immutability rejection, and removed the database. Repeat the same acceptance test on a real Neon branch before marking Step 3 complete.
- [~] **Step 5 — first deploy.** Pipeline **proven** (build + deploy + routes served), then **the deployment was removed**. See below.

#### ⚠️ Step 5 outcome — production went public, and was taken down

`vercel deploy` without `--prod` still shipped to **production**: Vercel auto-promotes a project's *first* deployment. It was reachable with no Deployment Protection, and **§6.1 was confirmed exploitable in the wild** — `curl -H 'Cookie: admin_session=authenticated' .../users` was served the dashboard instead of being redirected to `/login`. It returned 500 only because the Firebase vars are unset; with them set, that response is every user's email and journal entries.

Deployment `dpl_5ow9wGMVv7hzvAAUURiVednVXdU3` was removed, and Vercel now reports no deployments. **No application data was returned during the observed checks** because Firestore was unreachable and the admin password was unset; there is no evidence of data exposure. Without a complete access-log/forensic review, do not turn that evidence into the stronger absolute claim that exposure was impossible.

Related, found while checking: `/api/login` compares `password === process.env.ADMIN_PASSWORD`. With the env var unset, a POST that **omits** `password` compares `undefined === undefined` and **succeeds**. Fix alongside §6.1.

**The §6.1 code fix is committed on the local branch, but Step 5 remains open
until it is configured and verified in a protected smoke deployment.**
Before any redeploy, in order:
1. Add `.vercelignore` plus a deployment-manifest check that fails if local env files, databases, Python virtual environments, caches, reference apps, or other forbidden residue enter the upload.
2. Make application auth independently secure: fail closed when secrets are absent, replace the constant cookie with a cryptographically signed session, use `proxy.ts` for early page gating, and retain authoritative authorization checks inside every server action/Route Handler.
3. Keep Deployment Protection enabled as defense in depth. Current Vercel state is `all_except_custom_domains`: Vercel-owned deployment URLs are protected, but a future custom production domain is not. Application auth therefore remains mandatory; revisit the protection mode/plan before attaching a live custom domain.
4. Test the revised database baseline on a disposable Neon branch.
5. Set only the secrets needed for the protected smoke deployment. Vercel currently has **only Neon-managed database variables**—no admin-auth or Firebase values. Firebase remains on hold until access is restored; never restore unrotated values (§6.2).

The signed shared-password session in Phase 0 is a bootstrap control, not the final identity system. Before the admin portal handles real data, replace it with the §6.7 Auth.js Google/Apple flow, explicit admin role assignment, revocation, and audit logging.

**Current committed security baseline (not yet deployed):**

- `.vercelignore` reduces Vercel's dry-run source manifest from 163 files / 18.6 MB to runtime source only; `npm run check:vercel-manifest` consumes Vercel CLI's own dry-run JSON and rejects secret/env files, databases, caches, reference apps, business artifacts, or a non-Next.js framework.
- Bootstrap auth now fails closed unless a 16+ byte password and 32+ byte signing secret exist. It uses constant-time password comparison and an 8-hour signed `HttpOnly; SameSite=Strict` session whose key changes when either secret rotates. The old `admin_session=authenticated` cookie is ignored and cleared.
- `src/proxy.ts` gates the current admin page routes; dashboard layouts and all seven privileged handlers keep their independent server-side checks.
- Unit, build, and live regression checks prove missing configuration → 503/no cookie, old/forged/tampered cookies → redirect, wrong password → 401, and a valid signed cookie is the only token that reaches the data layer.
- Next.js is updated from 16.1.6 to 16.2.12 and Firebase Admin from 13.6.1 to 14.2.0, which removed the critical production findings. The remaining 16 were then cleared with `overrides` — see technical go-live blocker 1 above, which is now closed.

**Committed since:** `d53d186` dependency remediation · `ea2f93f` FastAPI bridge on the UUID/timestamptz baseline · `7235b14` Phase 1 step 6 · `de6688c` athlete port · `c8ba5e8` prototype retirement · `490f5df` registry-test fix.

### Phase 1 progress — complete

Steps 6–10 are all done; **`web-prototype/` is deleted.** The athlete app is the
product surface at `/`, the admin portal lives at `/admin/*` behind the proxy
gate, and both build from one Next.js app in one Vercel project.

- **28 routes** build clean: 11 athlete URLs (+ a catch-all), 7 admin, 9 API, plus `ƒ Proxy (Middleware)`.
- **Verified against a running production build**, not the diff: every athlete route 200s, `/nope` 404s, all six privileged admin paths 307 to `/admin/login`, the §6.1 forged `admin_session=authenticated` cookie still redirects, and `POST /api/login {}` does not authenticate.
- **152 automated checks**: 53 Vitest (including login-first NUX and
  authenticated-shell gating, honest fresh-system defaults, DST calendar math,
  same-origin bridge routing, auth-transition hydration, university theme
  selection, proxy/session, and registry parity) + 99 pytest. `tsc`, `eslint`,
  `drizzle-kit check`, and
  `npm run check:audit` (0 production vulnerabilities) all clean.
- Fonts are self-hosted; zero requests to Google's font CDN.
- What the port could not carry over verbatim — UUID ids, prerender-safe storage access, the lost `navigate(state)` channel, revocable sign-out, and five more — is in **§4.1**. Read that before reviewing the diff.

**Not done, and deliberately so:** athlete pages are still client components
fetching from the browser, and athlete auth is still a bearer token while the
admin uses a signed cookie. Both convert alongside the Phase 2 Route Handlers.

**Blocked:** step 10's redeploy, like step 5's smoke deployment, needs the §6.2
rotation first.

Project settings note: `vercel link` pinned the framework preset to **Services** before the service topology was intentional. The project setting and `vercel.json` now both pin **Next.js**. Phase 2 deliberately switches the same project to Services with explicit Next.js + FastAPI configuration, then returns it to a Next.js-only preset and removes every Python/service-binding residue at cutover.

### Blocked on you

1. **Firebase access/sign-in is unavailable.** Until access is restored, the service-account key cannot be safely rotated/tested, Firestore cannot be exported, and the existing Firebase Google/Apple identity configuration and provider subjects cannot be inventoried. Firebase work is on hold; do not inject old credentials into Vercel.
2. **Obtain the existing Google and Apple sign-in configuration** — Google OAuth client/project access, Apple Services ID/Team ID/Key ID/private key, redirect URIs, and an export of Firebase Auth UIDs/provider subjects. This blocks final Auth.js account linking, but not the Phase 0 signed bootstrap session.
3. **Rotate the leaked credentials when access is restored** — admin bootstrap password, then revoke + reissue the Firebase service-account key (§6.2).
4. **Purchase Vercel's HIPAA add-on and complete/file the BAA before go-live.** A BAA is necessary but not sufficient; the application and every downstream processor still need the §6.8 controls and their own compliance review.
5. ~~**Accept Neon's Marketplace terms**~~ — **done.** Provisioning and disposable-branch validation are now actionable.
6. **Direct Vercel access:** the Vercel CLI is authenticated to the `ling-iq`
   team scope and is sufficient for the current work. A direct Vercel MCP
   connector is not exposed in this Codex session, so there is no additional
   MCP authorization flow available here; do not describe CLI access as MCP
   access.
7. **Create/enable the disposable Neon branch in the provider console.** The resource is provisioned and its baseline passed an isolated disposable-database test, but Vercel CLI exposes branch creation only through preview-deployment configuration/provider UI, the Marketplace MCP is read-only, and the in-app browser was unavailable. Enable “Create a database branch for deployment: Preview” or create a one-off branch in Neon, then run the same migration test against its unpooled URL and delete it.

### Technical go-live blockers

1. ~~**Production dependency audit is not clean.**~~ — **resolved.** `npm audit --omit=dev` reports **0**, down from 16 (10 high, 5 moderate, 1 low). Every finding was transitive under `firebase-admin` or `next`, both already on their latest release, so npm's own suggested fix was a downgrade to `firebase-admin@10.3.0` / `next@9.3.3` — which this plan rules out. `overrides` pin the patched transitive versions instead: postcss and sharp under `next`; uuid and the brace-expansion/minimatch/glob/rimraf/gaxios/`@tootallnate/once` chain under `firebase-admin`. The whole `firebase-admin` block disappears at the §2.3 retirement gate.
   - `npm run check:audit` fails the production audit at `--audit-level=low`, so this cannot silently regress into the unexplained exception list §6.8 prohibits. Re-check the overrides on every `next`/`firebase-admin` bump and drop entries upstream has caught up to.
   - **Residual, dev-only:** the full audit is 63 → 17. What remains is a single `ajv` ReDoS (`GHSA-2g4f-4pwh-qvx6`, moderate, `$data` schemas) reached only through `@vercel/static-config`, which validates *our own* config at build time and is not attacker-controlled. It is not overridable globally — forcing ajv 8 breaks ESLint's own, unaffected, ajv 6 — and npm's nested override syntax does not match this graph. Dev tooling does not ship: the manifest guard proves the upload is runtime source only.
2. ~~**The FastAPI bridge still models integer IDs and naive timestamps.**~~ — **resolved.** The bridge is ported onto the §3.1 baseline: UUID primary keys and JWT subjects, `timestamptz` everywhere via a `UtcDateTime` decorator that rejects naive values at the boundary, `date` for `check_ins.date` and `action_completions.week_of`, email in `user_emails` and the password hash in `password_credentials`, and the polymorphic `votes` table split into FK-backed `post_votes`/`comment_votes`. Startup no longer runs `create_all` + `alembic stamp` + `seed_forums` (§2.2 blocker 1) — Drizzle owns the schema, `python -m app.seed` owns seed data, and Alembic is deleted.
   - Shared contract suite: **20 → 86 tests.** `tests/test_schema_contract.py` parses the generated baseline SQL and fails if a bridge column is missing from it, compiles to an incompatible type, is a naive datetime, or is an integer primary key — each verified by mutation. SQLite foreign keys are enforced in tests, so the suite no longer passes on constraints Postgres would reject.
   - Defects the baseline exposed and this fixed: §6.3 moderation flags now actually lock accounts; `week_of` held a bare ISO week *number*, so the same week of different years collided; `/game-plan` reported every action ever completed as done this week; `seed_forums` inserted a post with `author_id=1`, writable only because the column had no integrity behind it; tokens could not be revoked (now `auth_version` + `/auth/logout`).
   - §6.5 is resolved **in the bridge** — `action_completions.category` is NOT NULL, which forced it. See §6.5.

---

## 1. Complete Service & Dependency Inventory

Every external dependency found across `third-and-manageable-admin-main/`, `web-prototype/`, `backend/`, `render.yaml`, and the shipped iOS bundle described in `FEATURE_ANALYSIS.md`.

### 1.1 Hosting & Compute

| # | Service | Where it's declared | What it does | Cost today | Vercel verdict |
|---|---|---|---|---|---|
| 1 | **Render Web Service** `third-and-manageable-api` | `render.yaml:2-11` | FastAPI/Uvicorn REST API | Free tier — **spins down after 15 min idle, ~50s cold start**. $7/mo to fix | ✅ **Migratable** — port to Next.js Route Handlers (recommended), or run as a Vercel Python Function (bridge) |
| 2 | **Render PostgreSQL** `tm-db` | `render.yaml:18-22` | Primary relational store | Free tier — **free Postgres instances are deleted after 30 days**; $7/mo Basic after | ✅ **Migratable** — Neon Postgres via Vercel Marketplace (free tier, native integration) |
| 3 | **Next.js admin app** | `third-and-manageable-admin-main/` | Operator dashboard | Not deployed anywhere yet | ✅ **Native** — Next 16.2.12 / React 19.2.3 / Tailwind 4, zero-config on Vercel |
| 4 | ~~**Vite SPA** `web-prototype`~~ | ~~`web-prototype/`~~ | Redesigned athlete app | Was never deployed (local `vite dev` only) | ✅ **Done** — ported into the App Router at Phase 1 step 7; directory deleted at step 10 |
| 5 | **Expo / EAS Build** | iOS bundle, `FEATURE_ANALYSIS.md` §5.1 | Native iOS build + App Store submission | EAS free tier / $99/yr Apple Developer | ❌ **Cannot move.** Vercel does not build native binaries. EAS + Apple stay |

### 1.2 Data Stores

| # | Service | Where | Collections / Tables | Vercel verdict |
|---|---|---|---|---|
| 6 | **Firebase Firestore** | `src/lib/firebase-admin.ts`, 17 call sites | `profiles`, `checkins`, `messages`, `rooms`, `support_requests`, `completions` | ⏸️ **Migratable, then held for compatibility** — map/export to Postgres, but retire only at the §2.3 mobile gate |
| 7 | **Firebase Admin SDK service account** | `FIREBASE_PROJECT_ID` / `CLIENT_EMAIL` / `PRIVATE_KEY` | Server-side Firestore credentials | ⏸️ **Temporary migration/compatibility dependency.** Rotate before reuse and remove at the §2.3 gate |
| 8 | **SQLite** `third_manageable.db` | `backend/app/config.py:16` | Local dev DB, 106 KB, has real test data | ⚠️ **Not deployable** — Vercel functions have an ephemeral filesystem. Dev-only; replace with a Neon dev branch |
| 9 | **Firebase Storage** (implied) | iOS `NSPhotoLibraryUsageDescription`, `NSCameraUsageDescription` | Profile photos | ✅ **Migratable** — Vercel Blob (1 GB free) |

### 1.3 Authentication

| # | Service | Where | Vercel verdict |
|---|---|---|---|
| 10 | **Backend JWT auth** | `backend/app/auth.py` — bcrypt + `python-jose`, HS256, 7-day | ✅ **Migratable, no vendor** — `jose` (TS) + `bcryptjs`/`@node-rs/bcrypt`. Self-hosted, $0 |
| 11 | **Firebase Auth** | Original mobile app (`FEATURE_ANALYSIS.md` §1); existing Google/Apple integrations are external to this checkout | ⏸️ **Retain for compatibility.** Inventory Firebase UID + provider subjects, bridge old Firebase ID tokens, and delete only after replacement-mobile adoption criteria are met (§2.3) |
| 12 | **Appwrite Auth** | `FEATURE_ANALYSIS.md` §6.2 — original MVP | ✅ **Delete outright.** Already a documented defect: *"free plan pauses during inactivity, blocking user sign-ins"* |
| 13 | **Admin password auth** | `src/lib/auth.ts`, `src/app/api/login/route.ts` | ⚠️ **Phase 0 bootstrap only.** Immediately replace the unsigned cookie/fail-open login; final state is Auth.js Google/Apple + database role allowlist + audited actions (§6.1, §6.7) |

### 1.4 AI / Third-Party APIs

| # | Service | Where | Vercel verdict |
|---|---|---|---|
| 14 | **Google Gemini API** | `backend/app/services/gemini.py`, `google-generativeai==0.8.3`, model `gemini-1.5-flash` | ✅ **Route through Vercel AI Gateway** — one key, unified billing, observability, provider failover. **Also: `gemini-1.5-flash` is retired — the model ID must be bumped regardless of this migration** |
| 15 | **Gemini in-app (mobile)** | Original Expo bundle calls Gemini client-side | ⚠️ **Security issue independent of hosting** — an in-app LLM key is extractable from the bundle. Move behind the server `/clipboard` endpoint |
| 16 | ~~**Google Fonts CDN**~~ | ~~`web-prototype/index.html` `<link>`~~ — Inter, Instrument Serif, JetBrains Mono | ✅ **Eliminated** at Phase 1 step 8. `next/font/google` self-hosts all three (plus Raleway for the admin); the `<link>` and both preconnects are gone |

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

**One Next.js app. One Vercel project. One database. One language after the bridge.**

`web-prototype` was a design spike built in a vacuum — it was not a second product to be merged. It contributed screens, design system, and data registries, which were rebuilt on the Next.js foundation that `third-and-manageable-admin-main` already provides. Both were Next 16 / React 19 / Tailwind 4, so component markup moved nearly verbatim. **Done at Phase 1 steps 7–10**; the router was the bulk of the work, but not all of it — see §4.1.

```
3rd_and_manageable/
├── app/
│   ├── (athlete)/    check-in · game-plan · clipboard · community · progress · profile · support · onboarding
│   ├── admin/        dashboard · users · checkins · community · support · gameplans
│   │                 (proxy.ts-gated; authoritative checks remain server-side)
│   └── api/          Route Handlers — ported from FastAPI
├── lib/
│   ├── db/           Drizzle schema + migrations   ← single source of truth for data
│   ├── core/         skill engine · path scoring · journey math · work-path registry
│   │                 ← single source of truth for rules; imported by BOTH pages and handlers
│   └── auth/         athlete JWT · admin session
├── components/       shared UI, Tailwind v4 theme tokens
└── (mobile/          Expo app — later, consumes the same Route Handlers)
```

**Everything on Vercel:** app + admin + API in one project and shared deployment · Neon Postgres (Marketplace) · Blob (photos) · Cron (reminders) · Edge Config (flags) · AI Gateway (Gemini) · WAF (rate limits) · Analytics.

**Final state:** nothing on Render or Appwrite. Firebase remains temporarily for old mobile clients and is retired only at the §2.3 compatibility gate.

### 2.0 Why one project, not two

Two projects buy independent deploy cadence and separate blast radius — both worth paying for when different people ship the admin and the app on different schedules. That is not this team. The admin is 6 pages and 9 API routes; the cost of splitting (two builds, two env var sets, two dashboards, a workspace boundary) is concrete and the benefit is hypothetical.

The blast-radius argument in particular does not hold: both halves query the same database. `proxy.ts` provides early `/admin/*` routing protection, while layouts, server actions, and Route Handlers must independently authenticate and authorize every request. Next.js also code-splits per route, so athlete users never download admin JavaScript.

A single app additionally makes the §2.1 duplication fix as clean as it can get — `lib/core/paths.ts` is a plain import for both the pages and the Route Handlers. No package boundary, no workspace linking, no publish step.

Domains stay flexible either way: one Vercel project can serve `thirdandmanageable.com` and `admin.thirdandmanageable.com` via a rewrite, so choosing one project now does not commit the URL structure.

**Temporary bridge inside the same project:** configure Next.js and FastAPI as
Vercel Services so they build and deploy together. Athlete fetches currently run
in the browser, so they use a relative `/bridge/*` URL on the public app origin;
Vercel must route that prefix to the FastAPI Service. This avoids a second public
origin and CORS without pretending a private, server-only Service Binding is
browser-accessible. `next.config.ts` provides the equivalent development proxy.
The Python service, route, dependencies, settings, and project-preset residue are
deleted together at the end of Phase 2. **Step 11 remains gated on credentials
and confirmed Vercel Services access for the LingIQ team.**

### 2.1 Why one language, not two

The Python backend's rule engine was already duplicated in the prototype. Phase
1 moved that TypeScript copy into `src/lib/core/`, so the temporary duplication
is now explicitly between `backend/app/services/` and `src/lib/core/`:

| Python | Current TypeScript mirror | Verified |
|---|---|---|
| `services/journey.py` | `src/lib/core/journey-math.ts` | Same 90-day clamp and streak rule; TypeScript now uses DST-safe date-only ordinals matching Python `date` arithmetic |
| `services/registry.py` `JOURNEY_PHASES` | `src/lib/core/journey.ts` | Registry-contract test enforces phase ids/names; TypeScript also owns the day boundaries |
| `services/registry.py` `WEEKLY_ACTIONS` | `src/lib/core/actions.ts` | Registry-contract test enforces all fifteen ids, categories, kinds, and labels |
| `services/registry.py` `WORK_PATHS` | `src/lib/core/paths.ts` | Registry-contract test enforces ids, names, and fit ratings |
| `services/skills.py` | `src/lib/core/skills.ts` | Skill translation table |

`tests/core-registry.test.ts` now catches registry drift in CI; the remaining
duplication disappears when Route Handlers replace the bridge. **The strongest
argument for the port is correctness, not hosting cost.** Killing Render is the
bonus.

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

- ~~`backend/app/main.py:21-43` runs `create_all` + `alembic stamp` + `seed_forums` inside `@app.on_event("startup")`.~~ — **done.** The startup hook is gone; Drizzle owns the schema and `python -m app.seed` is the explicit, idempotent seed step.
- Neon's TCP **pooler** endpoint must be used, not the direct endpoint — serverless functions exhaust direct connections. Still to wire at step 11: the bridge reads `DATABASE_URL`, which must be the pooled URL, with `DATABASE_URL_UNPOOLED` reserved for migrations as `drizzle.config.ts` already does.
- ~~The browser client needs a deployable route to the bridge without a second
  origin.~~ — **done locally.** `src/lib/athlete/api.ts` defaults to relative
  `/bridge`; `next.config.ts` proxies that prefix to local uvicorn; production
  adds the equivalent Services route at step 11.
- ~~Production must reject the bridge's development auth defaults.~~ — **done
  locally.** `backend/app/config.py` fails closed on a default/short
  `JWT_SECRET`, `AUTO_VERIFY=true`, or wildcard credentialed CORS in production
  and preview environments. The Python suite covers both rejection and the safe
  configuration.

Use this only as a bridge. It leaves two languages and the duplicated rule engines in place, which works against goal #3.

### 2.3 Firebase/mobile compatibility and retirement gate

Firebase is frozen, not deleted. The released mobile app still depends on Firebase Auth and may contain users whose stable identities exist only as Firebase UIDs plus Google/Apple provider subjects.

- While old clients remain supported, add a server-side compatibility endpoint that verifies Firebase ID tokens against the correct issuer/audience/signature, then maps `(provider, provider_subject)` and `firebase_uid` to the canonical Postgres user. Never trust an email claim alone for account linking.
- Existing Firebase users receive a one-time identity-link migration into `auth_identities`; Apple private-relay email addresses are preserved as attributes, not treated as cross-provider primary keys.
- Publish and measure a replacement-mobile adoption threshold, maintain a rollback window, and communicate a minimum supported version.
- Delete Firebase Auth/Firestore only after the replacement release is adopted **or** every supported old client can authenticate through the compatibility bridge and the retained data has passed reconciliation.
- Removal includes the Admin SDK, compatibility verifier, service-account credentials, Firebase env vars, console providers, and mobile feature flags. Keep an auditable export/retention record; do not keep an undocumented shadow database.

### 2.4 Google/Apple protocol coverage and application controls

The providers solve only identity proof:

| Requirement | Google / Apple protocol provides it? | Application work still required |
|---|---|---|
| Provider authentication | **Yes.** Google uses OIDC; Apple returns signed identity claims keyed by issuer/audience/subject | Validate issuer, audience, nonce/state/PKCE, expiry, and verified-email claims through Auth.js |
| Stable account key | **Yes, per provider/client:** `sub` | Store unique `(provider, provider_account_id)` identities and explicit Firebase UID mappings |
| Cross-provider account linking | **No** | Require a signed-in linking ceremony; never auto-link by email, especially Apple relay email |
| Admin allowlist / roles | **No** | Database `admin_role_assignments`; deny-by-default and require an active role server-side |
| Application session | **No** | Auth.js high-entropy secret, signed/encrypted `HttpOnly; Secure; SameSite` session, short admin lifetime, rotation/revocation |
| Admin action audit log | **No** | Append-only audit row for every privileged mutation, including actor, action, target, outcome, request ID, and safe before/after metadata |

Use existing provider registrations where their ownership, redirect URIs, and client types are compatible. Mobile and web often require separate Apple/Google client registrations even when they belong to the same provider project; sharing a brand does not mean sharing a client secret.

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

### 3.1 Baseline quality and scaling requirements

The baseline has never been applied, so it must encode the intended invariants now:

- Use stable canonical user IDs independent of Firebase, Google, Apple, or email. `auth_identities` owns unique provider subjects; `user_emails` owns normalized/verified/primary email state. Never merge identities solely because emails match.
- Add `admin_role_assignments` as the explicit allowlist/role source, `auth_sessions` or session-version state for revocation, and append-only `admin_audit_logs`. OAuth authentication does not imply admin authorization.
- Use `date` for calendar dates/week starts and `timestamptz` for instants. Standardize the bridge on UTC-aware Python datetimes before it shares the schema.
- Prefer UUID keys for externally referenced/domain entities and `bigint`/identity only for high-volume internal sequences. Do not expose enumerable IDs where they create avoidable scraping or account-correlation risk.
- Add database checks/enums for finite states (athlete status, mood 1–5, moderation/support state, vote value, auth provider/role) and make required business fields `NOT NULL`.
- Enforce idempotency/uniqueness: one check-in per user/date, one weekly action completion per user/action/week, one vote per user/target, one provider subject per identity, and one active primary email per user.
- Replace polymorphic votes with FK-backed post/comment vote tables, or enforce equivalent integrity with a trigger. Prefer the split tables for predictable indexes and cascades.
- Add query-shaped composite indexes: time-ordered check-ins per user, posts per forum, comments per post, open support queues, action history, identity lookup, and audit actor/target/time.
- Add `created_at`/`updated_at` consistently and design soft deletion/anonymization plus retention boundaries for user/PHI records. Audit rows must survive operational record deletion without retaining unnecessary PHI.
- Keep schema changes transactional, make seed data idempotent, run migrations as an explicit build/release step (never function startup), and test both upgrade and empty-database rebuild on disposable Neon branches.
- Establish pooler/direct URL separation, per-environment database roles with least privilege, statement/lock timeouts, backup/PITR expectations, query monitoring, and a documented zero-downtime expand/backfill/contract migration pattern before scale demands it.

---

## 4. Phased Execution Plan

### Directory lifecycle — what is kept, and until when

`web-prototype/` and `backend/` are **retained in the initial commit as reference material**, then deleted once their content has been absorbed. Nothing is discarded up front: both remain readable (and `backend/` remains *runnable*) throughout the migration, and git history preserves them permanently after deletion.

| Directory | Role | Deleted at |
|---|---|---|
| `third-and-manageable-admin-main/` | **The foundation.** Promoted to repo root in Phase 0 | — (becomes the app) |
| ~~`web-prototype/`~~ | Reference for screens, design system, data registries, and the API contract (`src/lib/api.ts`) | ~~End of Phase 1~~ — **deleted** at step 10. Screens are in `src/app/(athlete)/`, registries in `src/lib/core/`, the API contract in `src/lib/athlete/api.ts` |
| `backend/` | Reference for API semantics + the running FastAPI bridge | **End of Phase 2** (step 16), once every route handler is ported and the Vitest suite passes |
| `render.yaml` | — | Phase 2 step 11, when the bridge goes live |

Rationale: the port is verified *against* these directories, not from memory — deleting either early would mean porting blind. `web-prototype/` has served its purpose and is gone; its API client survives as `src/lib/athlete/api.ts`, which is now the Phase 2 endpoint checklist. `backend/tests/` remains the behavioral spec and stays until cutover.

### Phase 0 — Foundation and safe deployment prerequisites
1. ~~`git init` at the repo root.~~ — **done.** Vercel's Git integration,
   preview deploys, and rollbacks require it; runtime dependencies were
   committed while `node_modules/`, `.venv/`, build output, local databases,
   and env files remain ignored.
2. Promote `third-and-manageable-admin-main` to the repo root as the single Next.js app. It is the foundation: it is already Next 16 / React 19 / Tailwind 4 and already deployable.
3. Provision **Neon Postgres** via Vercel Marketplace (free tier). Keep
   `DATABASE_URL` pooled for application runtime and
   `DATABASE_URL_UNPOOLED` direct for migrations. Validate the baseline on a
   disposable Neon branch before the primary database is touched.
4. Replace the unapplied SQLAlchemy/Alembic history with the §3.1 Drizzle
   baseline: canonical UUID users, provider-subject identities/Firebase UID
   mappings, normalized emails, revocable sessions, explicit admin roles,
   append-only audit events, relational vote integrity, UTC-aware timestamps,
   constraints, and query-shaped indexes.
5. After the manifest guard, secure bootstrap auth, disposable-branch migration,
   rotated admin secrets, and Deployment Protection are all verified, perform a
   protected smoke deployment. Keep Firebase credentials absent while Firebase
   access is blocked.

### Phase 1 — Situate the prototype (goal #1)
6. ~~Move the existing admin pages under `app/admin/`; add `proxy.ts` gating `/admin/*`.~~ — **done.** Pages live in an `admin/(dashboard)` route group so the layout's redirect does not wrap `/admin/login` and send it to itself; `/admin/login` is excluded from the matcher by negative lookahead for the same reason, matching `login` exactly so a future `/admin/login-history` stays gated. The matcher is a prefix now, so a new admin page is protected when it is added rather than when someone remembers to extend a list. The login page honours the proxy's `?next=`, restricted to same-origin `/admin` paths. `/` redirects to `/admin` until step 7 replaces it. Proxy remains an optimistic routing layer only — layouts, server actions, and Route Handlers repeat authoritative authentication and role checks.
7. ~~Port `web-prototype`'s 14 react-router routes into `app/(athlete)/`.~~ — **done.** It was **12 page components / 11 addressable URLs plus a catch-all**, not 14 routes; the count in this plan was wrong. Structure: `(athlete)/layout.tsx` provides only the auth context, and `(athlete)/(shell)/` adds the sidebar/tab chrome, so `/onboarding` gets the session without the chrome — the split the prototype achieved by keeping it out of `MainLayout`. `/` is now the athlete check-in; the step 6 redirect placeholder is deleted. Component markup moved close to verbatim; the substantive changes were all forced, and are listed in §4.1.
8. ~~Google Fonts `<link>` → `next/font/google`~~ — **done.** Inter / Instrument Serif / JetBrains Mono are self-hosted and bound to the Tailwind `--font-{sans,serif,mono}` tokens; Raleway is retained as `--font-admin` so the admin portal keeps the typeface it shipped with. Verified against a production server: four `woff2` files served from `/_next/static/media/`, zero requests to `fonts.googleapis.com` or `fonts.gstatic.com`, and both preconnects gone.
9. ~~Lift `src/data/*` registries and `lib/journeyMath.ts` into `lib/core/`.~~ — **done**, as `journey`, `actions`, `journey-math`, `paths`, `skills`, `checkin`, `personas`, `community`. `lib/core/actions.ts` is the TS source of truth for the fifteen habits (§6.5). The registries carry lucide icon *names* rather than components, matching what the backend already serialises, so `lib/core` stays importable from a Route Handler without dragging `lucide-react` into a server bundle; `components/athlete/icons.tsx` resolves a name to a glyph. `tests/core-registry.test.ts` parses `services/registry.py` and fails on any drift in the action, path, or phase registries — mutation-verified in both directions.
10. ~~Redeploy. `VITE_API_URL` → same-origin bridge configuration. **Delete
`web-prototype/`.**~~ — **directory deleted**; `/bridge` is the default client
base and `NEXT_PUBLIC_API_URL` remains only as a documented cross-origin local
escape hatch. The `tsconfig`/`eslint`/manifest-guard exclusions were removed,
and the brand favicon survives as `src/app/icon.svg`. **The redeploy itself
remains blocked on credential rotation** (§6.2), like the step 5 smoke
deployment.

### 4.1 What the athlete port could not carry over verbatim

Step 7 was billed as "component code moves nearly verbatim; the router is the
only real work." That held for markup. Everything below is a change the port
*forced* — recorded here because each one is a behavioural difference, not a
refactor, and reviewing the diff alone would not make them obvious.

| What | Why it could not move as-is |
|---|---|
| **Integer ids → UUID strings** | The prototype's `api.ts` typed every id as `number`, and the post page called `Number(postId)` on the route param. Against the §3.1 baseline those are `NaN` on every real id. All ids are strings now and the conversions are gone. |
| **`localStorage` at render time** | Vite only ever rendered in a browser. App Router client components *prerender on the server*, where `localStorage` does not exist — the auth context and both hooks would have thrown at build, and any signed-in athlete would have hydrated against signed-out HTML. State now starts at its signed-out default and storage is read in an effect. |
| **`navigate(path, { state })`** | react-router carried the artifact "Share to forum" draft in navigation state. `next/navigation` moves URLs only. The draft goes through `sessionStorage` (`lib/athlete/forum-draft.ts`), cleared on read, rather than a query string that would put a paragraph of body text into history and any shared link. |
| **`useSearchParams` needs a boundary** | `/game-plan` reads `?retake=1`, which opts its subtree into client rendering; it is wrapped in `<Suspense>` so the rest of the route still prerenders. The param is now cleared with `router.replace` after the intake opens, so a refresh cannot reopen it. |
| **Sign-out was local-only** | The prototype's `signOut` cleared `localStorage`. That makes a token unreachable from one browser, not invalid. It now calls `/auth/logout`, which bumps `auth_version` and kills the token everywhere — the revocation path added when the bridge was ported. |
| **`getTodaysPrompt()` read the clock at module scope** | Evaluated once during prerender and again on the client, it disagrees across any day boundary the build straddles. It takes the date as an argument now, and the check-in card only renders after mount. |
| **Effects that set state synchronously** | The React Compiler lint rules that ship with `eslint-config-next` 16 reject it, and they were right to: the profile page kept four form fields in an effect synced from `user`, which silently discarded whatever the athlete had typed if a background `/auth/me` refresh landed mid-edit. Edits are one nullable `form` object now, seeded when editing opens. Data fetches moved into cancellable async effects, which also closes the unmount race. |
| **404 loses the tab bar** | react-router matched `*` *inside* the layout. `app/not-found.tsx` is the root boundary and covers `/admin/*` too, so it cannot assume the athlete shell or its auth context. It is a self-contained page with a link home. |

Two dependencies came with the port: `clsx` (already used throughout the
prototype's markup) and `html-to-image` (the artifact PNG export). Both are
zero-dependency, so `npm audit --omit=dev` stays at 0.

Deliberately unchanged: these pages are still client components that fetch from
the browser, and athlete auth is still a client-held bearer token while the
admin uses a signed cookie. Converting data fetching to server components and
unifying the two auth mechanisms is its own step, alongside the Phase 2 Route
Handlers — doing it inside the router move would have made any bug ambiguous
between the two changes, against a backend that is about to be replaced anyway.

### Phase 2 — Migrate the backend (goal #2)

*Bridge first (§2.2), then port behind it — decided; see §7.1.*

11. **Bridge (deployment-gated):** once credentials are rotated and Vercel
Services access is confirmed, configure Next.js and FastAPI as Services in the
**existing single Vercel project**, with shared deployments/env and a
same-origin `/bridge/*` route to FastAPI. Use Neon's pooled `DATABASE_URL`,
run seed/migration work explicitly, and verify the bridge route plus production
startup guards before removing Render. **Delete `render.yaml`. Render bill →
$0**, and the 30-day free-Postgres deletion clock stops.
12. ~~Port `backend/app/services/{skills,journey,registry}.py` →
`lib/core/`.~~ — **done during Phase 1**, with registry parity tests and
DST-safe date-only journey math. Keep the Python parity tests until cutover.
13. Port the 7 route modules to Route Handlers under `app/api/`, one at a time, cutting traffic over per route while the Python bridge serves the rest. The API contract is fully specified by `src/lib/athlete/api.ts` (ported from the prototype's client at step 7, every endpoint typed) — that file is the porting checklist.
14. Gemini → Vercel AI Gateway. Keep `SAFETY_TEMPLATE` and `_summarize_adaptation` verbatim; **bump off the retired `gemini-1.5-flash`.**
15. Port the applicable behavior from the **current 99-case pytest suite** to
Vitest route by route. Bridge/schema-only Python checks retire with the bridge;
user-visible auth, moderation, validation, and API-contract behavior must have
TypeScript replacements. Do not retire a Python route until its replacement
passes.
16. Cut over the final route, then remove all FastAPI residue in one verified change: **`backend/`**, Python lock/requirements and build commands, Services entry/binding/route configuration, bridge-only env vars, include/exclude globs, health checks, generated caches, and any Vercel project framework/preset overrides. Rebuild and inspect the deployment manifest to prove the project is Next.js-only. **One project, one deployment, one language.**

**Local Phase 2 work may continue before step 11.** The athlete NUX now starts
at login, resumes incomplete accounts in onboarding, and removes fixture health,
journey, coaching, and forum content from fresh-user and backend-error states.
The Community surface also implements the proposal's university palettes and a
supportive heart-only feed against the existing forum API. These frontend
changes do not weaken the deployment gate: step 11 still requires credential
rotation, confirmed Services access, and the disposable Neon branch check.

### Phase 3 — Unify the data layer
17. Implement the §3.1 identity baseline: canonical users, provider identities/Firebase UID mapping, normalized emails, admin role assignments, revocable sessions/session version, and append-only admin audit logs.
18. Configure Auth.js Google + Apple against the existing provider projects/identities where compatible. Use signed/encrypted sessions, explicit active-role lookup for every admin request, `proxy.ts` for early gating, and audited privileged mutations (§6.7).
19. Add and test the Firebase ID-token compatibility bridge (§2.3), including issuer/audience/signature checks and deterministic mapping to canonical identities.
20. Repoint all 17 `adminDb` call sites at Drizzle and enforce `suspended` / `banned` / `chat_banned` in the application.
21. **Scripted Firestore → Postgres export — the CWRU pilot data is retained** (84 users, their check-ins, messages, support requests, and `completions`). Include the §6.4 email-leak scrub, provider/UID identity reconciliation, idempotent reruns, counts, checksums, and sampled record verification.
22. Freeze Firebase writes when reconciliation passes, but keep Firebase Auth/token validation for the released mobile version. Delete Firebase only after the replacement mobile adoption/compatibility gate in §2.3 is met.

### Phase 4 — Absorb the unserved capabilities
23. Vercel Cron: daily reminders, weekly action rollover, streak recompute.
24. Vercel Blob: profile photos.
25. Edge Config: `AUTO_VERIFY` and the verification-policy flags (`WEB_PROTOYPE_DEBRIEF.md` §16.2 Q1 is still open).
26. WAF rate limits on auth endpoints + `/clipboard/chat`.
27. Web Analytics + Speed Insights.

### Phase 5 — Mobile parity (goal #3, later)
28. Rebuild the Expo app against the Vercel Route Handlers and Auth.js-compatible Google/Apple identity flow. Move the client-side Gemini key server-side. EAS Build stays.
29. Release, measure adoption, enforce the minimum supported version, complete the rollback window, and only then execute the §2.3 Firebase retirement checklist.

---

## 5. Cost Comparison

| Line item | Today | After |
|---|---|---|
| Render web service | $0 free tier (50s cold starts) → **$7/mo** to be usable | **$0** — gone |
| Render Postgres | $0 for 30 days → **$7/mo** | **$0** — Neon free tier on Vercel Marketplace |
| Firebase Firestore | $0 Spark → Blaze usage-based as the pilot scales | Temporary overlap during mobile compatibility, then **$0** after the §2.3 gate |
| Appwrite | $0 free (pauses, breaks sign-in) | **$0** — gone |
| Vercel hosting (1 project) | n/a | **$20/mo** Pro (already held) |
| Gemini | usage-based | usage-based via AI Gateway ($5 free credit) |
| Blob / Cron / Edge Config / Analytics / WAF | n/a | included |
| Apple Developer + EAS | $99/yr | unchanged |

**Final vendor count after the mobile compatibility window: 5 → 2** (Vercel + Apple/EAS), with Google as an identity/AI provider and metered AI behind the Gateway.

**Pro is already held**, which settles the licensing question — Hobby's license prohibits commercial use, and the $7,500/yr Team License in `FEATURE_ANALYSIS.md` §6.3 is unambiguously commercial. Pro also unlocks the WAF rules (§1.5 #20) and longer function durations, both assumed by this plan.

The Vercel CLI/MCP is authenticated to the **LingIQ Pro team**, and the linked project now has an explicit Next.js framework preset. Re-check scope before any destructive or production command.

---

## 6. Issues This Migration Must Fix

These are pre-existing defects that the migration touches directly. Flagging rather than silently carrying them forward.

### 6.1 Admin session cookie was forgeable — **critical, fixed locally**
The original `src/lib/auth.ts` returned true when the cookie `admin_session`
literally equaled `"authenticated"`. The value was not signed, encrypted, or
derived from a secret, so anyone could set it and reach the operator portal.
All seven mutation routes applied that same ineffective check.

**Phase 0 status:** implemented and tested locally. Authentication now fails
closed if either secret is absent/weak, uses constant-time password comparison,
and issues an eight-hour HMAC-signed `HttpOnly; SameSite=Strict` session.
`proxy.ts` performs early page gating, while the dashboard layout and every
privileged Route Handler retain authoritative verification. The legacy constant
cookie is ignored and cleared. The fix is committed on the local branch and
must still be configured and verified in a protected smoke deployment before
Step 5 can close. The shared password remains a temporary bootstrap secret only.

**Final fix before real data/go-live:** Auth.js with Google and Apple, explicit database-backed admin roles/allowlist, revocable signed/encrypted sessions, and append-only audit logs (§6.7). No provider sign-in grants admin rights automatically.

### 6.2 Credentials committed to the repo
`third-and-manageable-admin-main/env.example` contained a **real** admin password, a real service-account email, and a key-shaped value. `FEATURE_ANALYSIS.md` §5.2 re-published the same password in prose.

**Status: sanitized before the initial commit** — both files now hold placeholders, so nothing sensitive entered git history. `backend/.env` held only a placeholder JWT secret and an empty Gemini key, and is gitignored regardless.

⚠️ **Still required of you, outside the repo:** the exposed values were live before sanitization and must be **rotated at the source** — change the admin password, and revoke + reissue the Firebase service-account key in the Firebase Console. Sanitizing the file does not invalidate a credential that already leaked.

### 6.3 Moderation flags are decorative — **fixed in the bridge**
Per §3 — `suspended` / `banned` / `chat_banned` were written by the admin portal and read by nothing, so banning a user did nothing at all.

`get_current_user` now returns 403 for a `banned` or `suspended` account on every authenticated request *and* at login, so an already-issued token cannot outlive the ban; `require_verified` additionally blocks `chat_banned` from Community while leaving the rest of the app reachable. Covered by `backend/tests/test_bridge_compat.py`. Re-verify when the routes are ported to TypeScript in Phase 2 step 13 — this enforcement has to survive the port, not be reintroduced after it.

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

**Status: done in both runtimes.** `backend/app/services/registry.py` defines the
fifteen categorized habits and `category_for_action`;
`/game-plan/actions/toggle` rejects any id outside the taxonomy and writes
`action_completions.category`. `lib/core/actions.ts` is now the TypeScript
source of truth for pages and future Route Handlers, and
`tests/core-registry.test.ts` fails if its ids, categories, kinds, or labels
drift from the bridge.

This does tension against `REDESIGN_BRIEF`'s "keep it simple — one action, one mindset prompt, one habit." Fifteen actions is the data model; the UI can still surface one at a time. Worth revisiting as a UI question later, but it does not change the schema.

### 6.6 Retired model
`gemini-1.5-flash` (`services/gemini.py:102`) is retired. The safe-fallback path means this fails silently into canned responses rather than erroring — worth checking whether production is currently serving real AI at all.

### 6.7 OAuth identity is not authorization

Google OIDC and Sign in with Apple prove control of a provider identity; they do not implement the application's authorization or audit requirements.

- Auth.js handles provider callbacks and signed/encrypted sessions. Validate exact issuer/audience/client, state, nonce, PKCE, expiry, and verified-email semantics; keep OAuth access/refresh tokens server-side and request only minimal scopes.
- `auth_identities(provider, provider_account_id)` is the durable identity key. Keep Firebase UID mappings during the compatibility window. Never auto-link Google, Apple, password, or Firebase identities by email alone.
- Admin access is deny-by-default. An authenticated user needs an active `admin_role_assignment`; role changes and account suspension must take effect without waiting seven days for a stale token.
- `proxy.ts` may redirect obvious anonymous requests, but privileged data access and every mutation perform server-side session + role checks.
- Every privileged mutation writes an append-only audit event in the same transaction where practical: actor identity/role, action, target, outcome, request ID, timestamp, and redacted before/after metadata. Never place passwords, provider tokens, session tokens, raw journal/health text, or unnecessary PHI in the log.

### 6.8 HIPAA/BAA go-live gate

Purchase the Vercel HIPAA add-on and complete/file the BAA before any live Vercel workload handles PHI. The BAA is one control in a shared-responsibility program, not a blanket compliance result. Before go-live:

- Confirm every service that stores/transmits PHI is covered by an appropriate agreement and configuration, including Neon, logging/observability, AI providers/gateway, email/push, backups, and support tooling.
- Complete a data-flow inventory, risk assessment, minimum-necessary review, retention/deletion policy, incident-response plan, access review, workforce/admin access controls, and audit-log retention/monitoring.
- Prevent PHI from entering build logs, deployment manifests, analytics, error traces, AI prompts, preview deployments, or support channels without an approved purpose and safeguard.
- Use least-privilege production roles, separate preview/test data, encrypted transport/storage, credential rotation, MFA for operators, recovery tests, and documented breach/escalation procedures.
- Treat previews and disposable database branches as synthetic-data-only unless they are explicitly included in the compliance boundary.

---

## 7. Open Scoping Questions

Answers change the plan; everything above is written to be true regardless.

1. ~~**Backend strategy**~~ — **resolved: bridge then port.** Deploy FastAPI to Vercel's Python runtime first (Render dies immediately, stopping the 30-day Postgres deletion clock and the ~50s cold starts), then port to TypeScript route-by-route behind it. Cost of the hedge is configuring the deploy twice; benefit is nothing is ever down and the pilot keeps running.

1b. ~~**Weekly-action taxonomy**~~ — **resolved: fifteen categorized habits.** The admin's taxonomy wins; the backend's `a1`–`a4` is rewritten to match. See §6.5.
2. ~~**Firestore live data**~~ — **resolved: retain.** The CWRU pilot data must survive. Phase 3 includes a scripted Firestore → Postgres export, and §6.4's email-leak scrub is mandatory, not optional.
3. ~~**Repo shape**~~ — **resolved: one Next.js app, one Vercel project, no monorepo.** `web-prototype` was a design spike built in a vacuum, not a parallel product, so there is nothing to merge — its screens and registries get rebuilt on the admin's Next.js foundation. Rationale in §2.0.
4. ~~**Vercel plan**~~ — **resolved: Pro.** The CLI/MCP account is on the LingIQ team. The HIPAA add-on and BAA remain a separate, mandatory go-live gate (§6.8).
5. **Verification policy** (`WEB_PROTOYPE_DEBRIEF.md` §16.2 Q1, still open) — roster DB, `.edu` allow-list, or manual review? The gate and tests exist; the policy decides whether Phase 4's Edge Config flag is a stopgap or the mechanism.

---

## 8. Item-by-Item Summary

| Dependency | Verdict |
|---|---|
| Render web service | ✅ Migrate — Vercel Functions |
| Render Postgres | ✅ Migrate — Neon (Vercel Marketplace) |
| Firestore | ⏸️ Migrate into Postgres, then retain read/compatibility window until mobile cutover |
| Firebase Admin SDK | ⏸️ Retain only for migration/token compatibility; remove at §2.3 gate |
| Firebase Auth | ⏸️ Preserve Google/Apple account continuity; bridge old tokens; retire after mobile adoption |
| Appwrite | ✅ Delete — already broken |
| Firebase Storage (photos) | ✅ Migrate — Vercel Blob |
| Backend JWT auth | ✅ Replace with Auth.js-compatible signed sessions/tokens and provider identity mapping |
| Admin password auth | ⚠️ Secure bootstrap immediately; final Auth.js + role allowlist + audit logs — §6.1/§6.7 |
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
