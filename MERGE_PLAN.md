# Canonical mobile and web consolidation plan

**Status:** updated on 2026-08-18. The liquid-glass mobile history has been
fast-forwarded into mobile `main` and pushed to `origin/main`. The Next.js
web/API/admin history has been imported beneath `web/` on the local
`consolidate/web-history` branch. That consolidation branch has not been
pushed or deployed.

## Consolidation outcome

`third-and-manageable-app` remains the canonical Git repository and retains
the existing Expo, EAS, App Store Connect, bundle identifier, signing, and
TestFlight lineage. The `3rd_and_manageable` history is imported as a separate
`web/` deploy root.

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
| Mobile baseline | `third-and-manageable-app/main` and `origin/main` are `72e2a43` (`fix: align mobile career and Expo contracts`) |
| Mobile integration | The nine liquid-glass product commits, the consolidation documentation, and the contract/configuration fixes are in `main` |
| Mobile checks | 37 tests, TypeScript, and ESLint pass |
| Expo Doctor | 21 of 21 checks pass after aligning the nine Expo SDK 57 patch versions |
| Device artifact | EAS Preview `fe86da59-09d9-411f-95da-5d338924558a`, app `1.0.1` build `11`, is signed for both registered iPhones |
| Physical validation | Installation, email authentication, password recovery, Sign in with Apple, and Google sign-in pass |
| Simulator artifact | Standalone Preview `0ed29796-b992-41c4-a3c3-80a0afdd08ea` launches without Metro |
| Web/API/admin import | `consolidate/web-history` contains merge commit `6e82e17`, which retains `3rd_and_manageable/main` as a parent and places its tree under `web/` |
| Web/API/admin checks | After import, 183 tests, TypeScript, ESLint, and the Next.js production build pass from `web/` |
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

## Remaining gaps before a production TestFlight build

Resolve these contract and configuration gaps before a production TestFlight
build.

### Product-contract gaps

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

- `firestore.indexes.json` needs an explicit server/emulator owner after the
  client-side Firestore migration.
- Reminder delivery has no supported server-owned scheduler or Expo receipt
  cleanup. The obsolete mixed-runtime `functions/daily-reminder` implementation
  was removed rather than deployed.

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

- The `consolidate/web-history` branch is local only. It must be reviewed and
  pushed before it can become the shared consolidation branch.
- `3rd_and_manageable/main` remains three commits ahead of its remote, but all
  three committed documentation updates are retained by the `web/` import.
- The web checkout also contains an unrelated modified `AGENTS.md` and an
  untracked `nbj-write-clearly/` folder. Neither local-only item was imported.

## Consolidation sequence

### Phase 1 — completed mobile integration

1. Aligned the nine Expo SDK patch versions. Expo Doctor now passes all 21
   checks.
2. Replaced `nine-to-five` and `shift` with the server IDs `nine_to_five` and
   `overnight`, and added a test that covers every commit-able career path.
3. Removed `lib/supabase.ts`, stale Appwrite database and collection variables
   from `.env.example`, and the obsolete mixed-runtime reminder function.
4. Reran the mobile test suite, TypeScript, ESLint, and Expo Doctor. The suite
   has 37 passing tests.
5. Fast-forwarded `main` from `fd906a8` to `72e2a43` and pushed `origin/main`.
6. Verified the pushed commit and clean worktree status, then removed the
   liquid-glass worktree with `git worktree remove`.

### Phase 2 — import the web history without changing behavior

1. Completed: preserved the three committed web documentation updates. The
   source worktree's modified `AGENTS.md` and untracked tool folder were left
   out of the import.
2. Completed: created `consolidate/web-history` from updated mobile `main`.
3. Completed: added `3rd_and_manageable` as a temporary remote and imported
   its history under `web/` without squashing it. The temporary remote was then
   removed.
4. Completed: kept the Expo and Next.js package manifests, lockfiles, and
   scripts separate.
5. Completed: verified the imported web tree with 183 tests, TypeScript,
   ESLint, and a production build.
6. Set the Vercel project Root Directory to `web` and deploy a staging Preview.
7. Run the direct mobile-stack smoke against that Preview.
8. Prove that EAS Preview still builds from the repository root and that the
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

The integrated mobile code is suitable for staging integration work, not a
production submission. No new TestFlight or App Store build has been submitted
from this history. Because the history changes native modules and build
configuration, the next promoted release must be a new binary rather than a
JavaScript-only update.
