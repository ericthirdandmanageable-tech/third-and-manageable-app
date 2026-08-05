# Appwrite Apple Platform Preservation Inventory

**Project:** `third and manageable`
**Project ID:** `69906e3f0020c208d8e7`
**Endpoint/region:** `https://fra.cloud.appwrite.io/v1` / Frankfurt
**Production bundle ID:** `com.thirdandmanageable.app`

## Safety rule

Do not delete, rename, or edit any Apple platform until the platform used by
the shipped App Store build is positively identified and a replacement build
has passed TestFlight. The original platform is approximately six months old;
all recently created duplicates remain untouched during inventory.

## Known state

- Four Apple/iOS platforms use the same bundle ID.
- Platform `6990c81edd5bbeb8502e` is the oldest, matches the age of the shipped
  app, and is the **PRESERVE** platform.
- The three August 2026 platforms are **HOLD** duplicates created during
  access/onboarding work.
- Source commit `5b37d367c7119961ca98cd52645fdc79c3499626` configures
  `Client.setPlatform("com.thirdandmanageable.app")` through
  `EXPO_PUBLIC_APPWRITE_PLATFORM`.
- Appwrite Google OAuth is enabled; Apple OAuth is disabled and unconfigured.

## Completed console capture

| Preserve? | Platform ID | Name | Type | Bundle ID | Created (ID-derived) | UI last updated | Notes |
|---|---|---|---|---|---|---|---|
| **PRESERVE** | `6990c81edd5bbeb8502e` | `iOS` | Apple | `com.thirdandmanageable.app` | `2026-02-14T19:08:14Z` | 6 months ago | Original/shipped platform; do not edit or delete |
| **HOLD** | `6a72715a000a8eae9a59` | `iOS` | Apple | `com.thirdandmanageable.app` | `2026-08-04T23:10:18Z` | 21 hours ago | Duplicate; do not delete yet |
| **HOLD** | `6a737c0500343aa54f6f` | `iOS` | Apple | `com.thirdandmanageable.app` | `2026-08-05T18:08:05Z` | 2 hours ago | Duplicate; do not delete yet |
| **HOLD** | `6a737cc10012451f9dff` | `iOS` | Apple | `com.thirdandmanageable.app` | `2026-08-05T18:11:13Z` | 2 hours ago | Duplicate; do not delete yet |

Appwrite did not expose exact `$createdAt` or `$updatedAt` values in the
inspected UI. The exact creation timestamps above were independently reproduced
from the timestamp-encoded first eight hexadecimal characters of each Appwrite
platform ID. The relative update ages are the values visible in the console.
No additional association or status metadata was visible.

## Read-only Chrome request

Paste this into the Codex session that can control the signed-in Appwrite tab:

> In Appwrite project `69906e3f0020c208d8e7`, perform a strictly read-only
> inventory of Settings → Platforms. For every Apple/iOS platform whose bundle
> ID is `com.thirdandmanageable.app`, record its platform ID, display name,
> platform type, bundle ID, creation timestamp, update timestamp, and any visible
> association/status metadata. Open details only as needed to reveal IDs. Do not
> click Save, Update, Delete, Add platform, regenerate, or change any setting.
> Clearly identify the oldest platform as PRESERVE and all newer duplicates as
> HOLD. Do not expose cookies, tokens, secrets, or user data.

## Cleanup gate (later)

A duplicate becomes eligible for deletion only when all are true:

1. Its platform ID and timestamps are recorded above.
2. It is not the oldest/shipped platform.
3. Source, EAS environment, OAuth bridge configuration, and TestFlight all use
   the preserved bundle identifier successfully.
4. Appwrite sign-in and session restoration pass on an installed TestFlight
   build, not only Expo Go.
5. A project owner approves the exact platform ID to delete.
6. A before/after screenshot or export is retained outside source control.

Until then, duplicates are operational clutter, not an incident, and preserving
the working platform is more important than tidiness.
