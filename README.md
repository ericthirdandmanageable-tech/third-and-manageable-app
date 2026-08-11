# Third & Manageable

Third & Manageable is a transition platform for current and former
student-athletes. The Next.js app serves the athlete product at `/` and the
operator portal at `/admin`. The runtime is now one Next.js application on
Vercel; the temporary FastAPI bridge was retired after the Route Handler cutover.

## Architecture

- Next.js 16 App Router and React 19
- Drizzle ORM with Neon Postgres
- Athlete UI under `src/app/(athlete)`
- Signed bootstrap admin sessions and gated admin routes under `src/app/admin`
- Athlete and mobile APIs under `src/app/api/`
- Shared product rules and registries under `src/lib/core`
- Clipboard coaching through Vercel AI Gateway, with a deterministic offline fallback

The browser calls same-origin `/api/*` Route Handlers. There is no cross-origin
API base, Python process, service rewrite, or local proxy.

## Athlete experience

The public athlete entry point is `/login`. A new account continues into
`/onboarding`; returning accounts with an incomplete intake resume there, while
completed accounts continue to the requested authenticated route.

Fresh accounts start from an honest empty state: journey day 1, streak 0, one
current community member, and zero conversations or connected training-data
sources. Community posts and coaching analysis are never replaced with demo
content when the API is unavailable. Apple Health is identified as requiring
the future iPhone app, and Strava remains visibly disconnected until its OAuth
flow is implemented.

The Community surface uses the university recorded during registration to apply
the proposal palettes for Cleveland State, Case Western Reserve, and Bowling
Green State. Unknown or unconfigured schools use the neutral Third & Manageable
navy-and-gold palette instead of a guessed trademark palette.

## Local development

Requirements: Node.js 22+ and npm.
The isolated Firestore emulator tests additionally require Java 21.

Install dependencies:

```bash
npm install
npm install --prefix firebase-emulator
cp env.example .env.local
```

Start Next.js from the repository root:

```bash
npm run dev
```

Open [http://localhost:3000/login](http://localhost:3000/login). The admin login is at
[http://localhost:3000/admin/login](http://localhost:3000/admin/login).
Development may set `AUTO_VERIFY=true` in `.env.local`; production and preview
deployments intentionally refuse that setting. Pull the linked Vercel
development environment when exercising Neon-backed routes locally.

## Verification

```bash
npm test
npm run test:firestore-rules
npx tsc --noEmit
npm run lint
npm run build
npx drizzle-kit check
npm run check:audit
npm run check:vercel-manifest
npm run db:test:athlete-api
```

## Deployment status

Phases 1 and 2 of the consolidation are complete: the athlete surface and all
legacy API behavior run in the root Next.js app, the Python bridge is gone, and
the Vercel deployment manifest is Next.js-only. Production data migration,
provider cutover, mobile adoption, and compliance gates remain tracked in
[VERCEL_MIGRATION_PLAN.md](VERCEL_MIGRATION_PLAN.md).

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
Appwrite/Firebase identity transaction have passed mocked, disposable-Neon, and
protected staging smoke tests. Preserve Appwrite platforms according to
[APPWRITE_PLATFORM_INVENTORY.md](APPWRITE_PLATFORM_INVENTORY.md). The local-only
Rules harness and its compatibility notes are in
[firebase-emulator/README.md](firebase-emulator/README.md). Apple Developer,
App Store Connect, signing, APNs, TestFlight, roles, and Sign in with Apple state
are captured in
[third-and-manageable-apple-inventory-2026-08-05.md](third-and-manageable-apple-inventory-2026-08-05.md).
