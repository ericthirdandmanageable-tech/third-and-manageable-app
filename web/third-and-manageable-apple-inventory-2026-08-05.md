# Third & Manageable Apple Account Inventory

Inventory date: 2026-08-05
Apple team: C.H.A.T. Express LLC
Team ID: 583NR5LZHR
Primary scope: Third & Manageable / com.thirdandmanageable.app

## Executive Summary

The Third & Manageable App Store Connect record is present and currently shows iOS 1.0 as Ready for Distribution. The Apple Developer Bundle ID is explicit and has only two enabled capabilities: In-App Purchase and Push Notifications. The App Store provisioning profile for this bundle is active and expires on 2027-02-19. The Ad Hoc provisioning profile for the same bundle is invalid, even though its displayed expiration is also 2027-02-19.

Push Notifications are enabled on the Bundle ID, but the Bundle ID detail shows APNs certificates count as 0. The account does have one APNs auth key, created 2026-07-10, scoped to all topics and usable for both sandbox and production.

Sign in with Apple is not enabled on the Third & Manageable Bundle ID. The Services ID list for Sign in with Apple is empty and shows the setup prompt, so there are no registered Services IDs visible in this account.

## App Store Connect App Record

App name: Third & Manageable
Apple ID: 6759578111
Bundle ID: com.thirdandmanageable.app
SKU: third-manageable-ios-001
Primary language: English (U.S.)
Current App Store version status: iOS 1.0 Ready for Distribution
App Store URL: https://apps.apple.com/us/app/third-manageable/id6759578111

App Information findings:

- Content rights: No, this app does not contain, show, or access third-party content.
- License agreement: Apple's Standard License Agreement.
- Age rating: 12+ globally, with Vietnam shown as 13+.
- App encryption documentation: upload/documentation area is present; no completed encryption documentation was visible from the read-only page snapshot.
- App Store Server Notifications: production and sandbox server URL fields are not configured; both show Set Up URL.
- App-specific shared secret: Manage action is available, but no secret value was read or exposed.

Account-level App Store Connect warnings visible on the Apps page:

- Payment Returned: payment was returned because the configured bank account has been closed. Banking identifiers and payment references are intentionally omitted from this repository inventory.
- Scheduled maintenance: App Store Connect unavailable for up to two hours on 2026-08-08 starting at 6:00 a.m. PDT.
- Age rating notice: Apple prompts review of new social media questions in App Information.

## TestFlight

TestFlight app: Third & Manageable
Platform: iOS
Visible TestFlight version group: 1.0.0
Tester group: TAThird and manage Test

Visible builds:

| Build | Status | Installs | Crashes |
| --- | --- | --- | --- |
| 6 | Expired | - | - |
| 5 | Expired | - | - |

There are no active TestFlight builds visible for Third & Manageable as of 2026-08-05.

## Bundle ID and Capabilities

Developer portal Bundle ID record:

- Name: Third and Manageable App
- Bundle ID: com.thirdandmanageable.app
- Bundle ID type: explicit
- Apple internal resource route: /account/resources/identifiers/bundleId/edit/ZYXT54UX5B
- Platform shown: iOS, iPadOS, macOS, tvOS, watchOS, visionOS
- App ID prefix: 583NR5LZHR (Team ID)

Enabled capabilities:

| Capability | Status | Notes |
| --- | --- | --- |
| In-App Purchase | Enabled | Checkbox is checked and disabled in the Bundle ID UI. |
| Push Notifications | Enabled | Checkbox is checked. Bundle ID page shows Certificates (0). |

Not enabled:

- Sign In with Apple is visible in the capability list but is not checked.
- Associated Domains is not checked.
- App Groups is not checked.
- iCloud is not checked.
- Apple Pay Payment Processing is not checked.
- Game Center is not checked.
- Maps is not checked.
- Siri is not checked.
- Wallet is not checked.
- WeatherKit is not checked.

## Certificates

Visible Developer account certificates:

| Certificate name | Type | Platform | Created by | Expires | Apple resource ID |
| --- | --- | --- | --- | --- | --- |
| C.H.A.T. Express LLC | iOS Distribution | iOS | Minenhle Cele | 2027-02-19 | H56BYSM6UJ |
| C.H.A.T. Express LLC | iOS Distribution | iOS | Kennickholson Vermeille | 2027-07-10 | 7469D4P9MS |

No Apple Push Notification service certificate is visible on the Third & Manageable Bundle ID. The Bundle ID Push Notifications row shows Certificates (0).

Operational note: the active Third & Manageable App Store provisioning profile expires on the same date as the Minenhle Cele iOS Distribution certificate, 2027-02-19, so that profile is likely tied to the H56BYSM6UJ distribution certificate. Apple showed "Certificates: 1 total" in the profile detail, but did not show the certificate name inline in the profile summary.

## Provisioning Profiles

Third & Manageable specific profiles:

| Profile | Platform | Type | Status | Expires | Created by | Apple resource ID |
| --- | --- | --- | --- | --- | --- | --- |
| *[expo] com.thirdandmanageable.app AppStore 2026-02-20T14:55:29.955Z | iOS | App Store | Active | 2027-02-19 | Eric Chatmon | S9D8F69W72 |
| *[expo] com.thirdandmanageable.app AdHoc 1771500042750 | iOS | Ad hoc | Invalid | 2027-02-19 | Minenhle Cele | W26Q9R9V74 |

Valid App Store profile detail:

- Status: Active
- Enabled capabilities: In-App Purchase, Push Notifications
- App ID: Third and Manageable App (com.thirdandmanageable.app)
- Certificates: 1 total
- The separately inspected and CMS-verified downloaded profile has internal
  UUID `120429ea-c45c-4407-8c9d-9fb55251ff34`, distribution certificate serial
  `4CF0E967DDA77E345A81154D2E9D4A0A`, and the same `2027-02-19` expiration.
  Expo previously displayed provisioning UUID
  `d914138b-988e-4092-aa41-b4eb61a4d66c`; do not replace or upload either asset
  until that regeneration history is reconciled.

Invalid Ad Hoc profile detail:

- Status: Invalid
- Enabled capabilities: In-App Purchase, Push Notifications
- App ID: Third and Manageable App (com.thirdandmanageable.app)
- Certificates: 1 total
- Devices: 1 total

Other visible profiles in the account:

| Profile | Platform | Type | Status / Expiration |
| --- | --- | --- | --- |
| *[expo] com.farooq.grouphomeapp AppStore 2024-04-15T14:15:20.104Z | iOS | App Store | 2025-04-15 |
| *[expo] com.grouphomes.app AppStore 2026-07-10T13:59:12.003Z | iOS | App Store | 2027-07-10 |
| Group Homes Adhoc | iOS | Ad hoc | Invalid |
| Group Homes App | iOS | App Store | Invalid |

## APNs Keys

Visible APNs/Auth key:

| Key ID | Name | Created | Updated | APNs config | APNs environment |
| --- | --- | --- | --- | --- | --- |
| ZM9KBD5N8X | Expo Push Notifications Key 20260710095918 | 2026-07-10 | 2026-07-10 | Team Scoped (All topics) | Sandbox & Production |

Implications:

- This key is account/team-scoped for all APNs topics, not limited to Third & Manageable.
- It should work for com.thirdandmanageable.app if the app backend/Expo project is configured with this key, the Team ID 583NR5LZHR, and Key ID ZM9KBD5N8X.
- There is no APNs certificate configured directly on the Bundle ID, which is fine if the app uses APNs token authentication via the key above.
- Expo/EAS currently shows no push key associated with the Third & Manageable
  project. Do not associate this team-wide key until its `.p8` custody and all
  existing consumers are known.

## Sign in with Apple

Bundle ID capability:

- Sign In with Apple is not enabled for com.thirdandmanageable.app.

Services IDs:

- The Services ID list is empty.
- The portal shows the setup prompt: register a Services ID, configure domain/return URL, and create an associated private key.

Conclusion: there is no visible Sign in with Apple configuration for Third & Manageable in this Apple Developer account.

## Account Roles

Visible App Store Connect users:

| Name | Role | App access |
| --- | --- | --- |
| Austin N. | App Manager | All Apps; invitation pending / Resend Invitation visible |
| Lucas Cardoso | App Manager | All Apps |
| Minenhle Cele | Admin | All Apps |
| Eric Chatmon | Account Holder, Admin | All Apps |
| Irem Gultekin | Admin | All Apps |
| Ken Vermeille | Admin | All Apps |

Role observations:

- The current user, Lucas Cardoso, is an App Manager in App Store Connect.
- Eric Chatmon is the Account Holder and Admin.
- Multiple Admins can manage certificates, identifiers, profiles, and access-sensitive app settings.

## Risks and Recommended Actions

1. Fix the App Store Connect payment issue.
   - The Apps page shows Payment Returned because the bank account is closed. This may affect proceeds, agreements, tax/banking state, or account operations.

2. Refresh TestFlight.
   - TestFlight builds 5 and 6 are expired. Upload a new build if external/internal beta testing is needed.

3. Confirm production release readiness.
   - iOS 1.0 is Ready for Distribution. Before release, verify pricing/availability, privacy answers, age-rating social media questions, screenshots, support URL, review credentials, and export compliance.

4. Renew before 2027-02-19.
   - The active Third & Manageable App Store provisioning profile expires 2027-02-19.
   - One iOS Distribution certificate also expires 2027-02-19.
   - Build/signing automation should be checked well before that date.

5. Clean up or regenerate the invalid Ad Hoc profile if Ad Hoc testing is still needed.
   - The Third & Manageable Ad Hoc profile is invalid despite an expiration of 2027-02-19.
   - If not needed, leave it untouched or remove during a scheduled cleanup.
   - If needed, regenerate it with a valid certificate and intended devices.

6. Keep APNs key custody documented.
   - APNs key ZM9KBD5N8X is team-scoped and can send for all topics.
   - Confirm who holds the downloaded .p8 private key, where it is stored, and which services use it.
   - Do not revoke unless all dependent push systems are ready to rotate.

7. Do not assume Sign in with Apple is configured.
   - The Bundle ID does not have Sign In with Apple enabled, and no Services IDs are registered.
   - If the app requires Apple login, enable the capability and create/configure the required Services ID/private key flow.

## Source Pages Checked

- App Store Connect apps list: https://appstoreconnect.apple.com/apps
- Third & Manageable App Information: https://appstoreconnect.apple.com/apps/6759578111/distribution/info
- Third & Manageable iOS version: https://appstoreconnect.apple.com/apps/6759578111/distribution/ios/version/deliverable
- Third & Manageable TestFlight: https://appstoreconnect.apple.com/teams/736fe934-5ff7-4924-aac4-81d37c28cc3f/apps/6759578111/testflight/ios
- App Store Connect users: https://appstoreconnect.apple.com/access/users
- Developer Bundle ID list: https://developer.apple.com/account/resources/identifiers/list
- Third & Manageable Bundle ID detail: https://developer.apple.com/account/resources/identifiers/bundleId/edit/ZYXT54UX5B
- Developer certificates: https://developer.apple.com/account/resources/certificates/list
- Developer profiles: https://developer.apple.com/account/resources/profiles/list
- Developer APNs/Auth keys: https://developer.apple.com/account/resources/authkeys/list
- Developer Services IDs: https://developer.apple.com/account/resources/identifiers/list/serviceId
