# Appwrite → Firebase Authentication Bridge and Firestore Rules Design

**Status:** the Rules remain local-only; the token route and provider adapters
are implemented and mocked locally — **do not deploy or publish to production.**

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
the dependency boundary in `src/lib/mobile-auth-bridge.ts` and the Appwrite /
Firebase Admin adapters in `src/lib/mobile-auth-providers.ts`. The 17 tests in
`tests/mobile-auth-{bridge,providers}.test.ts` make no live provider calls. The
canonical identity upsert in step 4 and production-grade rate limiting remain
required before staging.

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

The replacement Expo client must initialize Firebase Auth persistence and
complete the token exchange before rendering any Firestore-backed screen:

1. Restore and verify the Appwrite session with `account.get()`.
2. Create an Appwrite JWT with `account.createJWT()`.
3. Exchange it at the bridge endpoint.
4. Call Firebase `signInWithCustomToken()`.
5. Verify `firebaseUser.uid === appwriteUser.$id`.
6. Only then allow profile, check-in, community, notification, or AI-history
   hooks to issue Firestore requests.

If any step fails, fail closed and show a retry/sign-in state. Never fall back
to anonymous Firestore access.

New-client sign-out order:

1. Call a server revocation endpoint while the Appwrite JWT is still valid.
2. Server calls Firebase Admin `revokeRefreshTokens(appwriteUserId)`.
3. Client signs out of Firebase Auth.
4. Client deletes the Appwrite session.

Also create a signed Appwrite webhook for `users.*.sessions.*.delete` and
`users.*.update.status` that revokes Firebase refresh tokens. Treat webhook
delivery as defense in depth: authenticate its signature, make handling
idempotent, and audit failures without logging payload secrets.

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
| Profile-photo code calls a Firebase Storage bucket that is not enabled | Keep upload disabled until the bucket, lifecycle, App Check plan, and Storage Rules are tested |
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
passed the local emulator matrix below. It must still be reconciled against
sampled production field shapes before any staging or production deployment.

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

## 4. Storage Rules target

Firebase Storage is currently not enabled. If profile photos remain on Firebase
during the compatibility window, enable and test a staging bucket first. The
target policy is:

- authenticated reads only, because community users display each other's photos;
- writes/deletes only at `profile_pics/{request.auth.uid}`;
- images only, with an explicit maximum size;
- no list access and default deny;
- App Check enforcement only after the replacement build includes and proves it.

Do not enable the production bucket merely to satisfy the currently broken
profile-photo path. Vercel Blob remains the final migration target.

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
2. **Staging:** use a separate Firebase staging project and test Appwrite users;
   enable Firebase Auth/custom-token exchange there first.
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
- A Firebase staging project or authorization to create one.
- Firebase project IAM sufficient to initialize Firebase Auth, create a
  least-privilege token-signing runtime identity, inspect Rules/indexes, and
  deploy Rules only after approval.
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
