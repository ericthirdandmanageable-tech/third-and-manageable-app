# App Store Readiness Checklist

Last updated: February 21, 2026

## Implemented in app code

- In-app account deletion is available from `Profile > Delete Account`.
- Account deletion now removes user-owned Firestore data for:
  - `profiles`, `push_tokens`, `checkins`, `completions`, `messages`, `support_requests`, `notifications`
  - `ai_chat_sessions` and nested `messages` subcollections
  - moderation data in `content_reports` and `user_blocks`
- Profile photo storage object (`profile_pics/{userId}`) is deleted on account deletion.
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

- Configure OAuth Apple provider in Appwrite project settings so Apple login succeeds.
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
- If you require permanent Appwrite auth-user deletion (not only disable + session revocation), add a privileged backend endpoint/function that deletes the Appwrite user by ID.
- Confirm moderation workflow is monitored (reports are reviewed and acted on).
