# Aura Reference Breakdown & Redesign Feature Potential

This document captures the feature analysis, visual customization engine, and design inspiration extracted from **Aura** (`com.cstewart.aura`, v2.1.1), preserving all actionable mechanics before the reference bundle is removed from the workspace.

---

## 1. Executive Overview & Core Philosophy

Aura is a run and activity tracking app whose core tracking features (GPS, HealthKit, Strava, Terra watch aggregation, BLE heart-rate monitor) serve to feed a **post-workout content studio**. Aura turns raw tracking data into styled, shareable artifacts and live activity streams.

### Strategic Adaptation Strategy for Third & Manageable
While Aura applies this content engine to athletic workouts, **Third & Manageable** adapts these mechanics to the **athlete's transition out of sport**:
- **From Post-Workout Stats → Post-Sport Milestones**: Turning career intake, skill translation, check-in streaks, and path commitments into shareable, high-design artifacts.
- **From Hype Social Media → Private & Earned Community Artifacts**: Focusing on editorial, dignified visual cards (private by default, shareable to verified peer forums).

---

## 2. Template Studio & Floating EditBar Architecture

(Derived directly from `Aura/README.md`)

### 2.1 Floating EditBar (Vertical Controls)
- **Position & Layout**: Top-right floating vertical panel overlaid on the template renderer with padding. Column behavior automatically starts a new column to the left if vertical height is constrained.
- **Toggles & Selection**:
  - **Background Toggle**: Switches between `square.fill` (ON) and `rectangle` (OFF), controlling card fill, opacity, padding, and corner radius.
  - **Text Toggle**: Brightens/thickens icon when ON, toggling text color, font size, alignment, and letter spacing.
- **Element-Specific Controls**:
  - `Stats / Weekly Stats`: Layout grid, show/hide stat badges, show/hide labels, stat gap spacing.
  - `Streak`: Layout format, show/hide milestone label, number spacing.
  - `Route`: Line color, stroke width, detail view mode.
  - `Quote`: Show/hide author, text alignment, line height.
  - `Monthly Stats`: Layout grid, show/hide stats, month range selection slider.

### 2.2 Bottom Control Panel (Horizontal Bar)
- **Slide-Up Bar**: Slides up from bottom when an element control is active; contains a Back button to dismiss.
- **Background Controls**: Predefined color swatches + full custom color picker, global padding & corner radius sliders (with per-side individual control switches).
- **Text Controls**: Color swatches + custom picker, font size slider, alignment toggles (left, center, right), text spacing slider.

---

## 3. Aura Aesthetic System & Asset Inventory

### 3.1 60+ Bundled Fonts across 5 Distinct Tone Registers

1. **Athletic / Impact Display**:
   - `ClashDisplay-Variable.ttf`, `ClashDisplay-Bold.otf`, `ClashDisplay-Medium.otf`
   - `DrukWide-Heavy-Trial.otf`, `DrukTextWide-Bold-Trial.otf`
   - `BankGothic Bold.ttf`, `BodegaNYC-Regular_v3.otf`, `Bootzy Condensed TM.otf`
   - `Coke4U.ttf`, `Pricedown-Bl.otf`, `WithMyWoes.ttf`
2. **Data Mono / Instrument**:
   - `GeistMono-Bold.otf`, `GeistMono-Medium.otf`, `GeistMono-Regular.otf`
   - `JetBrainsMono-VariableFont_wght.ttf`, `JetBrainsMono-Bold.ttf`, `JetBrainsMono-Regular.ttf`
   - `VCR_OSD_MONO_1.001.ttf`, `digital-7-italic.ttf`, `DS-DIGIT.TTF`, `PixelOperatorSC.ttf`
   - `GeistPixel-Circle.otf`, `GeistPixel-Grid.otf`, `GeistPixel-Line.otf`, `GeistPixel-Square.otf`, `GeistPixel-Triangle.otf`
   - `SourceCodePro-VariableFont_wght.ttf`
3. **Editorial Serif**:
   - `EBGaramond.otf`, `EBGaramond-Medium.ttf`
   - `InstrumentSerif-Regular.ttf`
   - `AppleGaramond.ttf`, `AppleGaramond-Bold.ttf`, `AppleGaramond-Italic.ttf`
4. **Neutral UI Sans**:
   - `Inter-Bold.otf`, `Inter-Medium.otf`, `Inter-SemiBold.otf`
   - `HelveticaNeue-Bold.otf`, `HelveticaNeue-Medium.otf`, `HelveticaNeue-Roman.otf`
   - `Gotham-Bold-Italic.otf`, `SF-Compact-Display-Semibold.ttf`, `IBMPlexSans-VariableFont_wght.ttf`
5. **Handwritten / Zine**:
   - `PermanentMarker.ttf`, `Mynerve-Regular.ttf`, `NothingYouCouldDo.ttf`
   - `gloriahallelujah.ttf`, `LOKICOLA.TTF`

### 3.2 Color Palettes & Custom Map Themes
Aura uses 9 desaturated map color themes where the activity line is the high-contrast hero element (`style_config.json`):
- `Dark` (`black_style`): `#FFFFFF` white line on dark map
- `Light` (`white_style`): `#000000` black line on white map
- `Aqua` (`aqua_style`): `#46BCEC` vibrant cyan line
- `Mono` (`mono_style`): `#000000` monochrome line
- `Contrast` (`contrast_style`): `#FF0080` hot pink line
- `Vector` (`vector_style`): `#FF0080` vector pink line
- `Natural` (`natural_style`): `#A4B0B0` muted sage line
- `Paper` (`paper_style`): `#858585` slate paper line
- `Outline` (`outline_style`): `#0057FF` electric blue line

### 3.3 Metal 3D Color Lookup Tables (Film Stock LUTs)
Aura applies GPU-accelerated Metal LUT filters to images:
- `fuji_400h.cube` (soft pastel green/cyan film tint)
- `fuji_superia_400.cube` (vibrant outdoor contrast)
- `kodak_elite_color_200.cube` (warm gold highlights)
- `kodak_hie_hs_infra.cube` (high-contrast infrared monochrome)
- `kodak_portra_400.cube` (warm editorial skin tones & sand hues)
- `rollei_retro_80s.cube` (deep black & white contrast)

---

## 4. Transferable Principles vs. Anti-Patterns

### 4.1 Transferable Principles for Redesign
1. **Progress as an Artifact**: Render milestone moments (Skill Map, Day 45/90 arc, Path Commitment, Weekly Game Plan) as exportable, designed cards.
2. **Template Slots > Blank Canvases**: Provide structured data slots (headline, skills, streak count, quote) rather than unstyled text fields.
3. **Restrained 3-Voice Typography System**:
   - **Inter**: Neutral UI sans for navigation, buttons, and form controls.
   - **Instrument Serif**: Warm editorial serif for reflection headlines, milestone statements, and quotes.
   - **JetBrains Mono**: Instrument data mono for streaks, days (`DAY 45 / 90`), and metric readouts.
4. **Ambient Data Ingestion**: Read sleep, activity, and HRV data to parameterize check-in questions without requiring manual data entry.
5. **Gated Trust Model**: Restrict community posting to verified athletes.

### 4.2 Anti-Patterns to Avoid
- **Meme Saturation**: Avoid joke cereal box or GTA-style meme templates; keep artifacts *editorial and earned*.
- **Forced Hype**: Dignify rest days, doubt, and identity grief; do not force upbeat energy on low-energy check-ins.
- **Feature Sprawl**: Limit artifact output to 4 core template types rather than dozens of variations.
- **Monetization Friction**: Never paywall crisis resources, core check-ins, or community rooms.

---

## 5. Potential Features for Third & Manageable Redesign

| # | Feature Concept | Aura Reference Origin | Adaptation for Third & Manageable | Implementation Status |
|---|---|---|---|---|
| 1 | **Milestone Artifact Studio** | Post-Workout Content Studio | Customizable card generator for Skill Map, Day Counter, Path Commitment, and Weekly Recap cards | Phase 3 (Scaffolded in `src/components/artifacts.tsx`) |
| 2 | **3-Voice Design System** | Aura Multi-Typeface System | Theme using Inter, Instrument Serif, and JetBrains Mono with `#C8F04B` volt accent and `#E8DCC8` sand serif | Phase 1 (Implemented in `index.css`) |
| 3 | **Yard Line Gradient Accent** | High-contrast route line (`#FF0080` / `#0057FF`) | 1px volt gradient line under headers and hero cards symbolizing an athletic yard line | Phase 1 (Implemented in components) |
| 4 | **Subtle Film Grain Texture** | Metal LUT Film Filters | 3–4% opacity noise/grain layer on cards and exported PNG artifacts for a warm journal feel | Phase 1 (Implemented in `index.css`) |
| 5 | **One-Tap Artifact Export** | Instagram Story Share Engine | High-DPI PNG generation (`html-to-image`) and direct share into Path community forums | Phase 3 (Implemented in `artifacts.tsx`) |
| 6 | **Ambient Data Strip** | GPS / Heart Rate Aggregation | Sleek sleep, activity, and HRV metric strip parameterizing check-in questions | Phase 2 (Scaffolded in Check-In view) |
| 7 | **Path Community Forums** | Invite-Gated Activity Rooms | Reddit-style forums per work structure (9–5, Gig, Consulting, Shift, Entrepreneurship) | Phase 4 (Implemented in `community.py` / `Community.tsx`) |
| 8 | **Quick Share iOS Widget** | Lock Screen Metric Widget | Home / Lock screen widget displaying active streak (`🔥 Day 15`) and daily game plan rep | Future Mobile Build |
| 9 | **Peer Presence Indicator** | LiveKit Camera Broadcast | Active verified peer counter (`12 verified athletes active now`) in Path forums | Future Release |
