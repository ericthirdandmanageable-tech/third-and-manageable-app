Bottom line
There are five folders, but only two real Git histories:
1. 3rd_and_manageable — canonical web/backend/admin repository.
2. third-and-manageable-app — canonical Expo/mobile repository.
3. third-and-manageable-unified-liquid-glass — a worktree and branch of third-and-manageable-app, not a separate repository.
4. third-and-manageable-staging-relay — a small, deployed but currently unversioned staging service.
5. third-and-manageable-admin-main — the original client admin export, now superseded by 3rd_and_manageable.
The correct consolidation target is therefore two long-lived product repositories plus a versioned temporary relay—not five competing repos.
Repository comparison
Folder	Purpose and current state	Recommendation
3rd_and_manageable	Next.js 16 web athlete app, admin portal, Route Handler API, Neon schema, mobile auth bridge, migrations, and security documentation. UI-redesign is pushed and contains both the Next.js/Neon cutover and web theming work.	Keep as canonical backend, admin, web, migrations, and product-contract repository. Merge UI-redesign into main after release-gate cleanup.
third-and-manageable-staging-relay	Thirteen-file Vercel relay exposing only mobile token exchange/revocation plus OAuth/recovery handoff pages. Tests pass. It is not under Git.	Put it in a private Git repository immediately, or under a clearly isolated deploy root in 3rd_and_manageable. Preserve its separate Vercel/security boundary.
third-and-manageable-unified-liquid-glass	Local worktree on codex/unified-liquid-glass, four commits ahead of mobile main, plus five uncommitted QA fixes. Contains the intended replacement mobile experience. No upstream is configured, so its commits are local-only.	This is the mobile release candidate branch. Commit the remaining fixes, push it to the canonical mobile remote/fork, and review it as a PR against mobile main.
third-and-manageable-admin-main	Original client Firebase admin export. Its application code exactly matches the historical baseline already imported into 3rd_and_manageable.	Archive after credential cleanup. No application code needs carrying forward.
third-and-manageable-app	Client’s canonical Expo repository and source of TestFlight build 8. main has an uncommitted early theming prototype and auth/build hardening.	Preserve as the canonical mobile Git history. The liquid-glass branch should merge here, not become a new independent repository.
How the products differ technically
The largest difference is not visual—it is the system of record.
Area	Web/backend repo	Mobile/liquid-glass repo
Identity	Web email/password bearer tokens and Neon users; canonical identity mapping and Appwrite bridge support	Appwrite account/session, then Appwrite JWT → Firebase custom-token bridge
Product data	Neon/Postgres through Next.js Route Handlers	Direct Firestore reads/writes
Admin	Reads and mutates Neon	Mobile reports/messages remain in Firestore, so the new admin does not yet see live mobile data
AI	Server-side Vercel AI Gateway	Gemini called directly from the device with EXPO_PUBLIC_GEMINI_API_KEY
Community	Forums, posts, comments, votes, memberships	Realtime rooms/messages, mentions, blocks, reports, support requests
Career planning	Server-persisted intake, paths, commitments, actions	Daily-action completions in Firestore; new career intake and commitment are only in AsyncStorage
School directory	3,879 institutions and more rigorous contrast derivation	99 cached institutions with free-form fallback
Theming	CSS-token replacement for web shell, automatic WCAG contrast adjustment	Native iOS 26 glass, blur fallback, Android translucent surfaces, Reduce Transparency support
Release path	Protected Vercel Preview; production data/compliance gates remain	Existing App Store record and bundle ID; build 8 in TestFlight, build 11 represented locally in the liquid-glass worktree
This means UI parity alone is insufficient. The web and mobile products currently expose similar concepts while writing to different data stores with different schemas.
What the liquid-glass branch already preserves
The important existing mobile connections remain present:
* Email/password, Google, and Apple Appwrite authentication.
* OAuth callback and password recovery handoffs.
* Firebase session bootstrapping and revocation.
* Profile creation/editing, profile photos, verification requests, reminders, sign-out, and account deletion.
* Daily check-ins, streaks, Gemini responses, chat history, and notifications.
* Realtime global/school community rooms, mentions, reporting, blocking, and support requests.
* Daily game-plan actions and completion tracking.
* Progress, perks, support resources, legal screens, and push-token registration.
It also adds:
* Home, Team, Check-in, Plan, and Coach glass navigation.
* Standalone Clipboard coach.
* Career intake, ranked paths, path details, and local commitments.
* Shareable Day Counter artifact.
* Searchable university onboarding.
* Legacy Neon, Sideline Dusk, and Campus Colors.
* Native Liquid Glass and accessibility-aware material fallbacks.
So the liquid-glass work is not merely a mockup. Most old mobile service wiring survived the redesign.
Local work in the excluded repositories
third-and-manageable-app
The dirty main checkout contains the first theming foundation:
* Theme constants/provider and Profile appearance selector.
* CSS-variable-backed NativeWind colors.
* Transparent screen surfaces and themed tab bar.
* Stable auth-context callbacks.
* Password-recovery variable compatibility.
* EAS command/script cleanup.
Those ideas are all already incorporated and expanded in the liquid-glass branch. There is no unique product feature in this dirty checkout that should be manually overlaid onto the liquid-glass worktree.
I would still preserve it as an archival commit or patch before cleaning the checkout. Do not merge it wholesale over the liquid-glass branch; that would reintroduce the older partial implementation.
third-and-manageable-admin-main
There are no unique source changes worth carrying forward. Its only meaningful local difference from the captured baseline is an unsafe env.example containing credential-like values. Do not copy that file. The sanitized configuration and hardened admin implementation in 3rd_and_manageable are the correct versions.
The legacy Firebase service-account credential should still be treated as requiring revocation/rotation, even though it is no longer present in the canonical repository.
Important parity and production gaps
P0: fix before further TestFlight promotion
1. Profile navigation is broken for verified users.The new navigation replaced Profile with Coach and hides the Profile route. The only visible link I found is the community “Request Verification” prompt, which disappears once verified. That can make appearance, reminders, legal links, profile editing, sign-out, and account deletion unreachable.
2. Five liquid-glass fixes remain uncommitted.They include important accessibility/layout changes and the cssInterop adapter needed for className styles on GlassSurface.
3. The liquid-glass branch is local-only.Its four commits have no upstream. This is the most immediate source-loss risk.
4. The staging relay is unversioned.It is small, security-sensitive, and part of the working authentication chain.
5. The theme conversion is incomplete.I counted 122 hard-coded color occurrences in app/components. Check-in, Community, Notifications, Perks, and Profile remain especially dependent on legacy colors and NativeWind classes. The themes can therefore produce mixed old/new surfaces.
6. Campus Colors can be selected without an eligible verified school.The UI describes the palette as locked behind verification, but the option is still enabled and silently resolves to the T&M fallback.
Backend/integration parity
* Mobile Firestore data and the Neon admin are not connected.
* Career intake and career-path commitment are device-local and unavailable across devices or to administrators.
* Gemini remains client-side with a public key; the web implementation already has the safer server-side Gateway pattern.
* Production Firebase Auth is not initialized, and strict Rules remain cutover-gated. The liquid-glass replacement cannot simply be pointed at production.
* The Appwrite webhook/revocation public callback lifecycle is incomplete.
* The push sender appears source-only and internally inconsistent: its README calls it an Appwrite function, while its implementation uses Firebase Admin. Remote push delivery is not proven.
* Mobile crash reporting, backend alerting, and product analytics remain undefined.
* The mobile app has Reduce Transparency handling, but not a completed Reduce Motion, Dynamic Type, dark-mode, Android-device, or broad VoiceOver pass.
* userInterfaceStyle is automatic, while the glass implementation explicitly uses light materials. Either support dark mode deliberately or force a light appearance for this release.
Product-content gaps
* The web university registry has 3,879 entries; mobile has 99.
* School brand palettes are duplicated and implemented differently.
* Mobile career paths, ranking, skills, and copy are static/local.
* The “Private Circles” launch interest is saved, but there is no implemented private-circle product.
* Apple Health, Strava, and Terra remain intentionally unconnected.
* The mobile README is still Expo boilerplate, and some readiness documents mix historical and current claims.
Recommended consolidation architecture
Do not combine Next.js and Expo into one application repository. Their build, deployment, release, and native-signing lifecycles are too different.
Use:
* 3rd_and_manageable
    * Next.js APIs
    * Neon schema/migrations
    * admin
    * web athlete experience
    * canonical identity logic
    * product contracts and school-brand records
* third-and-manageable-app
    * Expo/mobile source
    * liquid-glass branch and future mobile releases
    * native notification, sharing, camera, and device integrations
* A private, versioned staging-relay repository
    * temporary only
    * separate Vercel project
    * explicit retirement condition
The third-and-manageable-unified-liquid-glass folder remains a worktree, not another product repo.
Recommended implementation sequence
1. Preserve and centralize immediately
* Commit the five liquid-glass QA changes.
* Push codex/unified-liquid-glass.
* Preserve the dirty mobile-main prototype as an archive branch/patch, then stop developing in that checkout.
* Version the staging relay.
* Add a single cross-repo parity ledger covering each screen, user action, storage target, API, admin visibility, and test status.
* Mark the client admin export read-only and sanitize/remove its credential-bearing example.
2. Finish the theme as a real design system
* Make ThemeColors the only source for structural colors.
* Replace hard-coded legacy colors screen by screen, starting with Profile, Check-in, Community, Notifications, and Perks.
* Separate semantic colors such as success/danger/mood from school branding.
* Port the web contrast logic into a shared brand-token specification.
* Key universities by a stable institution ID rather than school-name string matching.
* Disable Campus Colors when the account lacks a verified supported school.
* Decide whether themes apply to auth/onboarding. The web deliberately scopes them to the authenticated shell; mobile currently applies them globally.
* Add Reduce Motion and Dynamic Type behavior.
* Decide light-only versus supported dark glass explicitly.
* Performance-test lists containing multiple blur surfaces on older iPhones and representative Android devices.
3. Restore every UI connection
Before changing backends, create automated navigation checks proving that users can reach:
* Profile/settings/account deletion.
* Notifications.
* Progress, Perks, Support, Terms, and Privacy.
* Check-in history and Clipboard history.
* Community reporting/blocking/support flows.
* Career intake, path detail, commitment, and return navigation.
Profile should regain a permanent first-class entry, probably a tappable avatar/settings control in the Home header if Coach remains the fifth tab.
4. Converge integrations behind the web API
The production destination should be:
Appwrite provider session
        ↓
Next.js validates Appwrite JWT
        ↓
Canonical Neon identity
        ↓
Short-lived mobile API session
        ↓
Next.js Route Handlers / Neon
        ↓
Web + mobile + admin see the same data
The Firebase custom token remains a compatibility mechanism while older clients still exist. New mobile domains should migrate to server APIs in controlled slices:
1. Profile/identity.
2. Check-ins and Clipboard.
3. Career plan and commitments.
4. Community and moderation.
5. Notifications and artifacts.
Move Gemini behind the authenticated server boundary during this work. Do not create uncontrolled Firestore/Neon dual writes; each migrated domain needs backfill, reconciliation, ownership, rollback, and an old-client compatibility plan.
5. Release gates
Only promote the liquid-glass binary after:
* Branch and relay are safely versioned.
* UI parity/navigation suite passes.
* Staging auth, OAuth, recovery, deletion, and revocation pass on physical devices.
* Admin can see and act on the same moderation/support data created by mobile.
* Career intake/commitment syncs across devices.
* Gemini is server-side with rate limits and safety telemetry.
* Strict Firestore Rules and old-client adoption gates are settled.
* APNs → Expo → app delivery is proven.
* Crash/error monitoring and support escalation are live.
* VoiceOver, Dynamic Type, Reduce Motion/Transparency, contrast, low-memory, and Android passes complete.
* App Privacy, legal/support URLs, credential custody, and compliance gates are signed off.
* The release uses the existing App Store record and bundle identifier with a documented rollback window.
Verification results
* Unified liquid-glass: 20 tests passed; typecheck and lint passed.
* Client mobile checkout: 16 tests passed; typecheck and lint passed.
* Staging relay: 3 tests passed.
* Web UI-redesign: typecheck and lint passed. Full tests produced 156 passes and one intermittent JWT tamper assertion; the focused rerun passed. The test mutates only the final base64url character, which can decode to the same bytes depending on padding bits. The verifier should reject non-canonical encoding or the test should mutate a guaranteed-significant byte.
No repository files were changed during this scan.
The main recommendation is: preserve the liquid-glass branch now, then treat it as a UI-and-native integration branch—not yet a production branch. Production readiness depends on closing the shared-data/admin/API boundary just as much as completing the visual polish.
