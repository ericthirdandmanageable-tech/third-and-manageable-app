# Staging safety boundary

The mobile app has a staging boundary inside the EAS default environments (this
Expo account plan does not support custom EAS environments).

- `development` uses the EAS `development` environment, and `preview`/`staging` use the EAS `preview` environment. Both default environments are populated only with staging values.
- `production` is the only profile that selects the EAS `production` environment.
- There is intentionally no `submit.staging` profile. Staging builds are internal distributions and cannot be submitted with the production submit profile by accident.
- Staging must use Appwrite project `69906dfc003364b9847e`, Firebase project `third-and-manageable-staging`, and the public `third-and-manageable-git-staging-ling-iq.vercel.app` Preview deployment.
- Staging must not contain any `EXPO_PUBLIC_GEMINI_API_KEY`; AI credentials are
  server-only.
- `EXPO_PUBLIC_PRODUCT_API_URL` must be the direct deployment's `/api` path.
  The app must never contain a Vercel protection-bypass secret.

Before local development, keep the staging-only `.env.local` beside this
project and run:

```bash
npm run check:staging-env
```

The check fails closed if the staging file is missing, points to a production
backend, omits the authenticated product API, or contains a Gemini key.

The `build:dev*`, `build:staging`, and `build:preview*` scripts first load the
selected EAS cloud environment and run the same fail-closed check against those
injected values. This prevents a correct local `.env.local` from hiding a stale
or incomplete cloud build environment.
