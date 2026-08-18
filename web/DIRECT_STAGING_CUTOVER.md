# Direct mobile staging cutover

**Status:** complete as of 2026-08-18. Direct API traffic is live and
smoke-tested, the replacement physical Preview build passed device sign-in and
recovery checks, and the legacy relay has been retired. The Appwrite Web
platform and Expo staging builds use the stable staging hostname directly.

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
- Passed physical-device authentication and recovery checks on build `11`,
  including Sign in with Apple and Google sign-in.
- Deleted the Vercel project `third-and-manageable-mobile-staging`. Its former
  stable hostname returns `404`, and the live web project has no relay bypass
  environment variable.
- Removed `third-and-manageable-staging-relay` from the workspace. Its clean
  Git checkpoint `edcd19d5aba4` is recoverable from the macOS Trash until the
  Trash is emptied.

## EAS build evidence

- [Development simulator build
  `fb6bbc3e`](https://expo.dev/accounts/eric.thirdandmanageable/projects/third-and-manageable-app/builds/fb6bbc3e-1dfd-4563-8d8d-474802343b47)
  installed and launched successfully. It correctly opens the Expo development
  client and requires Metro.
- Superseded [physical Preview build
  `8c46752f`](https://expo.dev/accounts/eric.thirdandmanageable/projects/third-and-manageable-app/builds/8c46752f-6376-4edb-8c18-b1f0f9d690fa)
  finished successfully. Its embedded provisioning profile contains iPhone
  UDID ending in `001E`. Its compiled bundle contains the direct staging API,
  OAuth, and recovery URLs and no legacy relay URL. It cannot install on the
  newer registered phone.
- [Replacement physical Preview build
  `fe86da59`](https://expo.dev/accounts/eric.thirdandmanageable/projects/third-and-manageable-app/builds/fe86da59-09d9-411f-95da-5d338924558a)
  finished successfully as app version `1.0.1`, build `11`. Inspection of the
  downloaded IPA confirms bundle ID `com.thirdandmanageable.app`, Apple team
  `583NR5LZHR`, and a provisioning profile for both iPhones, with UDIDs ending
  in `001E` and `401C`. Its compiled bundle contains the direct staging Vercel
  origin, isolated staging Appwrite and Firebase project IDs, and no legacy
  relay URL.
- [Standalone simulator Preview build
  `0ed29796`](https://expo.dev/accounts/eric.thirdandmanageable/projects/third-and-manageable-app/builds/0ed29796-b992-41c4-a3c3-80a0afdd08ea)
  installed on the local iPhone 17 simulator and opened the redesigned sign-in
  screen without Metro. Its compiled bundle contains no legacy relay URL.

## Cutover result

The registered physical iPhone installed and launched build `fe86da59` without
an integrity error. Device tests passed for email authentication, password
recovery, Sign in with Apple, and Google sign-in. The inspected IPA uses the
direct staging origin and contains no relay reference. The relay retirement is
therefore complete.

## Rollback

The deleted relay is no longer a rollback path. To roll back a staging client,
build the last known-good mobile commit against the direct staging hostname and
the same isolated Appwrite and Firebase projects. Do not recreate the relay,
add a second product-data write path, or change production provider projects.
