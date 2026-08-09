# Firebase and App Store Safe Handoff

**Status:** the production Firebase Web app configuration for project
`third-and-manageable-app` and the shipped Expo source are now known. The
released app uses Appwrite project `69906e3f0020c208d8e7` for identity and uses
the Appwrite user `$id` as its Firestore ownership key. Firebase Authentication
is not configured. The Firebase client configuration is not an Admin credential
and does not authorize a server-side Firestore export or token bridge.

The live App Store app remains the production system. Its Firestore Rules allow
all reads and writes until 2029-03-16, but tightening them before an authenticated
replacement client is adopted would break production. Do not change Rules,
data, API keys, APNs credentials, Appwrite platforms/providers, bundle identity,
or minimum supported version as part of repository setup.

## What the supplied configuration does and does not unlock

The supplied values identify Firebase project `third-and-manageable-app` and
Web app `1:360647669222:web:82c1718ab1150e91699227`. Firebase client API keys
are designed to ship in client code. Access to Firestore and Storage is
controlled by Security Rules/App Check, and server access is controlled by IAM.
The API key should still have appropriate API restrictions, but rotating it just
because it appeared in this conversation would not protect Firebase data.

It does **not** include:

- a least-privilege service account for read-only Firestore/IAM inventory;
- a registered Firebase iOS app (the console currently contains only the Web
  app used by the Expo Firebase JS SDK);
- write access to the recovered Expo/React Native source or team access to the
  personal Expo owner account;
- Google OAuth ownership or the private credentials needed for provider/server
  configuration;
- Apple Sign in with Apple Services ID, domain/return URL, or private key (the
  separately completed Apple inventory confirms these are not configured).

The Firebase client values do not grant Apple access, but Apple Developer and
App Store Connect state has now been inventoried independently in
`third-and-manageable-apple-inventory-2026-08-05.md`.

Do not add `firebase/app` or these Web values to the new athlete client yet.
The current Next.js/FastAPI build has its own local auth and data path. Pointing
it directly at the production Firebase project would create two writers and
make rollback and reconciliation materially harder.

## Isolation lanes

| Lane | Data and identity | Deployment rule |
|---|---|---|
| Released App Store app | Appwrite Auth + unauthenticated direct Firestore | Freeze except for an independently reviewed emergency fix; strict Rules require a replacement build |
| Local development | Local FastAPI database and Firebase demo-project emulators when needed | Never fall through to production Firebase |
| Protected web preview | Disposable Neon branch + separate staging Appwrite/Firebase projects | Keep all production provider credentials absent; use keyless Preview-only Google federation |
| Replacement mobile staging | Separate staging Appwrite/Firebase projects reached through the path-restricted public Vercel relay | Use only generated/synthetic test users; keep the protection bypass server-side and production credentials absent |
| Replacement production | Same App Store record and bundle ID only at the controlled cutover | TestFlight first; retain Firebase compatibility and rollback window |

The staging compatibility implementation now includes both an authenticated
client sign-out endpoint and a signed Appwrite session/status webhook that call
Firebase refresh-token revocation. These routes and their 31 focused tests are
local/staging work only. The public Vercel staging relay exposes only token
exchange and authenticated revocation, with the Preview bypass held
server-side; it deliberately does not expose the webhook. No production
Appwrite webhook, Firebase Auth setting, or Firestore Rule has been created or
changed. A live webhook still needs an explicitly managed public callback,
signature secret, and protection-bypass lifecycle; do not weaken deployment
protection to make it work.

For emulator work, use a `demo-*` Firebase project ID. A demo project has no
live resources, so an un-emulated product fails instead of falling through to a
production service.

## Step 1 — capture a no-change production inventory

Before rotating, migrating, or deploying anything, record the current state:

1. In Firebase Project settings, record every registered Web/iOS app, app ID,
   bundle ID, SHA fingerprint (if any), and the project number.
2. Record that Firebase Authentication is not configured. Inventory Appwrite
   users/providers separately; do not enable Firebase Auth or change an
   Appwrite provider during inventory.
3. In Firestore, record database location, deployed Rules, indexes, TTL/backup
   settings, collection counts, and sampled field shapes. Do not publish Rules.
4. In Storage and App Check, record buckets, deployed Rules, registered apps,
   providers, and enforcement state.
5. Record the FCM/APNs credential owner and expiry state without downloading or
   rotating it.
6. In Google Cloud IAM, review existing human users, service accounts, keys,
   and their last-used dates. Revoke only after the dependency is known.
7. In App Store Connect and Expo/EAS, record app ID `6759578111`, bundle ID,
   current production version/build, phased-release state, signing ownership,
   EAS project ID, and update authority.

Apple account inventory is complete as of 2026-08-05; see
`third-and-manageable-apple-inventory-2026-08-05.md`. It confirms the live app
record, signing resources, expired TestFlight builds, team-scoped APNs key, and
absence of Sign in with Apple configuration. No Apple setting was changed.

The public App Store listing currently says the released binary supports iOS
15.1 or later. Repo references that call iOS 18 the minimum must be treated as
unverified build-analysis notes until App Store Connect/Xcode settings confirm
the actual deployment target.

### Read-only inventory command

Create a dedicated Google Cloud service account such as
`firebase-migration-inventory` with only these roles:

- Cloud Datastore Viewer (`roles/datastore.viewer`)
- Firebase Authentication Viewer (`roles/firebaseauth.viewer`)

Create a short-lived key for that account only if workload identity or another
keyless method is not available. Store the JSON outside this repository and
never paste it into chat, source, `.env.local`, or Vercel.

Then run:

```bash
FIREBASE_PROJECT_ID=third-and-manageable-app \
GOOGLE_APPLICATION_CREDENTIALS=/absolute/path/to/read-only-service-account.json \
npm run firebase:inventory
```

The command is hard-coded to refuse other projects and contains no mutation
calls. It prints only aggregate Auth counts, provider IDs, Firestore collection
counts, and sampled field names/types. It omits emails, UIDs, provider subjects,
document values, messages, and journal text.

After the inventory has been reviewed and retained securely, delete the local
key file and revoke that key in IAM. Keep the read-only service account only if
there is a documented follow-up use.

## Step 2 — recovered build inputs and remaining ownership work

The editable Expo/React Native source is recovered at
`ericthirdandmanageable-tech/third-and-manageable-app`; commit
`5b37d367c7119961ca98cd52645fdc79c3499626` matches App Store build `1.0.0 (6)`.
EAS project `7d162617-1e50-4351-8de0-519f8063bc4d` is owned by the personal
Expo account `eric.thirdandmanageable`. Before promising an App Store update,
finish:

- write access to the source repository;
- conversion/transfer to an Expo organization with controlled member access;
- preserve the confirmed App Store Connect App Manager access and coordinate
  signing/capability changes with an Account Holder or Admin;
- approved Sign in with Apple Services ID/domain/return-URL design plus private
  key custody; no Services ID or capability is currently configured;
- custody and consumer inventory for team-scoped APNs key `ZM9KBD5N8X`; do not
  download, associate, or revoke it during inventory;
- Google OAuth client ownership and Appwrite provider configuration;
- current privacy policy, App Privacy answers, and data-retention commitments.

## Step 3 — build compatibility before migration

The safe dependency order is:

1. Finish the shared API and canonical Postgres identity schema locally.
2. Complete the temporary Appwrite JWT → Firebase custom-token bridge in
   `APPWRITE_FIREBASE_BRIDGE_DESIGN.md`. The token route, mocked provider
   adapters, and canonical identity transaction are implemented locally. The
   real transaction adapter passed its four-case disposable-Neon branch suite
   and the 20-table baseline; verified-user rate limiting, keyless Firebase
   signing, and token-free outcome telemetry passed a protected staging Preview.
   The two Vercel Firewall rules are published; the verified-user rule returned
   live 429 responses, while the IP rule remains observation-only pending a
   dashboard review. Authenticated and signed-webhook revocation are now
   implemented and directly smoked in the protected Preview. The replacement
   Expo bootstrap is implemented locally with seven focused tests, Firebase
   Auth persistence, identity matching, and fail-closed Appwrite-session
   rollback. The staging Firebase Web client and Appwrite iOS React Native
   platform are registered, with public client values stored in a git-ignored
   local environment file. An empty `nam5` staging Firestore database now runs
   the emulator-tested bridge Rules. A separate public Vercel relay keeps the
   protected Preview bypass server-side, and the guarded synthetic smoke test
   has passed Appwrite JWT exchange, Firebase sign-in with matching UID, and
   authenticated Firebase refresh-token revocation. The synthetic Appwrite and
   Firebase users were removed afterward. Device/simulator UI validation is the
   remaining staging check. The
   server must derive identity by validating the Appwrite JWT, never from
   client-supplied UID/email.
3. Map Appwrite UID, temporary Firebase UID, and later stable Google/Apple
   provider subjects into `auth_identities`; never link accounts by email alone.
4. Build an idempotent Firestore-to-Postgres export with counts, checksums,
   sampled reconciliation, and an explicit rollback artifact.
5. Keep the released mobile app reading/writing Firebase during this work. Do
   not enable dual writes until conflict ownership and replay behavior are
   designed and tested.
6. Test the replacement app and strict Rules against Firebase emulators and a
   separate staging project, then use TestFlight with production test accounts.
7. Publish strict production Rules only after the authenticated replacement
   build reaches the documented adoption/minimum-version gate.

## Step 4 — controlled App Store cutover

Use the existing App Store record and production bundle ID only for the
replacement release:

1. Internal TestFlight with staff/test accounts.
2. External TestFlight with an explicit data-migration and rollback checklist.
3. Submit updated App Privacy, privacy manifest, permissions, account-deletion,
   and support metadata based on actual behavior.
4. Release gradually and monitor auth failures, data reconciliation, crashes,
   support volume, and old-client traffic.
5. Maintain a rollback window. Do not freeze Firebase writes, disable Appwrite,
   or revoke the compatibility bridge until the adoption threshold and
   minimum-supported-version policy are met.
6. Retire Firebase only after the compatibility gate in
   `VERCEL_MIGRATION_PLAN.md` §2.3 passes.

## Immediate go/no-go

Safe now:

- console screenshots/exports of configuration;
- the aggregate read-only inventory;
- recovering source/EAS/App Store access;
- local design and emulator tests for the Appwrite/Firebase bridge and Rules;
- local mocked development of the no-credential token route and provider
  boundaries;
- creating a separate staging project and demo-project emulator setup;
- local and protected-preview work against non-production data.
- live bridge smoke tests against the isolated staging Appwrite, Firebase,
  Neon, and public Vercel relay, using disposable synthetic users.

Not safe yet:

- adding Firebase Admin credentials to Vercel;
- running the new client against production Firestore;
- enabling Firebase Auth in production or changing Appwrite providers,
  authorized domains, Rules, App Check enforcement, or APNs credentials;
- exporting identifiable user data into the repo or chat;
- shipping a replacement binary before source ownership, identity mapping,
  reconciliation, TestFlight, privacy review, and rollback are complete.
