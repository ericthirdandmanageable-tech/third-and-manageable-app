# Third & Manageable

Third & Manageable is a transition platform for current and former
student-athletes. This repository is the ground-up Next.js redesign and Vercel
Preview surface. The Expo/iOS repository remains separate and preserves the
production EAS, TestFlight, App Store, Appwrite, and Firebase lineage.

## Architecture

- Next.js 16 App Router and React 19
- Appwrite Auth with Secure HttpOnly web sessions
- Firebase Firestore product data, keyed by Appwrite UID
- Athlete UI under `src/app/(athlete)`
- Signed bootstrap admin sessions and gated admin routes under `src/app/admin`
- Same-origin APIs under `src/app/api`
- Clipboard coaching through Vercel AI Gateway

The redesign uses only the isolated staging Appwrite/Firebase projects. Runtime
guards prevent a Vercel Preview from inheriting production mobile credentials
and prevent a Production deployment from publishing against staging.

Read [STACK_ARCHITECTURE.md](STACK_ARCHITECTURE.md) before changing providers,
credentials, identity, Firestore collections, or repository boundaries.
The reconciled delivery order and current cross-worktree risks are in
[CURRENT_EXECUTION_PLAN.md](CURRENT_EXECUTION_PLAN.md).
The relay retirement gates and rollback path are in
[DIRECT_STAGING_CUTOVER.md](DIRECT_STAGING_CUTOVER.md).

## Local development

Requirements: Node.js 22+, npm, and Java 21 for the Firestore emulator suite.

```bash
npm install
npm install --prefix firebase-emulator
cp env.example .env.local
npm run dev
```

Open [http://localhost:3000/login](http://localhost:3000/login). The admin login
is at [http://localhost:3000/admin/login](http://localhost:3000/admin/login).

Athlete password recovery is available at `/forgot-password` and uses Appwrite's
recovery email flow. Add each deployed web origin as a platform in the staging
Appwrite project. Vercel deployments use `VERCEL_URL` automatically; set
`APP_PUBLIC_URL` when a stable public origin should be used in recovery links.

Local Firestore access should use emulators or a staging-only service account.
Vercel Preview uses keyless Google Workload Identity. Never place production
Appwrite/Firebase credentials or a Firebase private key in this repository.

## Verification

```bash
npm test
npm run test:firestore-rules
npx tsc --noEmit
npm run lint
npm run build
npm run check:audit
npm run check:vercel-manifest
```

After deploying a Preview:

```bash
npm run smoke:preview -- https://<preview-url>
```

## Deployment status

Neon is no longer part of this app. The Vercel project is disconnected from its
Neon resource, all database variables and runtime dependencies are removed, and
the resource is retained only as a documented future option.

The staging Appwrite API key, Google Workload Identity roles, Appwrite Storage
bucket, and Preview-only admin secrets are configured. Vercel Authentication is
disabled; application-level Appwrite and admin checks remain authoritative.
The direct `staging` branch Preview at
`third-and-manageable-git-staging-ling-iq.vercel.app` passed the complete
Appwrite-JWT mobile product-stack smoke on 2026-08-18. Production provider
projects and variables were not changed.

Mobile/App Store constraints remain documented in
[FIREBASE_SAFE_HANDOFF.md](FIREBASE_SAFE_HANDOFF.md),
[APPWRITE_PLATFORM_INVENTORY.md](APPWRITE_PLATFORM_INVENTORY.md), and
[third-and-manageable-apple-inventory-2026-08-05.md](third-and-manageable-apple-inventory-2026-08-05.md).
