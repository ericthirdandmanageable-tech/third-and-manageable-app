# Direct mobile staging cutover

**Status:** direct API traffic is live and smoke-tested as of 2026-08-18. The
legacy relay remains online only for the already-built IPA until the Appwrite
Web platform is updated and a replacement EAS build passes device checks.

## Destination

The replacement Expo client now uses this path:

```text
Expo staging build
    ↓ fresh Appwrite JWT per request
https://third-and-manageable-git-staging-ling-iq.vercel.app
    ↓ Next.js Route Handlers validate the JWT
isolated staging Appwrite, Firestore, and Appwrite Storage
```

The Vercel project no longer uses Vercel Authentication. Application routes
still require their existing Appwrite session, Appwrite JWT, verification, or
admin checks. Preview environment guards require the staging Appwrite project
`69906dfc003364b9847e` and Firebase project
`third-and-manageable-staging`.

## Completed changes

- Disabled Vercel Authentication for the `third-and-manageable` project.
- Created the `staging` Git branch and its stable Vercel Preview alias.
- Added `/oauth.html` and `/recovery.html` to `3rd_and_manageable` with
  no-store, no-referrer, and restrictive Content Security Policy headers.
- Updated the Expo `development` and `preview` environments to use the direct
  origin. The product API base is the origin's `/api` path.
- Updated the replacement mobile worktree and its fail-closed environment
  checks to reject the retired relay origin.
- Passed the direct live smoke for identity, Firebase compatibility, profile,
  game plan, notifications, profile images, artifacts, community, and account
  cleanup.

## Remaining cutover gates

1. Change the staging Appwrite Web platform hostname from
   `third-and-manageable-git-main-ling-iq.vercel.app` to
   `third-and-manageable-git-staging-ling-iq.vercel.app`.
2. Build and install a new EAS development-simulator artifact.
3. Register the personal iPhone if needed, then build and install a new EAS
   Preview artifact.
4. Verify OAuth and password recovery on the installed build.
5. Confirm no supported build uses
   `third-and-manageable-mobile-staging.vercel.app`.
6. Remove the legacy relay's Vercel bypass secret and deployment, then delete
   the local relay checkout. Destructive removal requires a separate explicit
   confirmation at that time.

## Rollback

Until the replacement build passes device checks, keep the legacy relay
deployment unchanged. To roll back a test build, restore its EAS public origin
variables to `third-and-manageable-mobile-staging.vercel.app` and rebuild. Do
not add a second product-data write path or change production provider projects.
