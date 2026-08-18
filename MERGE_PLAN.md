# Canonical mobile and web consolidation plan

**Status:** audited on 2026-08-18. The liquid-glass mobile branch is clean,
pushed, built, and validated on a registered iPhone. It has not been merged
into mobile `main`. The Next.js web/API/admin history remains separate and must
not be overlaid on the Expo project root.

## Consolidation outcome

`third-and-manageable-app` will remain the canonical Git repository and retain
the existing Expo, EAS, App Store Connect, bundle identifier, signing, and
TestFlight lineage. The `3rd_and_manageable` history can later join it as a
separate `web/` deploy root.

Keep Expo at the repository root during the first consolidation. This avoids
changing the native project root used by EAS. Configure Vercel to deploy the
imported Next.js application from `web/`.

```text
third-and-manageable-app/
├── app/                    Expo Router application
├── components/             Native components
├── assets/                 Native release assets
├── app.json
├── eas.json
├── package.json            Expo dependencies and scripts
├── web/                    Imported 3rd_and_manageable history
│   ├── src/app/            Next.js web, API, and admin routes
│   ├── package.json
│   ├── vercel.json
│   └── ...
└── packages/               Shared contracts and pure domain data, added later
```

Do not directly merge the two working trees at their roots. Both histories own
incompatible root package manifests, lockfiles, TypeScript and ESLint
configuration, tests, scripts, and deployment settings. A direct overlay would
also make it difficult to prove that EAS and Vercel still build the intended
application.

## Current verified state

| Area | Verified state |
| --- | --- |
| Mobile baseline | `third-and-manageable-app/main` is `fd906a8` |
| Mobile candidate | Product code baseline `a880402`; the branch contains nine product commits plus documentation updates and is zero behind `main` |
| Remote preservation | The candidate is clean and matches `origin/codex/unified-liquid-glass`; no pull request exists |
| Mobile checks | 36 tests pass; TypeScript and ESLint pass |
| Expo Doctor | 20 of 21 checks pass; nine Expo SDK 57 packages need patch-version alignment |
| Device artifact | EAS Preview `fe86da59-09d9-411f-95da-5d338924558a`, app `1.0.1` build `11`, is signed for both registered iPhones |
| Physical validation | Installation, email authentication, password recovery, Sign in with Apple, and Google sign-in pass |
| Simulator artifact | Standalone Preview `0ed29796-b992-41c4-a3c3-80a0afdd08ea` launches without Metro |
| Web/API/admin checks | 183 tests pass; TypeScript, ESLint, and the Next.js production build pass |
| Temporary relay | Retired; its Vercel project is deleted and the former hostname returns `404` |
| Original admin export | Superseded by `3rd_and_manageable`; clean archive commit `0b6d21d79707` was moved to the macOS Trash |

## Integration boundary already preserved

The replacement mobile client retains the canonical native provider and release
integrations while using the streamlined server boundary:

1. Appwrite owns native account creation, provider sessions, email recovery,
   Sign in with Apple, and Google sign-in.
2. Each mobile product request creates a short-lived Appwrite JWT.
3. Next.js validates that JWT and derives the Appwrite user ID on the server.
4. Firestore remains the canonical product store, but the replacement client
   does not import Firestore or Firebase Storage product APIs.
5. Firebase custom-token exchange remains available for released older-client
   compatibility.
6. Appwrite Storage owns profile images through authenticated Next.js routes.
7. Clipboard AI runs through the server-side Vercel AI Gateway. No Gemini key
   is bundled in the mobile application.
8. The web admin reads and moderates the same Firestore profiles, check-ins,
   rooms, messages, reports, support requests, notifications, and commitments.

The authenticated API covers profile and account deletion, check-ins,
Clipboard, career intake and commitments, legacy community and moderation,
support, notifications, push-token registration, and profile images.

## Gaps found in the comparison

Resolve these contract and configuration gaps before a production TestFlight
build.

### Product-contract gaps

- Career path IDs disagree. Mobile uses `nine-to-five` and `shift`; the server
  accepts `nine_to_five` and `overnight`. Those mobile commitments currently
  receive `400 Unknown path`.
- Mobile carries a 99-school search list, while the web owns 3,879 schools.
  Mobile should consume a generated subset or server-backed search based on one
  canonical institution identifier.
- Career paths, intake fields, skill mappings, profile shapes, notification
  shapes, and theme values are typed independently in both applications.
- `constants/brand-token-spec.ts` describes a portable token contract, but the
  web application does not consume it as its source.
- Share pure data, validation, identifiers, and API contracts. Do not try to
  share rendered React Native and DOM components as one UI implementation.

### Mobile cleanup gaps

- `lib/supabase.ts` is tracked but unused and Supabase is not an installed
  dependency.
- `.env.example` still advertises Appwrite database and collection IDs that the
  replacement client no longer reads.
- `functions/daily-reminder` describes an Appwrite Function but implements a
  Firebase Admin process that expects long-lived service-account fields. It is
  not the supported reminder architecture.
- `firestore.indexes.json` needs an explicit server/emulator owner after the
  client-side Firestore migration.
- Expo Doctor reports patch mismatches for Expo, Router, Notifications,
  Sharing, Splash Screen, Image Picker, Constants, Dev Client, and Build
  Properties.

### Server and deployment gaps

- EAS `production` currently contains only the native platform identifier and a
  recovery URL that points at the staging Vercel hostname. Production Appwrite,
  Firebase, direct API, OAuth, legal, and support client variables are absent.
- Vercel Production has admin and email variables, but no production Appwrite,
  Firestore, Appwrite Storage, or workload-identity configuration.
- The signed Appwrite revocation webhook handler and Preview secrets exist, but
  the live Appwrite webhook is intentionally not registered.
- The server stores Expo push tokens but does not schedule or send reminders.
  APNs to Expo to device delivery and invalid-token cleanup remain unproven.
- Profile upload, polling behavior under adverse networks, account deletion,
  and push delivery still need focused physical-device evidence even though
  authentication and recovery pass.

### Repository-state gaps

- Mobile `main` does not contain the nine liquid-glass product commits or the
  updated consolidation documentation.
- The mobile candidate has no pull request, although it can fast-forward onto
  `main` without conflict.
- `3rd_and_manageable/main` has two local documentation commits not yet pushed.
- The web checkout also contains an unrelated modified `AGENTS.md` and an
  untracked `nbj-write-clearly/` folder. Decide their ownership before importing
  committed web history; do not absorb local tool state accidentally.

## Consolidation sequence

### Phase 1 — finish the mobile candidate

1. Align the nine Expo SDK patch versions reported by Expo Doctor.
2. Replace the mobile career path IDs with the canonical server IDs and add a
   contract test covering every commit-able path.
3. Remove the unused Supabase module and stale collection-ID environment
   examples.
4. Move reminder ownership to the authenticated server plan; do not deploy the
   current mixed-runtime function with long-lived Firebase credentials.
5. Update and rerun the 36 mobile tests, TypeScript, ESLint, Expo Doctor, and a
   staging environment check.
6. Fast-forward mobile `main` from `fd906a8` to the reviewed candidate and push
   `origin/main`.
7. Remove the liquid-glass folder with `git worktree remove` only after the
   remote `main` commit and worktree status are verified.

### Phase 2 — import the web history without changing behavior

1. Resolve or preserve the two unpushed web documentation commits and leave
   unrelated local files out of the import.
2. Create a consolidation branch from the updated mobile `main`.
3. Add `3rd_and_manageable` as a temporary Git remote and import its history
   under `web/` without squashing it into an untraceable file copy.
4. Keep the Expo and Next.js package manifests, lockfiles, and scripts separate
   during this phase.
5. Set the Vercel project Root Directory to `web` and deploy a staging Preview.
6. Prove that the imported web tree still passes 183 tests, TypeScript, ESLint,
   the production build, and the direct mobile-stack smoke.
7. Prove that EAS Preview still builds from the repository root and that the
   resulting IPA contains the direct staging API configuration.

### Phase 3 — centralize contracts deliberately

After both deploy roots pass unchanged from one repository, add shared pure
TypeScript packages in controlled slices:

1. API request, response, identifier, and error contracts.
2. Career path IDs, intake fields, skills, and ranking inputs.
3. Institution IDs, university-search data generation, and school-brand tokens.
4. Notification types, artifact metadata, and navigation destinations.
5. Test fixtures that assert mobile clients and server routes use the same
   values.

Configure Metro and Next.js for each shared package one at a time. Keep native
UI components and web UI components in their respective applications.

### Phase 4 — reconstruct and prove production

1. Inventory the existing production Appwrite and Firebase projects without
   copying production secrets into source or staging.
2. Configure Vercel Production with least-privileged production Appwrite,
   Appwrite Storage, Firebase, and workload-identity values.
3. Configure the EAS production environment with the production public client
   values and production web handoff URLs. Remove every staging hostname.
4. Register and verify the signed Appwrite revocation webhook with an explicit
   rotation and rollback procedure.
5. Implement server-owned reminder scheduling and Expo receipt cleanup, then
   prove delivery on a physical device.
6. Complete VoiceOver, Dynamic Type, Reduce Motion, Reduce Transparency,
   contrast, low-memory, profile upload, polling, account deletion, and Android
   checks.
7. Promote through the existing App Store record and bundle identifier with a
   documented rollback window.

## Release boundary

The candidate is suitable for staging integration work, not a production
submission. No new TestFlight or App Store build has been submitted from this
branch. Because the branch changes native modules and build configuration, the
next promoted release must be a new binary rather than a JavaScript-only
update.
