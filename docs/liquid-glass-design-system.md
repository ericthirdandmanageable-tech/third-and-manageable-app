# Liquid Glass design-system decisions

## Product contract

- Account appearance themes apply only inside the authenticated `(tabs)` shell. Authentication, recovery, legal, and onboarding retain the fixed Third & Manageable presentation.
- Glass is explicitly light-only. `BRAND_TOKEN_SPEC.glass.supportsDark` remains `false` until a separately designed and tested dark material exists.
- Campus Colors requires both `profile.verified === true` and a supported stable `profile.school_id`. A school display name never selects a palette.
- Existing verified accounts need a one-time data migration to populate `school_id`; until then Campus Colors remains disabled by design.

## Token ownership

`constants/brand-token-spec.ts` is the portable contract for structural, semantic, glass, and supported-institution tokens. `ThemeColors` is the runtime source used by components. The five migrated screens—Profile, Check-in, Community, Notifications, and Perks—contain no raw hex or RGB(A) literals.

The web WCAG contrast algorithm is ported to `constants/contrast.ts`. Every institution primary is adjusted only in lightness until it meets the 4.5:1 AA text threshold against the glass base; authored brand primaries remain unchanged in the specification.

Semantic success, warning, danger, info, and five mood tokens are independent from `signal`, so university branding cannot redefine state meaning.

## Accessibility

- React Native text and inputs allow system font scaling with a 1.6 maximum multiplier.
- Reduce Motion is observed at runtime. Programmatic scrolling and sheet transitions touched by this pass become non-animated when enabled.
- Reduce Transparency continues to replace blur with opaque high-contrast surfaces.

## List performance

Repeated cards use `GlassListSurface`, which preserves structural glass tokens but renders a static `View` instead of one native blur/effect instance per cell. Native glass/blur remains available for isolated headers, controls, and hero surfaces.

An ETTrace v1.1.0 simulator run covered opening Perks and scrolling its 12 repeated cards on iPhone 17 / iOS 26.5. The processed main-thread trace measured 99.40 sampled seconds, 95.51 idle and 3.87 active; no blur, glass, or visual-effect symbol appeared. Accessibility automation dominated inclusive work, and ExpoFont symbols were incomplete, so this is a regression gate rather than physical-device certification.

Required release-device matrix:

- Older supported iPhone (A12/A13 class): repeated-card scroll, Profile scroll, Community message list; record FPS, hitch count, memory, and thermal state.
- Current iPhone: same flows as a control.
- Representative low/mid Android and current flagship Android: same flows plus keyboard-open message composition.

This machine has no Android SDK/emulator and no older iOS runtime/device. Those physical-device measurements remain a release checklist item rather than an inferred pass.
