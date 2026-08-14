# Third & Manageable cross-repo parity ledger

Last reconciled: 2026-08-14

This is the single parity record for the supported web/admin product, the
replacement mobile client, the staging relay, and the archived client-admin
export. Update a row in the same change that alters a screen, action, storage
contract, API, admin surface, or validation status.

## Source-of-truth map

| Surface | Location and branch | Role | Current state |
| --- | --- | --- | --- |
| Web athlete app, API, and supported admin | `lucascardoso1/3rd_and_manageable`, `UI-redesign` | Canonical API, Neon schema, admin, and web Liquid Glass implementation | Active; branch is pushed at `71bc47e` before this ledger update |
| Replacement mobile client | `ericthirdandmanageable-tech/third-and-manageable-app`, `codex/unified-liquid-glass` | Canonical mobile Liquid Glass client | Active; QA pass pushed at `b498ed8` |
| Old mobile-main prototype | Same repository, `archive/mobile-main-prototype-2026-08-14` | Historical comparison only | Frozen and pushed at `4e40c27`; do not develop here |
| Public staging auth relay | Local `third-and-manageable-staging-relay` | Path-restricted proxy for the protected Preview auth bridge | Versioned locally at `fdb5dec`; three tests pass; remote creation is blocked by organization permissions |
| Client admin export | Local `third-and-manageable-admin-main` | Historical Firestore visibility reference only | Read-only by code and documentation; never deploy or use for writes |

## Status vocabulary

- **Parity**: mobile and web use the same user-visible contract and canonical
  server/storage semantics.
- **Compatible bridge**: intentionally temporary Appwrite/Firebase behavior
  feeds the canonical identity boundary, but storage has not fully cut over.
- **Gap**: behavior or persistence differs and needs an explicit migration.
- **Static/local**: no server parity is required unless the product decision
  changes.

## Athlete screen and action parity

| Screen / route | User action | Replacement mobile storage / API | Canonical web storage / API | Admin visibility | Status and test evidence |
| --- | --- | --- | --- | --- | --- |
| Welcome | Advance onboarding slides; open sign-in or registration | Local component state only | Web begins at `/login`; no equivalent slides | None | **Static/local.** Mobile layout is covered indirectly by lint/typecheck; no interaction test |
| Privacy / Terms | Read legal copy; open linked policy destinations | Bundled screens and public URLs | Linked destinations from web/profile | None | **Static/local.** Manual content review required |
| Login | Email/password login; Google or Apple login | Appwrite Account; `/api/mobile/auth/firebase-token` through the staging relay; Firebase Auth session | `POST /api/auth/login`; Neon `users`, `user_emails`, `password_credentials`, `sessions` | User identity becomes visible in supported Neon admin only after canonical mapping/cutover | **Compatible bridge.** Mobile bridge has 7 tests; web auth and Neon integration are tested; live OAuth remains manual |
| Registration | Create account and continue to onboarding | Appwrite Account plus Firestore `profiles`; Firebase token bridge | `POST /api/auth/register`; Neon identity and credential tables | Supported Neon admin after canonical persistence | **Gap.** Both paths are tested independently, but mobile still creates its product profile in Firestore |
| Forgot / reset password | Request recovery; deep-link back; set a new password | Appwrite recovery APIs plus public relay `recovery.html` | No athlete web recovery route yet | None | **Gap.** Relay path restriction is tested; live recovery and web parity are manual/open |
| Onboarding: athlete status | Choose current athlete stage | Firestore `profiles.athlete_status` | `POST /api/profile/intake`; Neon `athlete_profiles` | Users view | **Gap.** Mobile theme/profile logic and web onboarding persistence are tested separately |
| Onboarding: sport | Choose sport | Firestore `profiles.sport` | `POST /api/profile/intake`; Neon `athlete_profiles` | Users view | **Gap.** No cross-client persistence test |
| Onboarding: profile setup | Set name, school, graduation year, position, and related profile fields | Firestore `profiles`; local university directory | `PATCH /api/profile` and `POST /api/profile/intake`; Neon `users`, `user_emails`, `athlete_profiles` | Users view | **Gap.** University search has mobile and web unit coverage; storage contracts differ |
| Onboarding: group interest | Choose community participation and finish onboarding | Firestore `profiles` | `POST /api/profile/intake`; Neon athlete profile/intake fields | Users view | **Gap.** Web onboarding flow is tested; mobile completion still targets Firestore |
| Home / Dashboard | View greeting, streak, today state, progress, and recommended path | Reads Firestore `profiles`, `checkins`, and `completions`; derives recommendations locally | `/api/profile`, `/api/check-ins/today`, `/api/game-plan`, `/api/artifacts`; Neon | Overview, users, check-ins, and game plans | **Gap.** Deterministic recommendation logic is tested on both clients; hydration/storage parity is not |
| Check-In | Create one daily mood/note check-in; view history; edit/continue today | Firestore `checkins`; `createCheckIn`, `getTodayCheckIn`, `getRecentCheckIns`; profile streak update | `GET/POST /api/check-ins`, `GET/PATCH /api/check-ins/today`; Neon `check_ins` | Check-ins dashboard and overview aggregates | **Gap.** Web integration proves daily uniqueness/edit; mobile has no persistence test for check-ins |
| Check-In coach chat | Start or continue AI conversation associated with today | Direct Gemini client plus Firestore `ai_chat_sessions/{id}/messages` | `POST /api/clipboard/chat`; Neon `clipboard_threads` and `clipboard_messages`, server AI Gateway/fallback | Not currently visible | **Gap / security priority.** Web gateway behavior is tested; mobile direct-client AI and Firestore history must cut over |
| Clipboard | Choose coach persona; send message; load or clear history | Firestore `profiles.ai_personality` and `ai_chat_sessions`; direct Gemini client | `POST /api/clipboard/chat`, `GET/DELETE /api/clipboard/history`; Neon | Not currently visible | **Gap.** Mobile persona logic and web gateway/history are tested separately |
| Progress | Change period; view totals, milestones, streak, and history | Reads Firestore `checkins`, `completions`, and `profiles`; computes locally | Neon-backed shell progress data and shared journey math | Overview, check-ins, and game plans provide partial visibility | **Gap.** Progress/journey math is tested; equivalent aggregate contract is not |
| Game Plan | View weekly actions and selected path; toggle an action complete | Firestore `completions`; local action/path registries | `GET /api/game-plan`, `POST /api/game-plan/actions/toggle`; Neon `action_completions` | Game plans dashboard | **Gap.** Registries and Neon toggles are tested; mobile Firestore writes remain |
| Path detail | Read path description and commit to a path | Local registry; Firestore profile/game-plan state | `GET /api/game-plan/paths/:path_id`, `POST /api/game-plan/commit`; Neon `commitments` | Game plans dashboard | **Gap.** Ranking and path registries are tested; mobile commit persistence needs cutover |
| Notifications | View activity; mark one/all read; configure reminders | Firestore `notifications`; Expo local/push notification APIs; push token profile data | No canonical web notification API | None | **Gap.** Manual-only; notification schema and delivery ownership need a product decision |
| Perks | Browse offers and open destinations | Bundled/static catalog and external links | No canonical web route | None | **Static/local.** Manual link/content review required |
| Community | Switch global/school room; read and send messages; receive live updates | Firestore `rooms` and `messages` with snapshot subscriptions | `GET /api/community/feed`, forum/member/post/comment/vote APIs; Neon `forums`, `forum_memberships`, `posts`, `comments`, votes | Community dashboard reads canonical Neon; archived export can read legacy Firestore | **Gap / migration priority.** Web forum integration is tested; mobile room/message model is materially different |
| Community safety | Report a message; block a user | Firestore `content_reports` and `user_blocks` | Supported web API has admin moderation but no athlete report/block endpoint | Community moderation; legacy export is read-only | **Gap.** No mobile persistence or cross-client safety test |
| Support | Submit peer-support or technical request; read crisis/resources content | Firestore `support_requests` | `POST /api/support/peer` and `/api/support/tech`; Neon `support_requests` | Support dashboard and audited status mutations | **Gap.** Web support persistence/admin audit is integration-tested; mobile submission is not |
| Profile / Appearance | View/edit profile; select Legacy Neon, Sideline Dusk, or Campus Colors | Firestore `profiles`; AsyncStorage theme selection; local school palette | `GET/PATCH /api/profile`; localStorage theme selection; Neon profile | Users view | **Partial parity.** Theme/school defaults have unit tests on both clients; profile storage differs |
| Profile photo | Pick and upload avatar | Appwrite Storage via `services/profile-pic.ts`, URL stored with profile | No canonical web upload API | Users view may show stored profile URL | **Gap.** Manual-only and storage ownership is unresolved |
| Account/session controls | Sign out; delete account | Authenticated relay revocation, Appwrite session deletion, Firebase sign-out; client-side deletion across Firestore collections | `POST /api/auth/logout`; no supported athlete self-delete API | Admin can suspend/ban/delete with audit, but that is not self-service deletion | **Gap / data-integrity priority.** Revocation is tested; mobile client-orchestrated deletion must become one audited server transaction |
| Explore and modal placeholders | Open experimental/placeholder routes | Bundled UI only | No canonical web route | None | **Static/local or remove.** Not in the supported bottom-tab contract; manual decision required |

## Supported admin parity

| Admin screen | Canonical data and actions | Legacy client-admin export | Validation |
| --- | --- | --- | --- |
| Overview | Neon aggregates for users, check-ins, game plans, support, and community | Reads legacy Firestore aggregates only | Neon admin reads and audit behavior are covered by integration tests |
| Users | Neon user/profile state; verify, suspend, ban, and delete through audited mutations | Reads Firestore profiles; every former mutation endpoint returns 405 and controls are status-only | Admin auth/session and audited mutation paths are tested in the canonical app; export lint/typecheck/build pass |
| Check-ins | Neon check-in list and analytics | Reads legacy Firestore `checkins` | Canonical daily constraints and admin reads are integration-tested |
| Game plans | Neon commitments/action completions | Reads legacy Firestore `completions` | Canonical toggles and admin reads are integration-tested |
| Support | Neon requests; audited status changes | Reads legacy Firestore requests; no status mutation | Canonical persistence and audited admin mutation are integration-tested |
| Community | Neon forums/posts/comments and moderation actions | Reads legacy Firestore rooms/messages; no prompt, delete, or ban mutation | Canonical forum flow is integration-tested; legacy schema remains migration input only |

## Cross-cutting API and storage decisions

| Concern | Decision / current contract | Remaining gate |
| --- | --- | --- |
| Canonical product database | Neon/Postgres in `3rd_and_manageable` | Replace every mobile Firestore product-data call with the canonical athlete API |
| Temporary identity bridge | Appwrite JWT is verified server-side, mapped to canonical identity, then exchanged for Firebase custom auth through the restricted relay | Complete mobile product-data cutover, then retire Firebase product access and the relay |
| Firebase production data | Read-only inventory/export only until owner grants viewer authority and migration is rehearsed | Idempotent export, counts/checksums, email scrub, rollback artifact, then controlled import |
| Admin writes | Supported only in the canonical Next admin and wrapped in audited Neon transactions | Keep the client-admin export undeployed and read-only |
| Secrets | No private keys or bypass tokens in repositories or mobile public configuration | Organization-owned relay repo/credentials and remaining legacy key revocation |
| Theme behavior | Three named themes; Campus Colors only for a verified supported school | Complete device/viewport visual regression on the active mobile and web branches |

## Current validation snapshot

| Surface | Automated status | Manual / live status |
| --- | --- | --- |
| Replacement mobile `codex/unified-liquid-glass` | 23 tests pass; TypeScript passes; ESLint passes; Expo Doctor 21/21 | Device OAuth, recovery, notifications, profile upload, and full screen-by-screen visual QA remain |
| Web/admin `UI-redesign` | Unit/component suites plus Neon/emulator suites are present; run the branch gate before merging this ledger | Live screenshots remain dependent on reachable staging data/services |
| Staging relay | 3/3 Node tests pass | Live synthetic exchange/revocation smoke must be rerun after any deployment |
| Client admin export | ESLint, TypeScript, and production build pass with the fixed project ID and no private key | Must remain local/undeployed; use viewer-only IAM for any live read |

## Next implementation order

1. Obtain organization permission and push the already-versioned staging relay
   without changing its Vercel project linkage or secrets.
2. Point the replacement mobile client at the canonical Next athlete APIs,
   starting with profile/onboarding, check-ins, game plan, support, and then
   community/Clipboard.
3. Add contract tests that run the same fixture through web and mobile API
   clients; turn each **Gap** row into **Parity** only when storage and behavior
   agree.
4. Run device/viewport visual QA for all active mobile screens and the five web
   shell tabs, then attach evidence to this ledger or the release PR.
5. Perform the least-privilege Firebase inventory and migration rehearsal; do
   not re-enable the archived admin export or client-side deletion as a shortcut.
