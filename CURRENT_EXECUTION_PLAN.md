# Third & Manageable current execution plan

Last reconciled: 2026-08-17

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
| Vercel phase 5 | Mostly implemented in the replacement Expo worktree | All five mobile product domains use the authenticated Next.js API; Gemini is server-side. Physical-device/release proof is still open |
| Expo completed slice | Implemented and compiled as EAS Preview build 11 | Preserve the separate Expo history and existing App Store bundle/signing lineage |
| Expo next slices | Not complete | Accessibility/device QA, push delivery, OAuth/recovery, profile upload, polling, community-model decision, and old-client retirement evidence remain release gates |

## Repository reality

- `3rd_and_manageable` is the canonical web/API/admin history. `main` contains
  the backend convergence, original production onboarding, and profile
  university selector work through 2026-08-16.
- `third-and-manageable-app` is the canonical native history. The replacement
  worktree is `codex/unified-liquid-glass`, currently one committed change ahead
  of its remote plus an uncommitted authenticated-product-API migration.
- `third-and-manageable-staging-relay` is versioned, but its current nested data
  forwarding and tests are still uncommitted.
- The original admin export has no unique application code to recover.

Live Vercel reconciliation on 2026-08-17 found that `main` currently deploys
to Vercel's **Production target**, not its Preview target. Commit `2721949`
(`uni picker profile`) is Ready there. This is still a protected technical
surface: Standard Protection requires a LingIQ Vercel login, protected
sourcemaps are enabled, and the staging relay has the existing automation
bypass. It is not equivalent to a public production launch. Vercel was also
showing an active GitHub automatic-deployment outage during this check.

Before the public launch, explicitly decide whether to keep a protected
Production-target technical environment or change the Git production branch
so normal `main` work produces Preview deployments. Do not let the target label
silently determine which provider credentials or compliance boundary apply.

The immediate source-preservation gate is to review, commit, and push the
mobile and relay work in their own histories. Do not copy those repositories
into this Next.js repository.

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
- [ ] Deploy and smoke the exact parity commit in protected Vercel Preview.
- [ ] Resolve the Vercel target convention above and document the chosen
  production branch before relying on automatic Git deployments.

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

- Build a separate iOS Simulator artifact; the current internal Preview IPA is
  explicitly a physical-device build and cannot install in Simulator.
- Confirm the personal iPhone UDID is present in the ad-hoc provisioning
  profile, regenerate only the staging profile if needed, then rebuild.
- Run VoiceOver, Dynamic Type, Reduce Motion/Transparency, contrast,
  low-memory, OAuth, recovery, deletion, upload, polling, and Android checks.
- Commit and push the mobile and relay changes before making a new build.

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
