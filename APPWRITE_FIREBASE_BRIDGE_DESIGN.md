# Appwrite → Firebase Authentication Bridge and Firestore Rules Design

> **Updated boundary (2026-08-18):** Expo staging now calls the public
> `3rd_and_manageable` staging branch directly. Relay references below describe
> the previous transport topology. The Appwrite UID remains the universal
> Firestore owner ID. See `STACK_ARCHITECTURE.md` and
> `DIRECT_STAGING_CUTOVER.md`.

**Status:** the candidate Rules are published only in the isolated staging
Firebase project. Token/revocation and the authenticated product API are
validated end to end through the public Vercel `staging` branch and keyless
Google Workload Identity Federation.
The replacement Expo client no longer accesses Firestore or Firebase Storage
for product data; custom-token Firebase Auth remains only for older-client
compatibility. The Appwrite webhook is not registered — **do not deploy or
publish any of this to production.**

This design is anchored to the shipped Expo source at commit
`5b37d367c7119961ca98cd52645fdc79c3499626` (App Store version `1.0.0`,
build `6`). It corrects the earlier assumption that the released app uses
Firebase Authentication:

- Appwrite project `69906e3f0020c208d8e7` is the live identity provider.
- The Appwrite user `$id` is the user ID stored in Firestore document IDs and
  `user_id` fields.
- Firebase Authentication is not configured.
- The released client talks directly to Firestore without Firebase identity,
  and production Rules currently allow every read and write until 2029-03-16.

The open Rules are a critical exposure, but publishing owner-only Rules now
would take the released app offline. The bridge, client update, and Rules must
therefore ship as one tested migration with an adoption gate.

## 1. Recommended compatibility architecture

Use a temporary Firebase custom-token bridge so the replacement Expo build can
keep Firestore realtime behavior while every request gains a verified UID:

```text
Appwrite session
    │ client creates 15-minute Appwrite JWT
    ▼
POST /api/mobile/auth/firebase-token
    │ server verifies JWT by calling Appwrite Account.get()
    │ server derives UID only from that verified response
    ▼
Firebase Admin creates custom token (uid = Appwrite user.$id)
    │
    ▼
Expo signs in with Firebase Auth before any Firestore operation
    │
    ▼
Firestore Rules enforce request.auth.uid ownership
```

This is a compatibility bridge, not the final identity system. The long-term
mobile client should use the Vercel API and canonical identity model, then
Firestore and Appwrite can retire behind the mobile-adoption gate.

### 1.1 Token exchange contract

Local implementation: `src/app/api/mobile/auth/firebase-token/route.ts`, with
the dependency boundaries in `src/lib/mobile-auth-bridge.ts` and
`src/lib/canonical-identity-mapping.ts`, the Appwrite / Firebase Admin adapters
in `src/lib/mobile-auth-providers.ts`, and the request-scoped Neon transaction
adapter in `src/lib/db/canonical-identity-persistence.ts`. The focused mocked
bridge/mapping/provider suite is 30 tests. A separate guarded four-case
integration suite passed against the production transaction adapter on a
disposable Neon branch on 2026-08-06; its temporary database and branch were
deleted and the endpoint was confirmed dead.

Verified-user rate limiting and token-free outcome telemetry are implemented
and staging-validated. The code fails closed if the Vercel Firewall SDK rule is absent. The
`mobile-auth-verified-user` 10-per-60-second SDK rule is now published, and a
separate published 60/minute IP rule remains log-only. On 2026-08-06, a real
staging Appwrite JWT passed the protected Preview exchange, the returned
Firebase token UID matched the verified Appwrite `$id`, and an 11-request run
returned only 200/429 responses (9 successful, final 2 limited). Missing auth
returned 401. The IP observation event still needs a Vercel-dashboard review.

Staging resources are isolated: Appwrite `69906dfc003364b9847e`; Firebase
`third-and-manageable-staging` / Google project number `371113500992`; Workload
Identity pool `vercel-preview`, provider `vercel`; and keyless service account
`vercel-preview-auth@third-and-manageable-staging.iam.gserviceaccount.com`.
The provider condition and service-account grant accept only the exact Vercel
Preview subject for `ling-iq/third-and-manageable`. No JSON key exists.
The service account has Firebase Authentication Admin only in the staging
project so `revokeRefreshTokens()` can run without a long-lived credential.

The public client origin is the generated Vercel URL
`https://third-and-manageable-mobile-staging.vercel.app`, owned by the separate
`ling-iq/third-and-manageable-mobile-staging` project. It accepts only POSTs to
the token and authenticated-revocation paths, then supplies the protected
Preview bypass credential upstream. The bypass secret is never present in the
Expo environment or response.

`POST /api/mobile/auth/firebase-token`

- Request header: `Authorization: Bearer <Appwrite JWT>`
- Request body: none
- Response: `{ "firebaseCustomToken": "..." }`
- Response headers: `Cache-Control: no-store`; never log the token or header.
- Reject missing/oversized/malformed credentials before calling either vendor.
- Rate-limit by verified Appwrite user ID and coarse network signal.

Server algorithm:

1. Create a fresh Appwrite Server SDK client for the request using endpoint
   `https://fra.cloud.appwrite.io/v1`, project
   `69906e3f0020c208d8e7`, and the supplied JWT. Do not use an Appwrite API key
   for identity proof.
2. Call Appwrite `Account.get()`. Reject an invalid, expired, disabled, or
   session-revoked identity. Never accept a client-supplied UID or email as the
   identity key.
3. Use the verified Appwrite `$id` unchanged as the Firebase UID. This preserves
   the live Firestore ownership convention and avoids rewriting user documents.
4. Upsert the canonical Postgres mapping transactionally:
   `(provider=appwrite, provider_account_id=$id)` and
   `(provider=firebase, provider_account_id=$id)` → one canonical user. Email is
   an attribute only and must never cause an automatic identity merge.
5. Mint a Firebase custom token with minimal claims:

   ```json
   {
     "auth_source": "appwrite",
     "bridge_version": 1
   }
   ```

   Do not copy profile, email, OAuth tokens, or admin status into client-controlled
   claims. Any future admin claim must come from the server-side role allowlist.
6. Return the token and discard the per-request Appwrite client and JWT.

Appwrite client JWTs expire after 15 minutes or when their source session is
deleted. Firebase custom tokens expire after one hour, but exchanging one creates
a long-lived Firebase session. That second session requires explicit revocation
handling.

### 1.2 Client bootstrap and sign-out

The replacement Expo checkout now initializes Firebase Auth persistence and
completes the token exchange before rendering any Firestore-backed screen:

1. Restore and verify the Appwrite session with `account.get()`.
2. Create an Appwrite JWT with `account.createJWT()`.
3. Exchange it at the bridge endpoint.
4. Call Firebase `signInWithCustomToken()`.
5. Verify `firebaseUser.uid === appwriteUser.$id`.
6. Only then allow profile, check-in, community, notification, or AI-history
   hooks to issue Firestore requests.

If any step fails, fail closed and show a retry/sign-in state. Never fall back
to anonymous Firestore access. Newly created Appwrite sessions are deleted if
Firebase bootstrap fails, preventing a half-signed-in retry loop. The focused
client suite passes seven success/rejection/configuration/identity/revocation
cases; TypeScript and focused ESLint checks also pass.

Device activation now uses the public, credential-free generated Vercel relay
origin in `EXPO_PUBLIC_AUTH_BRIDGE_URL`; no Vercel protection-bypass secret is
embedded in the Expo bundle. The Firebase staging Web app and Appwrite iOS
React Native platform are registered, and the public client values are stored
in the mobile checkout's git-ignored `.env.local`. The guarded
`npm run smoke:staging-auth` flow has passed token exchange, Firebase sign-in,
UID equality, and authenticated revocation. A device/simulator UI run remains.
The empty
staging Firestore database is created in `nam5` with this file's
emulator-tested Rules published; production Firestore and its Rules were not
changed.

New-client sign-out order:

1. Call a server revocation endpoint while the Appwrite JWT is still valid.
2. Server calls Firebase Admin `revokeRefreshTokens(appwriteUserId)`.
3. Client signs out of Firebase Auth.
4. Client deletes the Appwrite session.

Also create a signed Appwrite webhook for `users.*.sessions.*.delete` and
`users.*.update.status` that revokes Firebase refresh tokens. Treat webhook
delivery as defense in depth: authenticate its signature, make handling
idempotent, and audit failures without logging payload secrets.

### 1.3 Revocation contract

Implemented routes:

- `POST /api/mobile/auth/revoke` accepts the same short-lived Appwrite JWT as
  the token exchange, verifies it with `Account.get()`, and calls Firebase
  Admin `revokeRefreshTokens()` with only the verified Appwrite user ID.
- `POST /api/mobile/auth/appwrite-webhook` accepts only Appwrite's
  `users.*.sessions.*.delete` and `users.*.update.status` events. It verifies
  the HMAC-SHA1 signature over the exact configured URL plus untouched request
  body, and also binds the request to the expected Appwrite project and webhook
  IDs. Concrete event IDs must agree with the payload; wildcard event forms
  derive the same validated ID from the documented Session/User payload.

Both routes return `Cache-Control: no-store`, impose bounded credential/body
sizes, fail closed on provider/configuration errors, and record only fixed
outcomes without UIDs, payloads, tokens, signatures, or vendor error bodies.
Webhook replay is harmless because Firebase refresh-token revocation is
idempotent; repeated deliveries intentionally repeat the same revocation.

The focused revocation suite adds 31 tests covering credential validation,
signature/URL/project/webhook binding, wildcard and concrete events, payload
identity agreement, oversized requests, repeated delivery, provider failures,
and token-free telemetry. The Appwrite signing secret is an independent
8–256-character secret, not an API key.

The public mobile relay intentionally does not expose this webhook route.
Webhook activation therefore remains gated on a separate stable public
callback or Vercel Protection Bypass for Automation lifecycle. Appwrite cannot
send the Vercel-authenticated browser cookie, so a protected webhook URL must
include Vercel's documented
`x-vercel-protection-bypass` query parameter. That bypass secret must be kept
out of source/logs and rotated with the webhook signing secret. The handler is
deployed and directly smoke-tested, but no live Appwrite webhook should be
claimed until that callback lifecycle is configured.

## 2. Source changes required before strict Rules

The shipped source cannot work safely under owner-only Rules without these
changes:

| Current behavior | Required change |
|---|---|
| `profiles` contains email and is queried/read for community profiles and mentions | Create `public_profiles` containing only community-safe fields; make private `profiles` owner-only |
| Message creation trusts client-supplied name, sport, status, and verification | Rules must compare denormalized fields to `public_profiles/{uid}`, or message creation must move server-side |
| Mention notifications let one client write another user's `notifications` | Move cross-user notification creation to a server endpoint |
| Account deletion deletes reports/blocks involving other users | Move the complete deletion workflow to an authenticated, idempotent server endpoint |
| Streak counters and `last_checkin_date` are client-controlled | Move streak calculation/update to a server transaction |
| Check-ins and completions use random IDs, so the client can create duplicates | Use deterministic owner/date/action IDs or server endpoints to enforce one check-in/action completion per period |
| Community subscribes to the entire `messages` collection | Subscribe/query by `room_id` and apply a bounded limit |
| Historical shipped profile-photo code calls a Firebase Storage bucket that is not enabled | **Superseded:** the replacement client uploads through the authenticated API into isolated staging Appwrite Storage; production Firebase Storage remains disabled |
| Client timestamps are ISO strings supplied by the device | Prefer server timestamps or server-owned mutations for security-sensitive ordering |

Proposed `public_profiles/{uid}` fields:

- `user_id`
- `display_name`
- `sport`
- `athlete_status`
- `school` only if the privacy review confirms it is intentionally public
- `profile_pic`
- `verified` (server-controlled)

Do not copy email, group interest, streak, check-in state, AI preferences, or
other private profile attributes into `public_profiles`.

## 3. Candidate Firestore Rules

This candidate is an executable design target, not a production-ready file. Its
canonical test copy is `firebase-emulator/firestore.rules`; on 2026-08-05 it
passed the local emulator matrix below and on 2026-08-06 it was published only
to the empty staging Firestore database. It must still be reconciled against
sampled production field shapes before any production deployment.

```firebase
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    function bridged() {
      return request.auth != null
        && request.auth.token.auth_source == "appwrite"
        && request.auth.token.bridge_version == 1;
    }

    function isOwner(uid) {
      return bridged() && request.auth.uid == uid;
    }

    function ownsExisting() {
      return bridged() && resource.data.user_id == request.auth.uid;
    }

    function publicProfile(uid) {
      return get(/databases/$(database)/documents/public_profiles/$(uid)).data;
    }

    match /profiles/{uid} {
      allow read: if isOwner(uid);

      allow create: if isOwner(uid)
        && request.resource.data.user_id == uid
        && request.resource.data.verified == false;

      allow update: if isOwner(uid)
        && request.resource.data.user_id == uid
        && request.resource.data.diff(resource.data).affectedKeys().hasOnly([
          "display_name", "sport", "athlete_status", "school",
          "group_interest", "profile_pic", "ai_personality",
          "verification_requested"
        ]);

      allow delete: if false;
    }

    match /public_profiles/{uid} {
      allow read: if bridged();

      allow create: if isOwner(uid)
        && request.resource.data.user_id == uid
        && request.resource.data.verified == false
        && request.resource.data.keys().hasOnly([
          "user_id", "display_name", "sport", "athlete_status", "school",
          "profile_pic", "verified"
        ]);

      allow update: if isOwner(uid)
        && request.resource.data.user_id == uid
        && request.resource.data.diff(resource.data).affectedKeys().hasOnly([
          "display_name", "sport", "athlete_status", "school", "profile_pic"
        ]);

      allow delete: if false;
    }

    match /checkins/{checkinId} {
      allow read: if ownsExisting();
      allow create: if bridged()
        && request.resource.data.user_id == request.auth.uid
        && request.resource.data.mood is int
        && request.resource.data.mood >= 1
        && request.resource.data.mood <= 5
        && request.resource.data.keys().hasOnly([
          "user_id", "mood", "note", "ai_response", "created_at", "date"
        ]);
      allow update, delete: if false;
    }

    match /completions/{completionId} {
      allow read: if ownsExisting();
      allow create: if bridged()
        && request.resource.data.user_id == request.auth.uid
        && request.resource.data.keys().hasOnly([
          "user_id", "action_id", "completed_at", "date"
        ]);
      allow update, delete: if false;
    }

    match /rooms/{roomId} {
      allow read: if bridged();
      allow write: if false;
    }

    match /messages/{messageId} {
      allow read: if bridged();
      allow create: if bridged()
        && request.resource.data.user_id == request.auth.uid
        && request.resource.data.display_name == publicProfile(request.auth.uid).display_name
        && request.resource.data.sport == publicProfile(request.auth.uid).sport
        && request.resource.data.athlete_status == publicProfile(request.auth.uid).athlete_status
        && request.resource.data.verified == publicProfile(request.auth.uid).verified
        && request.resource.data.content is string
        && request.resource.data.content.size() > 0
        && request.resource.data.content.size() <= 2000
        && request.resource.data.keys().hasOnly([
          "room_id", "user_id", "display_name", "sport", "athlete_status",
          "content", "verified", "created_at"
        ]);
      allow update, delete: if false;
    }

    match /notifications/{notificationId} {
      allow read: if ownsExisting();
      allow create: if bridged()
        && request.resource.data.user_id == request.auth.uid;
      allow update: if ownsExisting()
        && request.resource.data.diff(resource.data).affectedKeys().hasOnly(["read"]);
      allow delete: if false;
    }

    match /push_tokens/{uid} {
      allow read: if isOwner(uid);
      allow create, update: if isOwner(uid)
        && request.resource.data.user_id == uid
        && request.resource.data.keys().hasOnly(["user_id", "token", "updated_at"]);
      allow delete: if isOwner(uid);
    }

    match /support_requests/{requestId} {
      allow read: if ownsExisting();
      allow create: if bridged()
        && request.resource.data.user_id == request.auth.uid
        && request.resource.data.status == "pending";
      allow update, delete: if false;
    }

    match /content_reports/{reportId} {
      allow read: if false;
      allow create: if bridged()
        && request.resource.data.reporter_id == request.auth.uid
        && request.resource.data.status == "open";
      allow update, delete: if false;
    }

    match /user_blocks/{blockId} {
      allow read: if bridged() && resource.data.user_id == request.auth.uid;
      allow create: if bridged()
        && request.resource.data.user_id == request.auth.uid
        && blockId == request.auth.uid + "_" + request.resource.data.blocked_user_id;
      allow update: if false;
      allow delete: if bridged() && resource.data.user_id == request.auth.uid;
    }

    match /ai_chat_sessions/{sessionId} {
      allow read: if ownsExisting();
      allow create: if bridged()
        && request.resource.data.user_id == request.auth.uid;
      allow update: if ownsExisting()
        && request.resource.data.user_id == request.auth.uid
        && request.resource.data.diff(resource.data).affectedKeys().hasOnly([
          "message_count", "updated_at"
        ]);
      allow delete: if false;

      match /messages/{messageId} {
        allow read: if bridged()
          && get(/databases/$(database)/documents/ai_chat_sessions/$(sessionId)).data.user_id
             == request.auth.uid;
        allow create: if bridged()
          && get(/databases/$(database)/documents/ai_chat_sessions/$(sessionId)).data.user_id
             == request.auth.uid
          && request.resource.data.role in ["user", "assistant"]
          && request.resource.data.content is string;
        allow update, delete: if false;
      }
    }

    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

The server-side Firebase Admin SDK bypasses these Rules. Every server route must
therefore perform its own authentication, authorization, validation, rate
limiting, and audit logging.

## 4. Historical Firebase Storage Rules target

> **Superseded (2026-08-14):** The replacement client uses the authenticated
> Next.js API and Appwrite Storage. This section is retained only to explain
> why the old direct Firebase upload must not be re-enabled.

Firebase Storage is currently not enabled. If profile photos remain on Firebase
during the compatibility window, enable and test a staging bucket first. The
target policy is:

- authenticated reads only, because community users display each other's photos;
- writes/deletes only at `profile_pics/{request.auth.uid}`;
- images only, with an explicit maximum size;
- no list access and default deny;
- App Check enforcement only after the replacement build includes and proves it.

Do not enable the production bucket merely to satisfy the old profile-photo
path. Appwrite Storage is the current staging destination; Vercel Blob is no
longer an active migration requirement.

## 5. Required emulator test matrix

**Local result (2026-08-05): passed — 16 tests across 6 suites, zero failures.**
Run `npm run test:firestore-rules`; setup and compatibility notes live in
`firebase-emulator/README.md`. The runner is locked to
`demo-third-and-manageable-rules`, requires a localhost emulator, and forwards
no application secrets, Firebase tokens, or cloud credentials.

Before any production Rules change, automated tests must continue to prove at
least:

- unauthenticated users cannot read or write any collection;
- an authenticated user can read/write only their private profile and owned
  check-ins, completions, notifications, push token, support requests, blocks,
  and AI sessions;
- owner queries succeed only when they include the `user_id == auth.uid`
  constraint required by Rules;
- cross-user private reads and writes fail;
- authenticated community reads work without exposing private `profiles`;
- message authors cannot spoof identity or verification fields;
- clients cannot set `verified`, moderation status, streak counters, support
  status, or report status;
- mention notification and account-deletion operations fail from client SDKs
  and succeed only through authenticated server handlers;
- unknown collections are denied;
- Firebase Admin test setup is isolated and never points at production.

## 6. Rollout gates

1. **Inventory and backup:** obtain aggregate document counts/field shapes,
   current indexes, and a recoverable export outside the repository.
2. **Staging — server exchange complete 2026-08-06:** separate Appwrite and
   Firebase staging projects plus a disposable Neon branch passed the protected
   server exchange. The public relay also passed synthetic Firebase sign-in,
   UID equality, and authenticated revocation. Next validate email/password on
   a device/simulator and exercise every Firestore-backed screen; validate
   Google only after its staging Appwrite provider is approved.
3. **Emulator — complete locally 2026-08-05:** candidate Rules pass all 16
   demo-project tests; rerun this gate after every Rules or query change.
4. **Client:** implement bridge bootstrap plus the server-only operations above;
   no anonymous fallback.
5. **TestFlight:** verify email/password and Google Appwrite sessions, session
   restoration, sign-out/revocation, every Firestore query, account deletion,
   realtime community, and offline/reconnect behavior. Apple stays disabled
   until its provider configuration and identity-linking plan are complete.
6. **Production bridge with old Rules:** ship the authenticated client while
   Rules remain unchanged briefly; record only aggregate bridge success/failure
   and build adoption, never user content or tokens.
7. **Adoption gate:** do not publish strict Rules until the minimum supported
   build policy makes unauthenticated clients safe to reject.
8. **Rules cutover:** publish the tested Rules, run immediate synthetic smoke
   tests, monitor denials, and keep a documented rollback artifact.
9. **Retirement:** move mobile reads/writes to the Vercel API and canonical
   database; then deny all Firestore client access and retire the bridge after
   reconciliation and the rollback window.

## 7. Access still required before implementation

- Write access to `ericthirdandmanageable-tech/third-and-manageable-app`.
- Expo organization/member access for a TestFlight-capable build workflow.
- Vercel-dashboard login to confirm the observation-only IP event. Do not enforce
  that rule until the traffic sample is reviewed.
- Appwrite permission later to create the signed revocation webhook. The token
  exchange itself can validate user JWTs without an Appwrite API key.
- Aggregate production collection field shapes and counts; no user content or
  identifiers should enter source control or chat.

## Primary references

- Appwrite JWT login: https://appwrite.io/docs/products/auth/jwt
- Appwrite webhook verification/events: https://appwrite.io/docs/apis/webhooks
- Firebase custom tokens: https://firebase.google.com/docs/auth/admin/create-custom-tokens
- Firebase session revocation: https://firebase.google.com/docs/auth/admin/manage-sessions
- Firestore Rules and queries: https://firebase.google.com/docs/firestore/security/rules-query
- Firestore field restrictions: https://firebase.google.com/docs/firestore/security/rules-fields
- Firestore Rules emulator tests: https://firebase.google.com/docs/firestore/security/test-rules-emulator
