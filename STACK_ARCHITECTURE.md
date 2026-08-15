# Third & Manageable stack architecture

**Status:** authoritative as of 2026-08-14.

## Repository boundary

The product intentionally remains split across repositories:

- `3rd_and_manageable`: ground-up Next.js redesign, Vercel Preview, and the
  supported web/admin API implementation.
- `third-and-manageable-app` plus its Expo worktrees: native iOS product,
  EAS/TestFlight/App Store source, and production mobile release lineage.
- `third-and-manageable-staging-relay`: narrowly scoped public relay used by
  mobile staging builds to reach the protected Vercel Preview auth bridge.

Histories are not merged. Shared behavior is ported deliberately and verified
against the same staging integrations.

## Current backend decision

Appwrite and Firebase are the active backend stack.

| Concern | Provider | Preview boundary |
| --- | --- | --- |
| Athlete identity and sessions | Appwrite Auth | `69906dfc003364b9847e` |
| Product data | Firebase Firestore | `third-and-manageable-staging` |
| Old-client Firebase compatibility | Firebase Auth custom tokens | Minted only after a verified Appwrite JWT |
| Web runtime and API | Next.js Route Handlers on Vercel | Preview deployments only |
| Coaching AI | Vercel AI Gateway | Server-side deployment OIDC |
| Verification email | Gmail SMTP | Preview-only account/App Password |
| Native delivery | Expo/EAS and App Store Connect | Existing EAS project and bundle ID; staging env for preview builds |

The Next.js production deployment is not allowed to use staging credentials.
`INTEGRATION_ENVIRONMENT`, `APPWRITE_PROJECT_ID`, and `FIREBASE_PROJECT_ID` are
validated at runtime. Preview fails closed if the documented staging IDs do not
match, and Production fails closed if configured as staging.

## Authentication flow

1. The browser submits credentials only to same-origin Next.js Route Handlers.
2. The server creates an Appwrite session with a staging-only, least-privileged
   API key.
3. Only the Appwrite session secret is placed in a Secure, HttpOnly,
   SameSite=Strict cookie named `a_session_<project-id>`.
4. Every authenticated request resolves the current Appwrite account and uses
   its `$id` as the universal Firestore owner ID.
5. Native staging creates a fresh, short-lived Appwrite JWT for every product
   API request. Next.js validates it with Appwrite and uses the account `$id`
   directly; there is no separate mobile session database.
6. Older mobile behavior may also exchange that JWT for a Firebase custom
   token with the same UID. Email is never used to link identities, and new
   product domains do not require a Firebase client session.

The retired browser bearer JWT and `JWT_SECRET` are gone. A localStorage value
remains only as a non-secret UI hydration hint; it is not a credential.

The server-side Appwrite key requires exactly `sessions.write`, `users.read`,
`users.write`, `files.read`, and `files.write`. It must exist only in Vercel
Preview and must never use the production Appwrite project.

## Firestore product model

The web redesign uses the native collection names whenever the product concepts
match:

- `profiles/{appwriteUid}`
- `checkins`
- `completions`
- `ai_chat_sessions/{uid_date}/messages`
- `rooms`, `messages`, `support_requests`, `notifications`, `push_tokens`

The richer web community model adds server-only collections:
`forum_memberships`, `posts`, `comments`, `post_votes`, and `comment_votes`.
Verification and operations use `verification_requests`,
`auth_identity_mappings`, and append-only `admin_audit_logs`.

Firestore Admin uses Vercel OIDC → Google Workload Identity Federation in
Preview. Appwrite Storage owns public profile images through the server-only
Appwrite key. No long-lived Firebase private key belongs in Vercel.
The replacement mobile client reaches product data only through the
path-restricted relay and authenticated Next.js Route Handlers. Released older
clients retain the strict Rules/custom-token compatibility contract; Next.js
does not rely on client-side Rules for authorization.

## Mobile product API convergence

The previous Neon-centered target diagram is superseded. The implemented path
is:

```text
Appwrite provider session
        ↓ fresh Appwrite JWT per request
public staging relay (path/method allowlist only)
        ↓ Vercel protection bypass kept server-side
Next.js validates JWT with Appwrite
        ↓ Appwrite UID is canonical identity
Next.js Route Handlers
        ↓
isolated staging Firestore / Appwrite Storage
```

All five migration slices now use this path in the replacement client:
profile/identity; check-ins and Clipboard; career intake/paths/commitments;
community/moderation/support; notifications, push tokens, and profile-picture
artifacts. Gemini is server-only through Vercel AI Gateway. Community realtime
uses authenticated five-second polling for now; no database credential is
shipped to the new client.

## Other staging integrations

No additional provider projects are recommended right now:

- Email already has a Preview-only Gmail transport. Resend plus a verified
  sending domain is the recommended future production email path.
- AI Gateway is already deployment-scoped and server-side; a second Google
  Gemini project or public API key would weaken the boundary.
- Expo/EAS should keep the existing project so signing and App Store lineage
  remain intact. Preview/TestFlight builds select staging Appwrite/Firebase
  variables through EAS profiles rather than creating a second Expo project.
- Apple and Google OAuth stay configured on the staging Appwrite project for
  preview builds and on production Appwrite for released builds.

## Neon as a future option

Neon is not an active backend, dependency, environment variable, migration, or
test target. On 2026-08-14 the Vercel project was disconnected from the
`third-and-manageable-db` Marketplace resource. The resource itself was retained
and is reconnectable; no application code can currently use it.

Reconsider Neon only if Firestore becomes a measured constraint—for example,
cross-collection analytics, relational reporting, or transaction patterns that
cannot be expressed safely and economically in Firestore. A future proposal
must include an explicit source-of-truth decision, migration/reconciliation
plan, rollback path, and mobile compatibility story. It must not reintroduce
dual writes implicitly.

## Preview integration status

The required external setup is complete:

- Appwrite Preview key: `sessions.write`, `users.read`, `users.write`,
  `files.read`, and `files.write` only.
- Vercel Preview WIF service account: `roles/datastore.user` and Firebase
  Authentication Admin only.
- Appwrite bucket `profile-pictures` has file security enabled. The
  authenticated server creates each image with a public-read per-file
  permission; only the server key has `files.read`/`files.write`.
- Preview admin password/session secrets are separate Sensitive variables.
- The staging relay production alias is intentionally the public staging
  ingress; it currently forwards only to the protected Preview deployment.

Production environment variables and provider projects were not changed.

## Verification gates

Before a Preview is considered usable:

```bash
npm test
npm run test:firestore-rules
npx tsc --noEmit
npm run lint
npm run build
npm run check:audit
npm run check:vercel-manifest
npm run smoke:preview -- https://<protected-preview-url>
```

`/api/health` performs bounded reads against both Appwrite and Firestore. It
returns HTTP 503 with `status: degraded` if either backend, credential, or
isolation boundary is unavailable, so the smoke stops before creating data.

The smoke creates a synthetic Appwrite/Firebase user, exercises onboarding,
check-in, game plan, profile-image upload, and all admin views, then removes
that synthetic account, its Firestore data, and its Appwrite Storage image
through the authenticated account-deletion route.

Verified live on 2026-08-14:

- Protected Preview:
  `https://third-and-manageable-51vcoiuwe-ling-iq.vercel.app`
- Public mobile staging relay:
  `https://third-and-manageable-mobile-staging.vercel.app`
- EAS iOS internal Preview build:
  `cab31413-a4d7-484a-bbd9-401111434756` (version `1.0.1`, build `11`),
  installable on the registered iPhone through the Expo build page until
  2026-08-28.
- Protected web smoke passed session auth, Firestore product writes, all six
  admin views, Appwrite Storage upload, and post-account-deletion file cleanup.
- Mobile stack smoke passed identity, Firebase compatibility, profile/game
  plan, notifications, artifacts, community, and account cleanup before the
  profile-image step was added. Relay multipart forwarding has a passing
  contract test, and the exact upstream profile-image path is live-proven; a
  repeat full mobile run is temporarily deferred after Appwrite rate-limited
  repeated synthetic account creation.
- The EAS Preview environment was checked directly before build; it contains
  the staging Appwrite/Firebase IDs and the path-restricted product API base,
  contains no mobile Gemini key, and no longer contains the obsolete Firebase
  Storage variable. The resulting IPA compiled successfully, and inspection of
  its packaged JavaScript confirmed the staging IDs and full relay path while
  finding neither the production Appwrite ID nor a Gemini environment key. It
  was not submitted to TestFlight or App Store Connect.

At least seven synthetic accounts were visible in staging after failures
discovered before cleanup routing was fixed (six `relay-smoke-*` accounts and
one `preview-route-smoke-*` account). They have no active session path;
removing them in Appwrite Console remains a manual destructive cleanup that
requires explicit confirmation.
