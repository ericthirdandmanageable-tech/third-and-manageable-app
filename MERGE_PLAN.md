# Unified app merge plan

## Product direction

The Expo application owns the signed-in native experience, device integrations,
and App Store delivery path. The Next.js redesign owns the canonical
authenticated product API and supported web/admin experience. Repository
histories stay separate; both clients share Appwrite identity and isolated
staging Firestore data through the server boundary.

The refreshed interface uses university-specific color signals inside one shared material system. On iOS 26 it renders native Liquid Glass; older iOS and web receive blur-backed surfaces; Android receives performant translucent materials; and Reduce Transparency receives opaque, high-contrast surfaces.

## Feature merge status

| Product area | Expo foundation | Next.js concept absorbed | Unified implementation |
| --- | --- | --- | --- |
| Identity and onboarding | Appwrite auth and athlete profile | University selection and contextual brand | Glass auth flow, searchable university selection, persisted school theme |
| Daily support | Check-ins, Gemini response, Firestore history | Distinct coaching voices | Four-persona Clipboard with the existing private response pipeline |
| Career planning | Existing Game Plan tab | Story-first intake, path ranking, commitments | Three-step intake, explainable recommendations, path detail, saved next action |
| Progress | Existing streak and activity data | Shareable progress artifacts | Journey map plus private, locally rendered Day Counter share card |
| Community | Athlete community and support routes | Team-oriented information architecture | Team destination with glass surfaces and preserved community capabilities |
| Navigation | Expo Router tabs | Clearer product pillars | Home, Team, Check-in, Plan, and Coach floating glass navigation |
| University branding | Initial school theme work | Dynamic campus identity | CSU, CWRU, BGSU, and neutral themes with a free-form university fallback |

## Architecture decisions

- Keep Expo Router as the only client navigation layer.
- Keep Appwrite as the current account system. The mobile client calls the
  public staging Next.js routes directly with short-lived Appwrite JWTs; the
  Firebase token exchange remains a compatibility endpoint in that API.
- Keep Firestore as the canonical product store while routing all replacement-client product access through authenticated Next.js handlers.
- Keep Gemini and provider credentials behind the server boundary.
- Centralize theme tokens in `constants/app-theme.ts` and expose accessibility-aware runtime values through `context/app-theme.tsx`.
- Route every reusable card, header, and action through the shared Liquid Glass primitives rather than screen-specific blur implementations.
- Use progressive enhancement for materials so UI behavior stays consistent when native glass is unavailable.
- Generate share artifacts locally and avoid putting private athlete content in public URLs.

## Completed first slice

- Created an isolated `codex/unified-liquid-glass` worktree branch without disturbing either original checkout.
- Applied the in-progress university theme foundation to the isolated worktree.
- Rebuilt the root provider stack, typography, floating navigation, welcome flow, authentication, onboarding, home, check-in, community, career planning, progress, profile, support, perks, notifications, and legal screens around the shared material system.
- Added the Clipboard coach, story-first career intake, skill translation data, career path ranking, path details, persisted commitments, university search, and shareable Day Counter artifact.
- Added unit coverage for theme resolution, career ranking, skill mapping, and mobile auth bridge behavior.
- Reconciled the native FileSystem dependency so Expo and Appwrite share one installed version while Appwrite alone resolves the compatible legacy API.
- Built EAS iOS internal Preview `cab31413-a4d7-484a-bbd9-401111434756`
  successfully against the isolated staging cloud environment for the
  registered iPhone. No TestFlight/App Store submission was made.

## Next delivery slices

1. Run VoiceOver, Dynamic Type, Reduce Motion, Reduce Transparency, contrast,
   low-memory, and representative Android device passes.
2. Install the finished EAS Preview build on the registered iPhone, then
   exercise OAuth, recovery, push tokens, profile uploads, polling, and the
   checks above on that real staging device.
3. Decide whether the richer career forums replace or complement legacy rooms;
   do not dual-write the two community models.
4. Add the next shareable artifact templates and managed university directory.
5. Retire Firebase custom-token compatibility only after old-client telemetry
   and rollback criteria are satisfied.

## Release boundary

This branch is a working native integration slice, not a production rollout. It
has an internal EAS Preview IPA for the registered device, but it deliberately
does not push, merge, alter App Store Connect, or upload a TestFlight build.
Because native glass, blur, sharing, and view capture modules were added, any
future TestFlight build must be a new native binary rather than a
JavaScript-only update.
