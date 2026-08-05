# Third & Manageable

Third & Manageable is a transition platform for current and former
student-athletes. The Next.js app serves the athlete product at `/` and the
operator portal at `/admin`; the temporary FastAPI bridge is being replaced
route by route during the Vercel migration.

## Architecture

- Next.js 16 App Router and React 19
- Drizzle ORM with Neon Postgres
- Athlete UI under `src/app/(athlete)`
- Signed bootstrap admin sessions and gated admin routes under `src/app/admin`
- Temporary FastAPI bridge under `backend/`
- Shared product rules and registries under `src/lib/core`

The browser calls the bridge through the same-origin `/bridge/*` prefix.
`next.config.ts` proxies it to `http://127.0.0.1:8001` during development.
Phase 2 step 11 adds the equivalent Vercel Services route; the bridge disappears
after the final Next.js Route Handler is ported.

## Athlete experience

The public athlete entry point is `/login`. A new account continues into
`/onboarding`; returning accounts with an incomplete intake resume there, while
completed accounts continue to the requested authenticated route.

Fresh accounts start from an honest empty state: journey day 1, streak 0, one
current community member, and zero conversations or connected training-data
sources. Community posts and coaching analysis are never replaced with demo
content when the bridge is unavailable. Apple Health is identified as requiring
the future iPhone app, and Strava remains visibly disconnected until its OAuth
flow is implemented.

The Community surface uses the university recorded during registration to apply
the proposal palettes for Cleveland State, Case Western Reserve, and Bowling
Green State. Unknown or unconfigured schools use the neutral Third & Manageable
navy-and-gold palette instead of a guessed trademark palette.

## Local development

Requirements: Node.js 22+, npm, Python 3.12, and a Python virtual environment.
The isolated Firestore emulator tests additionally require Java 21.

Install dependencies:

```bash
npm install
npm install --prefix firebase-emulator
python3 -m venv backend/.venv
backend/.venv/bin/pip install -r backend/requirements.txt
cp env.example .env.local
cp backend/.env.example backend/.env
```

Start FastAPI from `backend/`:

```bash
cd backend
.venv/bin/uvicorn app.main:app --reload --port 8001
```

Then start Next.js from the repository root:

```bash
npm run dev
```

Open [http://localhost:3000/login](http://localhost:3000/login). The admin login is at
[http://localhost:3000/admin/login](http://localhost:3000/admin/login).
Development may set `AUTO_VERIFY=true` in `backend/.env`; production and preview
deployments intentionally refuse that setting.

## Verification

```bash
npm test
npm run test:firestore-rules
npx tsc --noEmit
npm run lint
npm run build
(cd backend && .venv/bin/pytest)
npx drizzle-kit check
npm run check:audit
npm run check:vercel-manifest
```

## Deployment status

Phase 1 of the consolidation is complete locally. Phase 2 route-porting work can
continue, but step 11 deployment is intentionally gated on credential rotation,
confirmed Vercel Services access, the disposable Neon branch check, and the
go-live controls in [VERCEL_MIGRATION_PLAN.md](VERCEL_MIGRATION_PLAN.md).

Do not deploy with placeholder credentials or restore the previously exposed
Firebase/admin values. See the migration plan for the authoritative sequence,
data-retention requirements, and HIPAA/BAA gate.

The shipped Expo source and EAS build provenance are now recovered. Production
identity is Appwrite; Firebase Auth is not configured, and the released client
depends on currently open Firestore Rules. Follow
[FIREBASE_SAFE_HANDOFF.md](FIREBASE_SAFE_HANDOFF.md) and
[APPWRITE_FIREBASE_BRIDGE_DESIGN.md](APPWRITE_FIREBASE_BRIDGE_DESIGN.md) before
connecting a new client, adding server credentials, changing Rules, or preparing
an App Store replacement. The local-only
`POST /api/mobile/auth/firebase-token` implementation and canonical
Appwrite/Firebase identity transaction use mocked tests and have not contacted a
live database or changed either provider. Preserve Appwrite platforms according to
[APPWRITE_PLATFORM_INVENTORY.md](APPWRITE_PLATFORM_INVENTORY.md). The local-only
Rules harness and its compatibility notes are in
[firebase-emulator/README.md](firebase-emulator/README.md). Apple Developer,
App Store Connect, signing, APNs, TestFlight, roles, and Sign in with Apple state
are captured in
[third-and-manageable-apple-inventory-2026-08-05.md](third-and-manageable-apple-inventory-2026-08-05.md).
