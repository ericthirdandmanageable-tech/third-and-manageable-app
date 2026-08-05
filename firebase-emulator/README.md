# Firestore Rules Emulator Harness

This directory is local test infrastructure for the temporary Appwrite-to-Firebase
authentication bridge. It is **not** production Firebase configuration and must
not be deployed as-is.

Run from the repository root:

```bash
npm run test:firestore-rules
```

The runner has three safety locks:

1. the project ID is hard-coded to `demo-third-and-manageable-rules` and must
   start with `demo-`;
2. cloud credential environment variables are removed before Firebase starts;
3. the test process refuses to run unless `FIRESTORE_EMULATOR_HOST` is local.

The first run may download the Firestore emulator executable. Tests after that
run entirely against `127.0.0.1:8085`; they do not read or write the production
project, and the rules-unit-testing server context is an emulator-only bypass,
not a Firebase Admin credential.

## Compatibility result encoded by the suite

These shipped query shapes remain compatible:

- owner-filtered `checkins`, `completions`, `notifications`, `user_blocks`, and
  `ai_chat_sessions` queries;
- the completion count aggregate constrained by `user_id`;
- room lookup queries and school-room queries;
- room-scoped message queries;
- AI-session message ordering;
- unread-notification query plus owner-only batch updates.

These shipped client paths are intentionally incompatible with strict rules and
must change before rollout:

- other-user and mention lookups must query `public_profiles`, never `profiles`;
- profile bootstrap and trusted field updates must be reconciled with the bridge
  endpoint instead of assuming an unauthenticated client write;
- streak mutation, mention-notification writes, account deletion, moderation,
  and room administration must use authenticated server handlers;
- the realtime message listener must become room-scoped and bounded;
- repeated `user_blocks` merge writes should become deterministic create/delete
  operations (or receive a separately tested idempotent-update rule).

Passing this suite proves rule behavior only. Firebase Admin bypasses Firestore
Rules, so each future Vercel handler still needs independent authentication,
authorization, validation, rate limiting, and audit logging.
