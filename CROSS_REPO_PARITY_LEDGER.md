# Third & Manageable cross-repo parity ledger

Last reconciled: 2026-08-14

This is the progress record for the ground-up web redesign, the replacement
Expo client, and the public staging relay. Repository histories and worktrees
remain separate. `repo_differences.md` is source material and is not edited by
this migration.

## Current source-of-truth map

| Surface | Location | Responsibility | State |
| --- | --- | --- | --- |
| Web/API/admin | `3rd_and_manageable` | Canonical authenticated API, Firestore ownership, protected Vercel Preview, web/admin UI | Active working copy; latest verified Preview is `third-and-manageable-51vcoiuwe-ling-iq.vercel.app` |
| Replacement native app | `third-and-manageable-unified-liquid-glass` | Expo Router UI, EAS/TestFlight lineage, device integrations | Active isolated worktree; not merged or pushed by this session |
| Canonical native repo | `third-and-manageable-app` | Existing app history and App Store lineage | Kept separate; no direct edits in this slice |
| Staging relay | `third-and-manageable-staging-relay` | Public JWT-authenticated, path-restricted ingress to protected Preview | Deployed at `third-and-manageable-mobile-staging.vercel.app` |

## UI reachability restoration

Automated navigation checks now prove the replacement app retains all required
destinations and controls:

| Flow | Restored connection |
| --- | --- |
| Profile/settings/account deletion | Permanent labeled avatar in the Home header; hidden Profile route remains registered; account deletion calls the server-owned deletion endpoint |
| Notifications | Home header entry; list, mark-one, and mark-all routes use the authenticated API |
| Progress, Perks, Support, Terms, Privacy | Profile/Home navigation entries remain reachable |
| Check-in and Clipboard history | Existing history modes remain reachable and now read canonical server history |
| Community reporting/blocking/support | Long-press actions and support modal remain; identity and report fields are server-derived |
| Career intake/path/commitment/back | Intake modal, path detail, commitment API, and `router.back()` are covered |
| Five primary tabs | Home, Team, Check-in, Plan, Coach; Profile is a first-class header control instead of a sixth tab |

Evidence: `tests/navigation-reachability.test.ts`, 6 navigation assertions;
the full mobile suite has 36 passing tests.

## Product-domain convergence

| Domain | New-client contract | Canonical owner | Old-client compatibility | Status |
| --- | --- | --- | --- | --- |
| Profile / identity / deletion | `/profile`, `/account` with fresh Appwrite JWT | Appwrite UID + Firestore `profiles`; server deletes product data, Firebase compatibility identity, optional image, then Appwrite user | Existing Firebase custom-token bridge and Rules remain for released clients | **Converged** |
| Check-ins / Clipboard | `/check-ins*`, `/clipboard/chat`, `/clipboard/history` | Server transaction owns daily uniqueness/streak; server AI owns Gemini; Firestore keeps legacy-compatible fields | Old clients can read the same collections/field superset | **Converged** |
| Career plan / commitments | `/profile/intake`, `/game-plan*` | Firestore profile intake, completions, commitment; shared deterministic registries | Existing collection names and profile fields retained | **Converged** |
| Community / moderation / support | `/community/rooms`, `/messages`, `/reports`, `/blocks`, `/users*`, `/support/*` | Server derives author/reporter/blocking identity; Firestore room/message/safety collections | Older Firestore realtime clients see the same records; new client polls authenticated API | **Converged for legacy room model**; richer web forums intentionally remain separate |
| Notifications / artifacts | `/notifications*`, `/artifacts*` | Owning server actions emit notifications; server owns push tokens and the Appwrite Storage profile-image bucket | Same notifications/push-token/profile fields remain readable to old clients | **Converged** |

The replacement client has no Firestore or Firebase Storage product import.
Firebase client code remains only for custom-token authentication compatibility.
The Gemini SDK/key was removed from the Expo bundle.

## Migration-control contract

No domain uses Firestore/Neon dual writes. Because the canonical store remains
the existing Firestore project and collection names, these slices are an
ownership migration rather than a data-copy migration:

| Control | Required behavior |
| --- | --- |
| Backfill | None for existing Firestore records. Server serializers supply defaults for legacy field variants (`journal`/`note`, mood/option, old profile fields). |
| Reconciliation | Appwrite `$id` must equal every `user_id`/profile document owner. Live smoke asserts the Appwrite/Firebase UID match and profile round-trip. |
| Ownership | Only authenticated Route Handlers create new-client product writes. Notifications are emitted by the owning check-in, game-plan, and community routes. |
| Rollback | Keep the legacy field superset and strict Firestore Rules while older binaries exist. Roll back the replacement build/relay target, not by adding a second write path. |
| Old clients | Firebase custom tokens and Rules remain temporarily. Remove them only after supported-version telemetry shows old clients are retired. |
| Cutover evidence | Unit/contract gates plus the protected web smoke and public relay mobile smoke must pass on the exact deployments being promoted. |

## Validation snapshot

| Surface | Automated | Live |
| --- | --- | --- |
| Web/API/admin | ESLint clean; 22 files / 169 tests pass; Next.js production build passes | Protected Preview smoke passes registration, onboarding, check-in, game plan, six admin views, Appwrite Storage upload, and image/account cleanup |
| Replacement mobile | TypeScript clean; ESLint clean; 36 tests pass; local and EAS Preview environment guards pass | Relay smoke passes identity, Firebase compatibility, profile, game plan, notifications, artifacts, community, and cleanup. Multipart relay forwarding is contract-tested and the upstream upload is live-proven; the expanded end-to-end rerun is deferred after Appwrite synthetic-account rate limiting. EAS iOS internal Preview `cab31413-a4d7-484a-bbd9-401111434756` compiled successfully; packaged-JS inspection confirms staging IDs/full relay path and no production Appwrite ID or Gemini key. |
| Staging relay | 8 Node tests pass, including nested rewrite, allowlist, bearer bounds, JSON/query, and multipart forwarding | Production alias deployed and verified against latest protected Preview |

## Remaining release work

1. Run on-device accessibility and screen-by-screen QA, including community
   polling behavior, push permission flows, profile-image size/type failures,
   OAuth, password recovery, and legal/support links.
2. Install finished EAS iOS Preview build
   `cab31413-a4d7-484a-bbd9-401111434756` on the registered device and complete
   the on-device checks above. It uses the production bundle identifier, so it
   may replace another installed build of the app on that device.
3. Re-run App Store privacy metadata/review-account checks before any external
   TestFlight or App Review submission.
4. Manually remove the at least seven visible synthetic Appwrite staging accounts
   after explicit destructive-action confirmation.
5. Keep Neon documented only as a future relational/analytics option. Any
   future proposal needs source-of-truth, backfill, reconciliation, rollback,
   and compatibility plans before code or credentials are restored.
