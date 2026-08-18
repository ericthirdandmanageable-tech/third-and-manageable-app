# Third & Manageable current execution plan

Last reconciled: 2026-08-18

This is the current plan after comparing the last two weeks of Git history and
working-tree state with `VERCEL_MIGRATION_PLAN.md`, the Expo worktree's
`MERGE_PLAN.md`, `CROSS_REPO_PARITY_LEDGER.md`, and `repo_differences.md`.
`repo_differences.md` remains preserved source material.

## Where the plans stand

| Plan area | Actual state | Decision |
| --- | --- | --- |
| Vercel phases 0–2 | Complete: one Next.js app, Route Handlers, protected Preview, admin and athlete surfaces | Keep the historical detail, but do not re-run the retired FastAPI/Neon work |
| Vercel phase 3 | Its Neon/Auth.js destination is superseded | Appwrite Auth + Appwrite UID + Firestore is implemented and authoritative; no Neon dual-write or data export is planned |
| Vercel phase 4 | Mixed | Profile images moved to Appwrite Storage. Cron reminders, product analytics, error monitoring, and final WAF/rate-limit evidence remain open |
| Vercel phase 5 | Implemented in the replacement Expo worktree | All five mobile product domains use the authenticated Next.js API; Gemini is server-side. Build 11 passed physical-device authentication and recovery checks |
| Expo completed slice | Implemented and compiled as EAS Preview build 11 | Preserve the separate Expo history and existing App Store bundle/signing lineage |
| Expo next slices | Not complete | Accessibility QA, push delivery, profile upload, polling, the community-model decision, and old-client retirement evidence remain release gates |

## Repository reality

- `3rd_and_manageable` is the canonical web/API/admin history. `main` contains
  the backend convergence, original production onboarding, and profile
  university selector work through 2026-08-16.
- `third-and-manageable-app` is the canonical native history. The replacement
  worktree is `codex/unified-liquid-glass`; its convergence and direct-ingress
  commits are pushed to the remote branch.
- The planned source-control consolidation keeps Expo at the canonical mobile
  repository root and imports the web history under `web/`. Vercel and EAS keep
  separate deploy roots. Complete the audited gates in the mobile
  `MERGE_PLAN.md` before importing either history.
- The temporary `third-and-manageable-staging-relay` is retired. Its Vercel
  project was deleted after build 11 passed physical authentication and
  recovery checks. Clean checkpoint `edcd19d5aba4` remains recoverable from the
  macOS Trash until the Trash is emptied.
- The original admin export had no unique application code to recover. Its
  clean read-only checkpoint `0b6d21d79707` was moved to the macOS Trash on
  2026-08-18.

On 2026-08-18, the project disabled Vercel Authentication and created a distinct
`staging` branch. Its stable Preview alias uses only Preview-scoped staging
credentials and passed the complete direct mobile-stack smoke. `main` remains
the Vercel Production branch and cannot use staging credentials because the
runtime guard fails closed. See `DIRECT_STAGING_CUTOVER.md`.

## Product delivery sequence

### Slice 1 — production web parity (in progress)

Port proven production-app experiences before inventing net-new features:

- [x] Original four-step onboarding on the web.
- [x] Shared searchable university selection in onboarding and Profile.
- [x] Notifications center backed by `/api/notifications`, including mark-one,
  mark-all, and destination routing.
- [x] Twelve production Perks using exact server-backed check-in, completion,
  and streak counters.
- [x] Public Privacy and Terms pages using the production app's legal copy.
- [x] Profile account deletion with an explicit destructive confirmation and
  the existing server-owned `/api/account` cleanup.
- [ ] Add browser navigation coverage for the whole authenticated web shell,
  including the newly restored destinations.
- [x] Deploy and smoke the direct-ingress commit in Vercel Preview.
- [x] Use the distinct `staging` Git branch for staging Preview deployments;
  keep `main` as the guarded Vercel Production branch.

### Slice 2 — production community behavior

- Decide whether the richer career forums complement or replace legacy rooms.
- Preserve one owner per write; do not dual-write forum and room models.
- Bring report, block, mention, and support actions to equivalent web UI where
  the Route Handlers already exist.
- Prove admin moderation sees and acts on the same staging records created by
  both clients.

### Slice 3 — reminders, push, and operational proof

- Prove APNs → Expo → app delivery on a registered physical device, including
  invalid-token cleanup and deep links.
- Implement server-owned reminder scheduling only after the timezone and
  opt-in contract is fixed; do not pretend browser and native notification
  permissions are interchangeable.
- Add crash/error monitoring, uptime alerts, and a support escalation owner
  before TestFlight promotion.

### Slice 4 — native release qualification

- [x] Build and launch a standalone iOS Simulator artifact without Metro.
- [x] Include both registered iPhones in the ad hoc provisioning profile and
  inspect the signed build 11 IPA.
- [x] Pass physical-device email, recovery, Apple, and Google authentication
  checks.
- Run VoiceOver, Dynamic Type, Reduce Motion/Transparency, contrast,
  low-memory, deletion, upload, polling, and Android checks.
- [x] Build from the pushed direct-ingress mobile branch after updating the
  Appwrite Web platform hostname.

### Slice 5 — controlled production cutover

- Keep production Appwrite/Firebase projects untouched until staging device
  gates pass.
- Reconcile App Store privacy/support/legal metadata and credential custody.
- Promote through the existing App Store record and bundle identifier with a
  documented rollback window.
- Retire Firebase custom-token compatibility only after supported-version
  telemetry proves older clients are outside that window.

## Explicitly deferred

- Neon remains a potential future relational/analytics option only.
- Apple Health, Strava, Terra, private circles, mentor matching, and
  monetization remain product decisions, not implied migration work.
- Synthetic staging-account cleanup is destructive and stays manual until its
  exact targets are explicitly confirmed.
