# Direct mobile staging cutover

**Status:** direct API traffic is live and smoke-tested as of 2026-08-18. The
Appwrite Web platform uses the stable staging hostname, and replacement EAS
artifacts are available for a physical iPhone and a standalone simulator. The
legacy relay remains online only until the physical build passes authentication
and recovery checks on the registered iPhone.

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
- Updated the staging Appwrite Web platform hostname to
  `third-and-manageable-git-staging-ling-iq.vercel.app`.
- Added a standalone `preview-simulator` EAS profile. The existing
  `development-simulator` profile remains available for Metro-based debugging.
- Passed the direct live smoke for identity, Firebase compatibility, profile,
  game plan, notifications, profile images, artifacts, community, and account
  cleanup.

## EAS build evidence

- [Development simulator build
  `fb6bbc3e`](https://expo.dev/accounts/eric.thirdandmanageable/projects/third-and-manageable-app/builds/fb6bbc3e-1dfd-4563-8d8d-474802343b47)
  installed and launched successfully. It correctly opens the Expo development
  client and requires Metro.
- [Physical Preview build
  `8c46752f`](https://expo.dev/accounts/eric.thirdandmanageable/projects/third-and-manageable-app/builds/8c46752f-6376-4edb-8c18-b1f0f9d690fa)
  finished successfully. Its embedded provisioning profile contains iPhone
  UDID ending in `001E`. Its compiled bundle contains the direct staging API,
  OAuth, and recovery URLs and no legacy relay URL.
- [Standalone simulator Preview build
  `0ed29796`](https://expo.dev/accounts/eric.thirdandmanageable/projects/third-and-manageable-app/builds/0ed29796-b992-41c4-a3c3-80a0afdd08ea)
  installed on the local iPhone 17 simulator and opened the redesigned sign-in
  screen without Metro. Its compiled bundle contains no legacy relay URL.

## Remaining cutover gates

1. Install the new physical Preview build on the registered iPhone and verify
   that it launches.
2. Verify sign-in, OAuth, and password recovery on the installed physical
   build. Repeat the applicable checks on the standalone simulator build.
3. Confirm no supported build uses
   `third-and-manageable-mobile-staging.vercel.app`.
4. Remove the legacy relay's Vercel bypass secret and deployment, then delete
   the local relay checkout. Destructive removal requires a separate explicit
   confirmation at that time.

## Rollback

Until the physical replacement build passes the authentication and recovery
checks, keep the legacy relay deployment unchanged. To roll back a test build,
restore its EAS public origin variables to
`third-and-manageable-mobile-staging.vercel.app` and rebuild. Do not add a
second product-data write path or change production provider projects.
