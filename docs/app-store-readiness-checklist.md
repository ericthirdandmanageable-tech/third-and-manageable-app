# App Store Readiness Checklist

Last updated: August 14, 2026

EAS internal Preview `cab31413-a4d7-484a-bbd9-401111434756` compiled
successfully for the registered iPhone using isolated staging providers. It is
not a TestFlight or App Store submission; real-device verification remains
required.

## Implemented in app code

- In-app account deletion is available from `Profile > Delete Account`.
- Account deletion is server-owned and removes user-owned Firestore data for:
  - `profiles`, `push_tokens`, `checkins`, `completions`, `messages`, `support_requests`, `notifications`
  - `ai_chat_sessions` and nested `messages` subcollections
  - moderation data in `content_reports` and `user_blocks`
- The current Appwrite Storage profile-picture file is deleted by the server
  during account deletion.
- Active auth sessions are invalidated after deletion request.
- Registration now requires explicit acceptance of Terms and Privacy Policy.
- In-app legal screens added:
  - `/(legal)/privacy`
  - `/(legal)/terms`
- Legal links are accessible from:
  - welcome, login, register, profile, and support screens
- Community moderation controls added:
  - long-press message to `Report Message` or `Block User`
  - blocked users are filtered out from chat view
- iOS permission rationale strings added in `app.json` for camera, photos, and notifications.
- Apple sign-in option added (iOS) alongside Google sign-in.

## Required manual setup before App Review

- Configure Apple OAuth as a complete chain before enabling it: an Apple
  Service ID with the exact Appwrite callback URL, a dedicated Apple private
  key kept in approved secret custody, and the matching enabled Appwrite
  provider. Do not enable only the app UI or only one provider layer.
- Ensure hosted legal URLs are live and public:
  - `EXPO_PUBLIC_PRIVACY_POLICY_URL`
  - `EXPO_PUBLIC_TERMS_URL`
- Verify support contact email:
  - `EXPO_PUBLIC_SUPPORT_EMAIL`
- In App Store Connect, fill mandatory metadata:
  - Privacy Policy URL
  - App description, keywords, screenshots, age rating, and support URL
- Complete App Privacy nutrition labels in App Store Connect based on real data flows.
- Verify review account/demo credentials if your app requires login for review.
- Test account deletion on production backend and confirm login returns to auth flow.
- Confirm the server permanently deletes the Appwrite user, Firebase
  compatibility identity, product records, push token, and any owned profile
  photo in the staging device pass before repeating against production.
- Confirm moderation workflow is monitored (reports are reviewed and acted on).
