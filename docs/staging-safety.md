# Staging safety boundary

The mobile app has a staging boundary inside the EAS default environments (this
Expo account plan does not support custom EAS environments).

- `development` uses the EAS `development` environment, and `preview`/`staging` use the EAS `preview` environment. Both default environments are populated only with staging values.
- `production` is the only profile that selects the EAS `production` environment.
- There is intentionally no `submit.staging` profile. Staging builds are internal distributions and cannot be submitted with the production submit profile by accident.
- Staging must use Appwrite project `69906dfc003364b9847e`, Firebase project `third-and-manageable-staging`, and the `third-and-manageable-mobile-staging.vercel.app` auth bridge.
- Staging must not contain the production Gemini key. Use a separate staging key or leave Gemini unset while testing.

Before creating a staging build, keep the local staging-only `.env.local` beside this project and run:

```bash
npm run check:staging-env
```

The check fails closed if the staging file is missing, points to a production backend, or contains a Gemini key that has not been explicitly separated for staging.
