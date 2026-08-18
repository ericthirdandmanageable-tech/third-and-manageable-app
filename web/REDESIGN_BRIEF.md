# Third & Manageable — Redesign Brief, Design Spec & Build Guide

**Version:** 1.0 · **Status:** Active build spec · **Audience:** Product, design, engineering

This document is three things in one:

1. **Product briefing** — what Third & Manageable is today, what it must become, and why.
2. **Design spec** — the design language, information architecture, and screen-by-screen definition of the redesigned app.
3. **Redesign guidance** — the phased plan for getting from the current app to the new one, with explicit keep/change/cut decisions.

It is grounded in three evidence sources: the compiled Third & Manageable iOS bundle (current product), the compiled Aura iOS bundle (aesthetic and sharing reference), and the `web-prototype/` React app (a directional scaffold for the new feature set — see §4 for exactly what does and does not carry forward).

---

# Part I — Product Briefing

## 1. Executive Summary

Third & Manageable is a mental-health, identity, and community platform for athletes transitioning out of competitive sport. Today it delivers a 90-day guided journey built on daily check-ins, reflection prompts, an AI coach ("The Clipboard," powered by Google Gemini with four selectable personas), streaks and daily actions, and a verified athlete-only peer community.

**The redesign turns it into "the athlete's guide to a working life that fits."** The wellness and identity core stays — it is the emotional substrate everything sits on — but the product gains a second pillar: **professional transition**. The app must actively steer each athlete toward the work structure that fits their skills, wiring, and life: a 9–5 job, gig work, consulting, overnight shifts, or entrepreneurship. Where the current app asks *"who are you without your sport?"*, the redesigned app also answers *"and what should you do on Monday morning?"*

The redesign is also a top-bottom modernization of look, feel, and interaction quality, using **Aura** — a run-tracking app whose post-workout content studio is best-in-class — as the primary aesthetic and sharing reference, and modern forum mechanics (Reddit) as the community reference.

**One-line positioning:** *Strava's structure for the athlete's working life after sport — daily reps, a game plan, and a team that's been through it.*

## 2. Current State: What Third & Manageable Is Today

Verified from the shipped bundle (Expo/React Native, Firebase backend, Gemini LLM).

### 2.1 Structure
- **Stack:** Expo Router app — routes include `/(tabs)/` (home, progress, profile, support, notifications), `/(auth)/` (incl. forgot-password), `/(legal)/`. Firebase Auth + Firestore; Google Gemini via the Generative AI SDK in-app.
- **Current design tokens (to be replaced):** Raleway type family (`font-raleway-medium`, `font-raleway-semibold`); `dp-*` color scale (`bg-dp-50`, `text-dp-500/70`, `bg-silver-700`, `text-silver-400`); rounded-2xl/3xl cards. Pleasant but generic wellness-app styling.

### 2.2 Feature inventory (verified copy)

**Onboarding & identity**
- Status selection: "I'm currently competing or training in my sport." / "I've transitioned or am transitioning out of competitive sport."
- Sport selection ("What's your sport?") with the promise: "We'll tailor your experience using language from your game."
- Display name + school: "Your display name and school help us connect you with the right athlete community."
- Athlete verification gate: "Verify your account to participate in chat." / "Your verification request has been submitted. You'll be notified when it's approved."
- Value proposition: "A daily game plan, progress tracking, wellness resources, and a community that has your back."

**Daily check-ins & reflection prompts** — a deep prompt library, including the two seeds of the future career pillar (already in the app today):
- "What interests or careers are you considering now?"
- "What skill from your sport translates best to everyday life?"
- Plus identity/transition work: "What does 'showing up' mean to you now?", "How do you introduce yourself now that sport isn't the first thing?", "How do you stay disciplined without a training schedule?", "What gives you energy outside of competition?", "Write 3 sentences to yourself 90 days from now. What do you hope to tell them?", "Catch a self-critical thought today and rewrite it. 'I can't' becomes 'I'm learning to.'"
- Check-in framing: "Today's Check-In", "How are you feeling?", "Want to share more? (optional)"

**The Clipboard (AI coach)**
- Four user-selectable personas, fed to Gemini as system-prompt tone directives: **The Friend** (calm, laid-back), **The Analyst** (structured, frameworks), **The Hype Coach** ("Let's go!"), **The Mentor** ("Wise & experienced").
- Empty state: "Your conversations with The Clipboard will appear here after you chat."
- Gemini safety filters active (civic integrity, dangerous content categories).

**Progress, streaks & daily actions**
- 90-day journey with milestones: "14-Day Streak!", "Halfway through your journey!", "Your 90-day journey is complete."
- Daily actions ("Write Down 3 Wins", "Hydrate First Thing", "Visualize Your Next Chapter") with completion copy: "You completed your first daily action.", "You crushed today's action. One step closer to your next chapter.", "Game Plan Complete", "Great job! See you tomorrow."
- Encouragement system: "You don't need to win every day. You just need to show up. Consistency beats intensity.", "You're just getting started. Every day counts.", "Your discipline got you here. That same discipline will build your next life."
- A **Game Plan** concept already exists as a screen (`GamePlanScreen`) — the career pillar promotes this to a first-class tab.

**Community & support**
- Verified athlete-only chat: "Verified Athletes Only - Use @Name to mention someone", "You were mentioned in…"
- Immediate support: "I need peer support right now." / "I need technical support." → "We've notified the community. A peer will reach out soon."
- Moderation: report content, block users ("You will no longer see messages from…"), Terms & Conditions covering account security, content, suspension.

**Safety & privacy**
- Crisis surfaces: "If you or someone you know is in immediate danger, call 911 or call/text 988 for the Suicide & Crisis Lifeline."
- Privacy copy covering data collected (account, check-ins, messages, support requests; device push token; service logs), deletion on request, aggregated de-identified analytics.

### 2.3 Honest assessment
- **Strengths:** genuinely differentiated prompt library; the personas idea is ahead of its time; verification-gated community is the right trust model; the 90-day arc gives shape to a shapeless life event.
- **Weaknesses:** generic wellness visual identity; community is a single undifferentiated chat rather than an organized forum; no persistence of insight — reflections evaporate; **the career thread exists in two prompts and one thread name and nothing else** — the app names the problem ("your next chapter") but offers no mechanism for getting there; sharing is absent, so progress is invisible outside the app.

## 3. Reference Analysis: Aura

Aura (`com.cstewart.aura`, v2.1.1) is a run/activity tracker whose commodity tracking core (GPS, HealthKit, Strava, every major watch via Terra, BLE heart-rate straps, Live Activities) exists to feed **the soul of the app: a post-workout content studio** that turns workout data into beautiful, highly-styled, shareable artifacts — plus live-streaming runs to friends.

### 3.1 How Aura structures tracking
- **Un-opinionated ingestion:** Aura doesn't care where the activity comes from (own GPS recorder, Strava import with dedupe, Terra-normalized watch data). One unified activity model: distance, duration, pace/speed, splits/laps, HR (avg/max/5 zones/HRV), calories, elevation, cadence, power, weather, route polyline, attached media.
- **Ambient capture:** auto-pause via motion coprocessor, voice split announcements, lock-screen Live Activity, watch remote control. Tracking happens *around* the user, not *to* them.
- **Aggregates as identity:** weekly mileage, monthly calendar, streaks (days/miles/avg per day) — the longitudinal story is the product, not any single workout.

### 3.2 How Aura structures sharing (the transferable gold)
- **Artifacts, not posts.** Every share is a designed object: a stat card, a route map, a collage, a polaroid strip, a flyover video, a weekly recap, an AI-styled image. Nothing ships as raw text.
- **Templates as a system.** Numbered and named templates ("Druk Wide Route Today", "Geist Pixel Splits", "Garamond Stats Middle", "Chip Time Display", "Handwritten Note", "Monthly Calendar") compose from element types — Stat, WeeklyStat, MonthlyStat, Streak, Quote, Route — with per-element controls (layout, labels, spacing, colors, padding, corner radius). An `ElementPicker` filters templates by what data actually exists.
- **Typography as the theme engine.** 60+ bundled fonts grouped by vibe — athletic display (Clash, Druk Wide, BankGothic), data mono (Geist Mono, JetBrains Mono, VCR OSD, digital-7), editorial serif (EB Garamond, Instrument Serif), handwritten zine (Permanent Marker, Mynerve) — each template bound to its own typeface. The same run looks completely different through different templates.
- **Map & photo styling:** 9 desaturated Google Maps styles where the route line is the hero (hot pink #FF0080, blue #0057FF, aqua #46BCEC); six film-stock 3D LUTs (Portra 400, Fuji 400H…) applied via Metal.
- **AI styles:** server-generated share images from long art-directed prompts with stat tokens (cereal-box parody, conspiracy corkboard, fantasy book cover, American Psycho business card, thermal receipt).
- **One-tap distribution:** Instagram Stories native integration, Quick Share home-screen widget ("Glance your latest run metric and tap to share instantly"), watermark on exports.
- **Live layer:** LiveKit camera broadcast + delayed live map + chat + web viewers. Trust through presence.

### 3.3 Aura principles to transfer
1. **Progress becomes an artifact.** Every meaningful moment in Third & Manageable (a week of check-ins, a skill mapped, a path chosen, Day 45 of 90) should be renderable as a beautiful, exportable card.
2. **Templates > free-form.** Give users composed, well-designed objects to fill, never blank canvases.
3. **Typography carries emotion.** A small set of strongly-voiced typefaces does more brand work than any color palette.
4. **Ambient data, zero clerical work.** Pull what's knowable (sleep, activity, HRV; later: calendar, job applications) instead of asking.
5. **Gated trust.** Aura's invite-code gate mirrors Third & Manageable's athlete verification — keep the door narrow, make the inside feel earned.
6. **The longitudinal story is the product.** Streaks, training blocks, season-long arcs — athletes already think this way; the app should speak that language.

### 3.4 Aura anti-patterns to avoid
- **Meme saturation.** Cereal boxes and GTA fonts are right for run Discord culture; they are wrong for someone grieving their identity. Our artifacts must be *editorial and earned*, not jokey.
- **Hype energy by default.** Aura celebrates output; we must also dignify rest, doubt, and slow days.
- **Feature sprawl.** Aura ships a dozen generators (flyover, montage, journey, polaroids…). We ship a small, sharp set and go deep.
- **Monetization friction.** Aura's Superwall paywalls are fine for a tracker; a transition/mental-health product must be far more careful about what sits behind a paywall (never crisis support, never core community).

## 4. Directional Scaffold: The Web Prototype

`web-prototype/` is a **development-scoping scaffold**, built bare-minimum and deliberately non-committal. **All of its content (check-in options, health metrics, thread names, copy) is placeholder, and its aesthetic (teal-on-slate, Inter, component styling) is throwaway.** Nothing about its visual design or specific data carries forward, and its unbuilt areas are simply unbuilt — not specs to be completed.

What the prototype *does* establish — the durable, user-facing interaction patterns that hold true for the redesign:

1. **Progressive-disclosure journaling.** The check-in presents low-friction multiple-choice first; selecting an answer smoothly reveals an *optional* journaling field ("Want to say more about that?"). This eliminates blank-page anxiety while still inviting depth. **Carries forward as the core check-in mechanic.**
2. **Passive-data-aware check-in framing.** The check-in question is parameterized by ambient health data ("Based on your sleep data…"), and the coach references it ("Noticed you logged a Rest Day…"). The product feels like it's paying attention without demanding clerical input. **Carries forward; data itself is mocked/placeholder.**
3. **Thread-based community.** Topical micro-communities with a dedicated conversation view per thread, rather than one firehose chat. **Carries forward, and deepens toward a Reddit-style model (see §11).**
4. **The self-writing system prompt — invisible.** The Clipboard quietly rewrites its own operating instructions in response to user behavior (e.g., pivoting from open-ended questions to multiple-choice when a user gives terse answers, reducing journaling friction). The prototype's "Debug Persona" panel was purely a developer visualization of this mechanism. **The adaptive behavior carries forward as invisible infrastructure — there is no user-facing mirror, debug view, or prompt display in the redesigned product. (See §10.)**
5. **The responsive app shell.** Sidebar navigation on desktop, bottom tab bar on mobile. **Carries forward structurally; restyled entirely.**

## 5. Product Vision: The Athlete's Guide to a Working Life That Fits

### 5.1 The pivot
From *transition wellness companion* → *transition operating system*. The daily emotional work (check-ins, reflection, community, the Clipboard) remains the retention engine — but it now **compounds toward a professional outcome**. Every athlete leaves the program not just feeling better, but *pointed somewhere*: a work structure that fits, a skill narrative they can say out loud, and a weekly game plan of real-world reps.

### 5.2 The five work structures
The product organizes professional life after sport into five paths, each treated as a first-class, honorable destination — not a fallback:

| Path | Why athletes fit it | Friction to design for |
|---|---|---|
| **9–5 / Corporate** | Team structure, clear ladder, playbook culture — the closest analog to a program | Loss of visible scoreboard; imposter syndrome in interviews |
| **Gig work** | Immediate income, physical autonomy, control of schedule while figuring it out | No structure at all — the exact void they're grieving; income anxiety |
| **Consulting** | Monetizes expertise (sport-specific or domain); project-based intensity = seasons | Requires a skill narrative and network they don't believe they have |
| **Overnight / shift work** | Matches athlete wiring (odd hours, physical tolerance, discipline); immediate openings | Sleep/health tradeoffs; social isolation; must be framed as bridge, not dead end |
| **Entrepreneurship** | Total ownership, competition replacement, identity continuation ("founder" as new jersey) | Highest failure risk; needs reality-testing and runway planning |

### 5.3 Who it's for
- **Primary:** current and recently-transitioned competitive athletes (college and pro/semi-pro), 18–35, grieving structure, identity, and team simultaneously.
- **Secondary:** athletes 1–5 years out who "white-knuckled" the transition and are stuck in a misfit work structure.

### 5.4 Jobs to be done
1. *"Give me back a daily structure I can win at."* → check-ins, daily actions, streaks.
2. *"Tell me what I'm actually good at, in civilian language."* → Skill Translation Engine.
3. *"Show me which working life fits someone wired like me."* → Path fit + exploration.
4. *"Put people around me who get it."* → verified community, path-based forums.
5. *"Let someone credible help me think."* → the Clipboard, personas.
6. *"Let me prove to myself (and others) that I'm moving."* → progress artifacts.

### 5.5 Success metrics
- **North star:** athletes who reach *Path Committed* (declared a work structure and completed its first real-world rep) within their 90-day journey.
- Supporting: check-in completion rate and streak length; Game Plan weekly action completion; Clipboard conversations per week; community posts/replies per athlete; artifact shares per milestone; day-30/60/90 retention.

---

# Part II — Design Spec

## 6. Design Language

Built **fresh**, led by Aura's sensibility and current design trends — not evolved from the prototype's placeholder styling. Dark-first, editorial, premium, calm. The product should feel like a beautifully-made training journal crossed with a modern career tool — never clinical, never a hustle app.

### 6.1 Color
Near-black layered surfaces with warm whites; one athletic accent used with discipline; semantic hues reserved for data.

| Token | Value | Use |
|---|---|---|
| `bg/base` | `#0B0C0E` | App background |
| `bg/surface` | `#14161A` | Cards, sidebar, sheets |
| `bg/elevated` | `#1C1F26` | Raised cards, hover states, composer wells |
| `border/subtle` | `#262A33` | Hairlines, card borders |
| `text/primary` | `#F4F2EC` | Warm off-white, primary text |
| `text/secondary` | `#9BA1AC` | Secondary text |
| `text/tertiary` | `#5C6370` | Meta text, timestamps |
| `accent` (volt) | `#C8F04B` | Primary CTAs, active nav, streak/progress marks, selection states |
| `accent/ink` | `#11130A` | Text/icons sitting on volt |
| `accent-soft` | volt at 10–15% alpha | Tinted chips, selected rows, glow washes |
| `editorial` (sand) | `#E8DCC8` | Editorial serif headlines, reflection moments |
| `data/sleep` | `#8B93F8` | Sleep metrics |
| `data/activity` | `#F0854B` | Activity metrics |
| `data/hrv` | `#E86A8A` | HRV / recovery metrics |
| `danger` | `#E5484D` | Crisis surfaces, destructive actions |

Rules: volt is a *signal*, not a wash — one dominant volt element per screen. Sand is for words that matter (serif headlines, quotes, milestone statements). Data hues never appear outside metric contexts.

### 6.2 Typography
Three voices, Aura's trick restrained to a system:

| Role | Face | Use |
|---|---|---|
| **UI sans** | Inter (400/500/600/700) | Body, labels, buttons, nav. Tracking tight on headings, normal on body |
| **Editorial serif** | Instrument Serif (400 italic & roman) | Screen headlines for reflection surfaces, milestone statements, quotes, artifact headlines. This is the brand's emotional register |
| **Data mono** | JetBrains Mono (400/500/700) | Metrics, streak counts, day counters ("DAY 45 / 90"), stat readouts, artifact data. Athletes trust numbers; render them like instruments |

Scale: 11 (meta/mono labels, uppercase, tracking-widest) · 13 (secondary) · 15 (body) · 17 (emphasis) · 22 (section heads) · 30–40 (serif headlines) · 56+ (artifact display numerals, mono).

### 6.3 Shape, elevation, texture
- **Radii:** 8 (chips, inputs) · 14 (cards) · 20 (hero cards, sheets) · full (buttons, avatars, pills). One scale, no ad-hoc values.
- **Borders over shadows:** 1px `border/subtle` defines surfaces; shadows reserved for sheets/overlays (`0 12px 40px rgba(0,0,0,0.5)`).
- **Texture (sparingly):** subtle film-grain overlay at 3–4% opacity on hero/artifact surfaces — the Aura film sensibility, one notch from invisible.
- **Signature elements:**
  1. **The Yard Line** — a 1px volt gradient rule (0% → 100% → 0% alpha) used under screen headers and on artifacts; our equivalent of a field marking. Athletes will read it instantly.
  2. **Tinted icon chips** — 10% hue-alpha squares with 400-weight hue icons for metric/category tiles.
  3. **Radio-dot option rows** — full-width rounded rows, custom ring + filled dot selection, volt selected tint (the durable check-in pattern).
  4. **Asymmetric chat bubbles** — user: volt-ink fill, `rounded-2xl rounded-tr-sm`; Clipboard: `bg/elevated`, `rounded-2xl rounded-tl-sm`.
  5. **Pill composers** — rounded-full inputs with inset circular send button.

### 6.4 Motion
Purposeful, 200–400ms, ease-out; nothing bounces except the typing indicator.
- **Entrances:** fade + 8px rise, 300ms, staggered 40ms per card.
- **Progressive disclosure:** the journal field reveals with height-expand + fade, 250ms — the product's signature micro-interaction.
- **Typing indicator:** three dots, 1s staggered bounce.
- **Streak/progress:** count-up numerals (mono), 600ms; progress bars fill 800ms ease-out on mount.
- **Sheet/drawer:** 280ms slide. Respect `prefers-reduced-motion`.

### 6.5 Tone of voice
Quiet, validating, non-prescriptive — anti-hustle. Existing verified copy to preserve verbatim: "You showed up today. That's what matters." · "No pressure to move today." · "Consistency beats intensity." Career copy speaks athlete: "reps," "game plan," "film study," "offseason," "transfer portal energy allowed here."

## 7. Information Architecture

Four primary tabs (the Game Plan is promoted to first-class; everything else orbits it):

```
┌─────────────────────────────────────────────────────────┐
│  CHECK-IN (/)        Daily home: ambient data + check-in │
│  GAME PLAN (/game-plan)  Career pillar: paths, skills,   │
│                          weekly actions, journey progress │
│  CLIPBOARD (/clipboard)  AI coach: personas, chat        │
│  COMMUNITY (/community)  Verified forums + threads       │
├─────────────────────────────────────────────────────────┤
│  Secondary: Profile · Progress (journey/stats) ·         │
│  Support (peer + technical + crisis) · Notifications ·   │
│  Settings — reachable from shell header / profile        │
└─────────────────────────────────────────────────────────┘
```

- Desktop: fixed left sidebar (brand mark, 4 primary nav pills, profile at foot; Support + crisis link pinned at sidebar bottom).
- Mobile: bottom tab bar (4 items); Support accessible from Check-in header and Community.
- **Why this order:** Check-in is the daily habit; Game Plan is the destination; Clipboard is the guide; Community is the team. The tab order *is* the product story.

## 8. Feature Spec: Check-in (/)

**Purpose:** the 60-second daily rep. Ambient awareness + one honest answer + optional depth.

**Composition (top → bottom):**
1. **Header:** serif headline ("Morning Check-in" / time-aware variant), mono meta line — `DAY 14 / 90` · streak flame in volt. Yard Line rule beneath.
2. **Ambient strip** (progressive, collapsible): 3 metric cards — SLEEP, ACTIVITY, HRV — tinted icon chips (sleep/activity/hrv hues), mono values, one-line plain-language read ("Rough night detected"). Data source: Apple Health / wearable integrations at launch-equivalent; mocked until then. *All values are placeholders in v1.*
3. **Today's question card (hero):** prompt parameterized by ambient data ("Based on your sleep data, how are you handling the transition today?"). Question bank rotates across three registers: identity, daily life, **career/path** (at least one career-register question per week, e.g. the verified existing prompts "What interests or careers are you considering now?", "What skill from your sport translates best to everyday life?").
4. **Options:** 3–4 radio-dot rows (multiple-choice first, always).
5. **Progressive disclosure:** on selection, reveal — height-expand + fade — optional journal textarea ("Want to say more about that? *(Optional)*", placeholder "It helps to get it out…") + volt "Save Check-in" pill.
6. **Success state:** volt check mark, "Check-in Complete", "You showed up today. That's what matters. Your streak is now **15** days." (streak in mono volt). Optional secondary action: "Add a win to your Game Plan" — routes reflection into the career pillar.

**States:** loading skeletons for ambient cards · already-checked-in (shows today's answer + journal, editable) · offline (queue check-in) · error (preserve input, inline retry).

## 9. Feature Spec: Game Plan (/game-plan) — The Career Pillar

**Purpose:** answer "what working life fits me, and what do I do this week to get there?" This is the redesign's center of gravity.

### 9.1 Composition
1. **Header:** serif headline "Your Game Plan", mono meta `DAY 14 / 90` + current phase chip (`PHASE 1 · FOUNDATION`, of 3).
2. **Skill Translation Engine card** — the heart. On first run (or from profile), a short guided intake (sport, position/role, years, level, leadership, favorite part of competing) produces the athlete's **Transferable Skill Map**: 5–7 skills rendered as volt-tinted chips with one-line civilian translations, e.g.:
   - *Film study → pattern recognition & rapid preparation*
   - *Two-a-days → sustained output under fatigue*
   - *Captain → leading peers without authority*
   - *In-game adjustments → real-time decision-making under pressure*
   - *Recruiting visits → stakeholder management & pitching*
   Each skill cites its sport origin — the app always shows its work.
3. **Path Fit** — the five work structures as ranked cards with a fit signal (e.g., `STRONG FIT` / `WORTH EXPLORING` in mono + volt-meter), a one-line rationale tied to the Skill Map ("Consulting scores high: pattern recognition + pitching"), and a tap-through **Path Detail** view: day-in-the-life schedule shape, income texture ("variable, project-based"), what athletes love/hate about it, first three reps to test it, and real community threads for that path. Fit ranking derives from intake + check-in signals (schedule-grief answers push toward 9–5; autonomy answers toward gig/entrepreneurship). The model is transparent — "Why this ranking" expands to show the contributing answers.
4. **This Week's Actions** — 3–5 weekly reps, checkable, mixing inner and outer work: one reflection ("Write down 3 wins"), one skill rep ("Rewrite one bullet of your resume in civilian language"), one world rep ("Message one former teammate who's working"). Completion feeds streaks and the journey. Copy keeps verified voice: "You crushed today's action. One step closer to your next chapter."
5. **Journey strip** — 90-day progress bar (mono numerals, volt fill), phase markers at 30/60 (Foundation → Exploration → Commitment), milestone unlocks.

**States:** pre-intake (Skill Map locked behind a 2-minute intake CTA) · path-committed (a volt "COMMITTED · CONSULTING" chip replaces ranking; weekly actions re-theme to that path) · empty week (Sunday reset: "New week, new reps.").

### 9.2 Data model (v1 entities)
- `AthleteProfile { displayName, school, sport, position, yearsCompeted, level, status: competing|transitioning|transitioned, verified }`
- `SkillMapEntry { skillLabel, civilianTranslation, sportOrigin, confidence }`
- `PathFit { path: nine_to_five|gig|consulting|overnight|entrepreneurship, score, rationale[], committedAt? }`
- `WeeklyAction { id, weekOf, kind: reflection|skill_rep|world_rep, text, completedAt? }`
- `CheckIn { date, promptId, optionId, journalText?, ambientSnapshot { sleep?, activity?, hrv? } }`
- `Journey { startDate, day, streak, phase, milestones[] }`
- `Thread { id, title, category: Local|Sport|Support|Path, path?, memberCount, activeNow }` (extends prototype's type — `Path` is the new category)
- `Message { id, sender: user|ai, text, persona, createdAt }`

## 10. Feature Spec: The Clipboard 2.0 (/clipboard)

**Purpose:** the trusted coach. Grows with the athlete; quietly adapts to how they communicate.

1. **Personas (user-facing, unchanged from current app):** Friend / Analyst / Hype Coach / Mentor, selectable from a header control; switching applies on the next message. Verified tone directives preserved (§2.2). Default: Friend.
2. **Invisible adaptation engine (durable pattern #4):** the system prompt silently maintains a running `User Profile Update` + `Tone Directive` block derived from engagement signals — response length, session frequency, question-type responsiveness, topic avoidance. Example directives (internal only): terse answers → "pivot to closed-ended, multiple-choice questions"; reflective answers → "adopt Analyst-style structure regardless of selected persona, unless persona conflicts"; consistent career-topic engagement → "weave in one concrete rep suggestion per conversation". **No debug panel, no prompt display, no user-facing indication this exists.** The athlete simply experiences a coach who "gets" them.
3. **Context continuity:** the Clipboard sees check-in results and Game Plan state ("Noticed you logged a Rest Day…", "You marked Consulting as worth exploring — want to break down what a first project could look like?"). Career-aware, never pushy: max one career thread per session unless user-led.
4. **Chat UI:** asymmetric bubbles (§6.3), pill composer, typing indicator, day dividers, mono timestamps. AI messages may include **option chips** (tappable multiple-choice answers that send on tap) — the invisible engine's low-friction mode made tangible.
5. **Safety:** Gemini safety filters; crisis detection routes to the Support surface with 988/911 resources; persona directives never override safety system instructions.

**States:** empty (verified copy: "Your conversations with The Clipboard will appear here after you chat.") · typing · error with retry · safety-intercepted (soft redirect copy + resources).

## 11. Feature Spec: Community (/community) — Reddit Model

**Purpose:** the team. Verified athletes only, organized like a forum — not a group chat.

1. **Forum directory:** topic-based communities ("threads" in prototype terms, subreddit-like in behavior) across four categories: `Local` (UC Davis Pick-up Soccer — placeholder), `Sport`, `Support` (ACL Recovery — placeholder), and **`Path`** (new: one forum per work structure — "Corporate Athletes", "Gig Life", "The Consulting Circuit", "Night Shift", "Founders"). Path forums are the career pillar's social surface and the natural home of the largest communities.
2. **Post model (Reddit mechanics):** posts have titles + bodies, flair (`WIN`, `VENT`, `QUESTION`, `RESOURCE`, `MILESTONE`), upvote/reaction counts, and **nested comment threads** (indented replies, collapse) — replacing the current single-stream chat. Sort: Hot / New / Top.
3. **Conversation view:** post detail with nested comments + pill composer ("Add to the conversation…"); @-mentions preserved ("Verified Athletes Only - Use @Name to mention someone").
4. **Verification & safety:** unverified athletes read but cannot post ("Verify your account to participate"); report/block on every post and comment; mod tools for community leads; "I need peer support right now." posts to a priority Support forum with the verified notification flow ("We've notified the community. A peer will reach out soon.").
5. **Artifact sharing surface:** Game Plan milestones can be shared *into* a Path forum as artifact cards (see §12) — progress becomes community content.

**States:** directory (recommended forums, search by school/sport/topic/path) · forum view (post list, sorted) · post detail (nested comments) · unverified read-only · empty forum ("Be the first to post — someone needs to hear it.").

## 12. Sharing & Progress Artifacts (Aura's Lesson, Applied)

Progress in the redesigned app is **renderable**. Every milestone can become a designed, exportable artifact — for the athlete's own motivation first, and optionally for sharing to community or out of the app. Editorial and earned in tone (no meme styles; §3.4).

**Artifact set (v1, deliberately small):**
1. **Skill Map Card** — the Transferable Skill Map as an editorial card: serif headline ("What the game taught you"), mono skill list with civilian translations, yard-line rule, sand-on-dark.
2. **Day Counter Card** — `DAY 45 / 90` in oversized mono numerals, phase label, progress arc, one line from the athlete's own check-in that week (their words, their artifact).
3. **Path Commitment Card** — "Committed: Consulting" with the three contributing skills, date, and the first rep checked off.
4. **Weekly Recap Card** — streak, actions completed, one quote line; generated Sunday evening, shareable to the athlete's Path forum in one tap.

**Mechanics:** template-driven (fixed, well-designed compositions with data slots — Aura's template discipline, none of its sprawl); export to image (save/share sheet); share-into-forum; watermark-free. **Privacy default: everything is private until explicitly shared.** No public-by-default anything in a mental-health-adjacent product.

## 13. Safety, Privacy & Moderation (Non-Negotiables — Preserved and Strengthened)

- Athlete-only verification gate before any community write access; verification flow copy preserved.
- Crisis resources (911 / 988 Suicide & Crisis Lifeline) permanently reachable from the shell (sidebar footer / Check-in header); Clipboard crisis detection deep-links here.
- Report + block on all UGC; moderation queue; Terms enforcement.
- Gemini content safety filters; safety instructions dominate persona/adaptation directives at all times.
- Data privacy: account/check-in/message data encrypted in transit; deletion on request removes user data and ends sessions; health data read-only, never sold, never used for ads; **artifacts and journals are private by default**.
- The invisible adaptation engine stores only derived engagement signals (never raw behavioral surveillance exposed to the user or other athletes); documented in the privacy policy.

## 14. Screen-by-Screen Summary

| # | Screen | Route | Purpose | Key components | Primary states |
|---|---|---|---|---|---|
| 1 | Check-in | `/` | Daily rep | Ambient cards, question card, radio rows, disclosure journal, success | loading / unanswered / answered / done |
| 2 | Game Plan | `/game-plan` | Career pillar | Skill Map, Path Fit cards, weekly actions, journey strip | pre-intake / active / committed |
| 3 | Path Detail | `/game-plan/paths/:path` | Explore one work structure | Schedule shape, income texture, loves/hates, first reps, linked forum | exploring / committed |
| 4 | Clipboard | `/clipboard` | AI coach | Persona picker, message list, option chips, composer | empty / chatting / typing / safety |
| 5 | Community | `/community` | Forum directory | Search, category filters, forum cards | directory |
| 6 | Forum | `/community/:threadId` | Post list | Sort control, post cards (flair, votes, comment count) | list / empty / read-only |
| 7 | Post | `/community/:threadId/:postId` | Conversation | Nested comments, composer | conversation |
| 8 | Progress | `/progress` | Journey & stats | Streak calendar, artifact gallery | — |
| 9 | Profile | `/profile` | Identity & intake | Athlete profile, skill intake, verification status | — |
| 10 | Support | `/support` | Help & crisis | Peer support request, technical support, 988/911 | — |

---

# Part III — Redesign Guidance

## 15. Phased Roadmap

**Phase 1 — Foundation (design system + shell + reskin):** New design tokens, type system, motion; 4-tab shell; reskin Check-in / Clipboard / Community on the new language; persona picker; option chips; remove the debug-persona visualization (adaptation becomes invisible); scaffold Game Plan tab with mocked data. *Exit: all four tabs on the new design language, building cleanly.*

**Phase 2 — Career pillar MVP:** Skill intake flow, Skill Map generation (rule-based v1 from sport/role mappings; LLM-assisted v1.5), Path Fit ranking with transparent rationale, Path Detail views, weekly action engine, journey phases. *Exit: an athlete can complete intake, see their map, and commit to a path.*

**Phase 3 — Artifacts & sharing:** The four v1 artifacts, image export, share-into-forum; Progress screen with artifact gallery. *Exit: every milestone renders a shareable card.*

**Phase 4 — Community depth:** Full post/comment model with flair, votes, nested threads, sort; Path forums; mod tools; priority support forum. *Exit: Reddit-grade discussion in a verified-athlete room.*

**Later / exploratory:** Hinge-style skills mechanics (see §16.1); health/wearable integrations (Apple Health, Terra-style aggregation); monetization (never on safety/community core); native app parity.

## 16. Open Questions

### 16.1 The Hinge-style skills mechanic (UNDECIDED — exploration requested)
Applying dating-app mechanics to professional-skill discovery. Three options:
- **Option A — Prompt-driven skill profile (recommended).** Athletes answer guided prompts ("The moment I was most relied on was…", "My teammates would say I'm the one who…") instead of filling skill forms; answers feed the Skill Map and render as a Hinge-like profile of *stories*, not bullet points. Lowest risk, high fit with the journaling muscle the app already builds.
- **Option B — Swipe-to-fit exploration.** Swipe through work-structure "cards" (a day-in-the-life, a salary texture, a required rep) to train the Path Fit model. Fast and engaging; risks trivializing a serious decision.
- **Option C — Mentor matching.** Match athletes with verified mentors 2–5 years ahead on a path, Hinge-style double opt-in. Highest value, highest operational cost (supply, safety, quality).
**Recommendation:** build A in Phase 2 as the intake mechanism; evaluate B for Path exploration in Phase 2.5; treat C as its own product decision post-launch.

### 16.2 Remaining open questions
- **Verification model:** how is athlete status verified today, and does it scale (roster databases, .edu email, manual review)?
- **Health data:** which integrations at launch (Apple Health only, or Terra-style multi-device)?
- **Monetization:** subscription (Aura/Superwall pattern) vs. free + program partnerships (athletic departments, players' associations)? Constraint: crisis support, core community, and check-ins never paywalled.
- **Platform:** web-first continuation of the prototype stack vs. React Native/Expo rewrite for parity with the shipped app — or shared component language across both?
- **LLM ops:** Gemini remains the provider; who owns prompt governance for the adaptation engine, and how are directive changes audited?

## 17. Keep / Change / Cut

| Current feature | Decision | Notes |
|---|---|---|
| 90-day journey, streaks, daily actions | **Keep** | Re-themed around career reps in Game Plan; copy preserved |
| Reflection prompt library | **Keep** | Add one career-register prompt per week minimum; two already exist |
| The Clipboard + 4 personas (Friend/Analyst/Hype Coach/Mentor) | **Keep** | Verified tone directives preserved; gains option chips + context continuity |
| Self-writing system prompt (prototype mechanism) | **Keep, invisible** | No debug panel, no user-facing mirror; infrastructure only |
| Progressive-disclosure journaling (prototype) | **Keep** | Signature interaction of Check-in |
| Passive-data-aware check-in framing (prototype) | **Keep** | Data integrations land in Phase 2+ |
| Thread-based community (prototype) | **Change** | Deepens to Reddit model: posts, flair, votes, nested comments, Path forums |
| Single-stream verified chat | **Change** | Absorbed into forums; @-mentions preserved |
| Athlete verification gate | **Keep** | Extended: read-only until verified |
| Report/block, moderation, Terms | **Keep** | Extended to posts + comments |
| 988/911 crisis surfaces | **Keep** | Promoted: permanently reachable from shell |
| Prototype content (check-in options, metrics, thread names) | **Placeholder** | All replaced; directional only |
| Prototype aesthetic (teal/slate, Inter-only) | **Cut** | Replaced by §6 design language |
| Raleway + dp-*/silver design tokens (current app) | **Cut** | Replaced by §6 design language |
| Debug Persona panel (prototype) | **Cut** | Dev visualization only; never ships |
| Sharing of any kind | **New** | §12 artifact system, private-by-default |
| Career pillar (Skill Map, Path Fit, weekly game plan) | **New** | §9 — the redesign's center of gravity |

## 18. App Store & Infrastructure Deployment Specification

### 18.1 iOS App Store Metadata & Entitlements Reference
- **Bundle ID:** `com.thirdandmanageable.app`
- **URL Schemes:** `thirdandmanageableapp://`, `com.thirdandmanageable.app://`
- **Executable Name:** `ThirdManageable`
- **Minimum OS / Xcode Target:** iOS 18.0 / Xcode 16 (Build 2600 / iOS 18 SDK)
- **Architecture & Performance:** `arm64`, New Architecture enabled (`RCTNewArchEnabled: true`), `CADisableMinimumFrameDurationOnPhone: true`
- **Encryption Exemption:** `ITSAppUsesNonExemptEncryption: false`
- **Privacy Manifest (`PrivacyInfo.xcprivacy`):**
  - Declares usage reasons for `NSPrivacyAccessedAPICategoryFileTimestamp` (`C617.1`, `0A2A.1`, `3B52.1`), `NSPrivacyAccessedAPICategoryUserDefaults` (`CA92.1`), `NSPrivacyAccessedAPICategorySystemBootTime` (`35F9.1`), and `NSPrivacyAccessedAPICategoryDiskSpace` (`E174.1`, `85F4.1`).
  - `NSPrivacyTracking: false`.
- **Usage Description Keys:**
  - `NSPhotoLibraryUsageDescription`: *"Allow Third & Manageable to access your photo library so you can choose a profile photo."*
  - `NSPhotoLibraryAddUsageDescription`: *"Allow Third & Manageable to save profile photo edits when needed."*
  - `NSCameraUsageDescription`: *"Allow Third & Manageable to use your camera so you can upload a profile photo."*
  - `NSMicrophoneUsageDescription`: *"Allow ThirdManageable to access your microphone"*
  - `NSUserNotificationsUsageDescription`: *"Allow notifications for daily check-in reminders and support updates."*

### 18.2 Production Infrastructure & Deployment Environment Variables
- **Backend API (`backend/` on Render):**
  - **Runtime & Deployment:** Python 3.12.13 web service (`third-and-manageable-api`) deployed via Uvicorn (`uvicorn app.main:app --host 0.0.0.0 --port $PORT`).
  - **Database:** PostgreSQL (`tm-db`), Alembic version stamp `7d2e5f8a1c34`.
  - **Env Variables:** `DATABASE_URL`, `JWT_SECRET`, `JWT_ALG=HS256`, `ACCESS_TOKEN_EXPIRE_MINUTES=10080`, `GEMINI_API_KEY`, `CORS_ORIGINS`.
- **Admin Dashboard (`third-and-manageable-admin-main` on Vercel):**
  - **Runtime:** Next.js 16.1 (App Router), React 19, Tailwind CSS v4, `firebase-admin` v13.
  - **Env Variables:** `FIREBASE_PROJECT_ID=third-and-manageable-app`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`, `ADMIN_PASSWORD`, `NEXT_PUBLIC_BASE_URL`.

---

*End of brief. This document is the source of truth for the redesign; deviations require updating it first.*

