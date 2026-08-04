# Firebase and App Store Safe Handoff

**Status:** the production Firebase Web app configuration for project
`third-and-manageable-app` is now known. That configuration identifies a client
app; it is not a Firebase Admin credential and does not authorize the
server-side inventory, Auth export, Firestore export, or token compatibility
work in the migration plan.

The live App Store app remains the production system. Do not change its
Firebase providers, Security Rules, data, API keys, APNs credentials, bundle
identifier, or minimum supported version as part of repository setup.

## What the supplied configuration does and does not unlock

The supplied values identify Firebase project `third-and-manageable-app` and
Web app `1:360647669222:web:82c1718ab1150e91699227`. Firebase client API keys
are designed to ship in client code. Access to Firestore and Storage is
controlled by Security Rules/App Check, and server access is controlled by IAM.
The API key should still have appropriate API restrictions, but rotating it just
because it appeared in this conversation would not protect Firebase data.

It does **not** include:

- a least-privilege service account for read-only Auth/Firestore inventory;
- the iOS `GoogleService-Info.plist` and registered Firebase iOS app details;
- the editable Expo/React Native source or its EAS project ownership;
- Google and Apple provider client IDs, Apple Team/Key/Services IDs, private
  key, or redirect URI inventory;
- App Store Connect access, signing certificates, or provisioning profiles.

Do not add `firebase/app` or these Web values to the new athlete client yet.
The current Next.js/FastAPI build has its own local auth and data path. Pointing
it directly at the production Firebase project would create two writers and
make rollback and reconciliation materially harder.

## Isolation lanes

| Lane | Data and identity | Deployment rule |
|---|---|---|
| Released App Store app | Existing production Firebase Auth/Firestore | Freeze except for an independently reviewed emergency fix |
| Local development | Local FastAPI database and Firebase demo-project emulators when needed | Never fall through to production Firebase |
| Protected web preview | Disposable Neon preview branch | Keep production Firebase credentials absent |
| Replacement mobile staging | A separate Firebase staging project only if Firebase client compatibility is needed | Separate iOS bundle ID, provider clients, APNs setup, and test users |
| Replacement production | Same App Store record and bundle ID only at the controlled cutover | TestFlight first; retain Firebase compatibility and rollback window |

For emulator work, use a `demo-*` Firebase project ID. A demo project has no
live resources, so an un-emulated product fails instead of falling through to a
production service.

## Step 1 — capture a no-change production inventory

Before rotating, migrating, or deploying anything, record the current state:

1. In Firebase Project settings, record every registered Web/iOS app, app ID,
   bundle ID, SHA fingerprint (if any), and the project number.
2. In Authentication, record enabled providers, authorized domains, templates,
   tenant configuration, and user/provider counts. Do not disable or recreate a
   provider.
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

## Step 2 — recover the build inputs

The repository does not contain editable Expo/React Native source. The compiled
bundle was useful for feature analysis, but it is not a maintainable source
base. Before promising an App Store update, obtain:

- the original source repository and complete Git history;
- Expo owner/project access and `eas.json` / `app.json` or `app.config.*`;
- App Store Connect access for C.H.A.T. Express LLC;
- Apple Developer team access and Sign in with Apple configuration;
- Google OAuth client ownership and Firebase iOS app configuration;
- current privacy policy, App Privacy answers, and data-retention commitments.

If the original source cannot be recovered, scaffold a new Expo app under a
separate staging bundle ID and consume this repo's future same-origin API. Do
not attempt to edit or reconstruct the shipped compiled bundle.

## Step 3 — build compatibility before migration

The safe dependency order is:

1. Finish the shared API and canonical Postgres identity schema locally.
2. Add a server-only Firebase ID-token compatibility endpoint that verifies
   signature, issuer, audience, expiry, and revocation where required.
3. Map Firebase UID and stable Google/Apple provider subjects into
   `auth_identities`; never link accounts by email alone.
4. Build an idempotent Firestore-to-Postgres export with counts, checksums,
   sampled reconciliation, and an explicit rollback artifact.
5. Keep the released mobile app reading/writing Firebase during this work. Do
   not enable dual writes until conflict ownership and replay behavior are
   designed and tested.
6. Test the replacement app against staging, then a protected production
   compatibility endpoint with test accounts.

## Step 4 — controlled App Store cutover

Use the existing App Store record and production bundle ID only for the
replacement release:

1. Internal TestFlight with staff/test accounts.
2. External TestFlight with an explicit data-migration and rollback checklist.
3. Submit updated App Privacy, privacy manifest, permissions, account-deletion,
   and support metadata based on actual behavior.
4. Release gradually and monitor auth failures, data reconciliation, crashes,
   support volume, and old-client traffic.
5. Maintain a rollback window. Do not freeze Firebase writes or remove Firebase
   Auth until the adoption threshold and minimum-supported-version policy are
   met.
6. Retire Firebase only after the compatibility gate in
   `VERCEL_MIGRATION_PLAN.md` §2.3 passes.

## Immediate go/no-go

Safe now:

- console screenshots/exports of configuration;
- the aggregate read-only inventory;
- recovering source/EAS/App Store access;
- creating a separate staging project and demo-project emulator setup;
- local and protected-preview work against non-production data.

Not safe yet:

- adding Firebase Admin credentials to Vercel;
- running the new client against production Firestore;
- changing Auth providers, authorized domains, Rules, App Check enforcement, or
  APNs credentials;
- exporting identifiable user data into the repo or chat;
- shipping a replacement binary before source ownership, identity mapping,
  reconciliation, TestFlight, privacy review, and rollback are complete.
