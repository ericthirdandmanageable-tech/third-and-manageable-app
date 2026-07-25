# Third & Manageable — Comprehensive Feature Analysis & Technical Architecture

This document provides a complete breakdown of **Third & Manageable**, consolidating:
1. **Original Shipped Mobile App Features** (derived from the compiled Expo/React Native iOS bundle `original-app`).
2. **Admin Portal Implementation** (uncompiled Next.js application in `third-and-manageable-admin-main`).
3. **Backend API & Domain Services Architecture** (uncompiled FastAPI Python application in `backend`).
4. **Integration Plan**: Situating the redesign `web-prototype` within the broader backend and administrative services.
5. **Deployment & App Store Manifest Reference**: Complete environment variables, iOS entitlements, Privacy Manifest definitions, and build settings for App Store submission.

---

## 1. Original App Feature Inventory (Compiled iOS Bundle Pass)

The shipped iOS application is built with Expo Router / React Native, Firebase Auth + Firestore, and Google's Gemini LLM via the Generative AI SDK in-app.

### 1.1 Onboarding & Identity
- **Transition Status Intake**: Categorizes users into transition stages:
  - *"I'm currently competing or training in my sport."*
  - *"I've transitioned or am transitioning out of competitive sport."*
- **Sport-Tailored Messaging**: Promises *"We'll tailor your experience using language from your game."*
- **School & Profile Verification**: Collects display name, school, and sport. Restricts community features behind a verification gate:
  - *"Verify your account to participate in chat."*
  - *"Your verification request has been submitted. You'll be notified when it's approved."*

### 1.2 Daily Check-Ins & Reflection Prompts
- **Structured Journaling**: Focuses on post-sport identity, routine changes, and cognitive reframing.
- **Deep Prompt Library Examples**:
  - *"What does 'showing up' mean to you now?"*
  - *"How do you introduce yourself now that sport isn't the first thing?"*
  - *"How do you stay disciplined without a training schedule?"*
  - *"What gives you energy outside of competition?"*
  - *"Write 3 sentences to yourself 90 days from now. What do you hope to tell them?"*
  - *"Catch a self-critical thought today and rewrite it. 'I can't' becomes 'I'm learning to.'"*
- **Career Seeds (Existing in Original App)**:
  - *"What interests or careers are you considering now?"*
  - *"What skill from your sport translates best to everyday life?"*

### 1.3 The Clipboard (AI Coach)
- **Selectable Tone Directives**: Four user-selected personas fed to Gemini system instructions:
  - **The Friend**: Calm, relaxed, conversational tone.
  - **The Analyst**: Structured, logical, framework-driven tone.
  - **The Hype Coach**: Upbeat, high-energy, encouraging tone (*"Let's go!"*).
  - **The Mentor**: Wise, experienced, steady tone.
- **Safety System**: Enforces Google Gemini content safety filters (civic integrity, dangerous content).
- **Known MVP Gaps**: The current AI lacks persistent memory across sessions, has no connection between check-in data and the Game Plan, and lacks documented safety escalation for concerning or crisis language.

### 1.4 Verified Community & Peer Support
- **Gated Athlete Rooms**: Verified athlete-only communication with `@-mention` support.
- **Immediate Support Escalation**:
  - *"I need peer support right now."* / *"I need technical support."* → Triggers community alert: *"We've notified the community. A peer will reach out soon."*
- **Known MVP Gaps**: Full user email addresses are visible inside Global Athlete Room content, which is a critical privacy issue affecting current users.

### 1.5 Progress Tracking, Goals & Streaks
- **90-Day Guided Journey**: Milestone banners (`14-Day Streak!`, `Halfway through your journey!`, `Your 90-day journey is complete.`).
- **Daily Actions**: Action lists (`Write Down 3 Wins`, `Hydrate First Thing`, `Visualize Your Next Chapter`).
- **Game Plan Screen**: Preliminary `GamePlanScreen` interface.
- **Known MVP Gaps**: Data logic errors frequently occur, such as the journey counter displaying "Day 109 of 90" and dashboard data conflicts (e.g., showing 0 weekly check-ins while also displaying "Checked in today").

### 1.6 Moderation & Crisis Safety
- **Emergency Crisis Surfaces**: Direct display of emergency numbers (*"Call 911 or call/text 988 for the Suicide & Crisis Lifeline"*).
- **User Control & Moderation**: Report content, block users, terms of service enforcement.

---

## 2. Admin Web Dashboard Implementation (`third-and-manageable-admin-main`)

The uncompiled `third-and-manageable-admin-main` directory contains a full-featured administrative web application built for app operators and community moderators.

### 2.1 Stack & Architecture
- **Framework**: Next.js 15/16 (App Router, Server Components), React 19, TypeScript, Tailwind CSS, Lucide React icons.
- **Data Layer**: Direct integration with **Firebase Firestore** via `firebase-admin` (`src/lib/firebase-admin.ts`).
- **Auth & Session Management**: Custom admin login route (`src/app/login`), session cookie handling (`src/lib/auth.ts`, `/api/login`, `/api/logout`).

### 2.2 Core Administrative Features & Modules

#### 1. Overview & Signups Dashboard (`/`)
- **Metric Cards**: Total signups, signups today, last 7 days, this month, verified users count, pending verification requests.
- **Recent Signups Table**: Shows new user registrations parsed from Firestore `profiles` collection using `joined_at` timestamps, display name, email, sport, school, and verification badge.

#### 2. User & Verification Management (`/users`)
- **User Directory**: Searchable by name, email, sport, or school.
- **Verification Operations**: One-tap verification status toggle (`/api/verify-user`) updating `verified: true/false` in Firestore.
- **Account Moderation Flags**:
  - **Suspend User** (`/api/suspend-user`): Sets `suspended: true`.
  - **Ban User** (`/api/ban-user`): Sets `banned: true`.
  - **Chat Ban**: Toggles `chat_banned: true`.
- **Streak Monitoring**: Displays active user streak flame count (`🔥 streak`).

#### 3. Wellness & Check-In Analytics (`/checkins`)
- **Trends & Metrics**: 7-day check-in bar chart, total check-in count, average mood rating (1–5 scale), unique active users.
- **Check-In Log Table**: Displays user display names, mood ratings, optional journal notes, and submission dates from Firestore `checkins` collection.

#### 4. Community & Chat Moderation (`/community`)
- **Message Moderation Interface**: Inspects chat messages across channels.
- **Moderation Actions**: Delete messages (`/api/delete-message`), remove flag posts, and issue user warnings.

#### 5. Support Request Queue (`/support`)
- **Support Ticket Management**: Displays peer support requests and technical support messages.
- **Status Updates**: Updates ticket statuses (`open` → `resolved`) via `/api/update-support`.

#### 6. Game Plan Overview (`/gameplans`)
- Inspects user game plan completions, daily action completion metrics, and journey progress.

---

## 3. Backend API & Domain Services Architecture (`backend`)

The `backend` folder contains an uncompiled FastAPI Python application serving as the primary REST API backend for the redesigned app.

### 3.1 Stack & Database Schema
- **Framework**: FastAPI, Uvicorn, Python 3.
- **ORM & Database**: SQLAlchemy ORM, Alembic migrations, SQLite database (`third_manageable.db`) with PostgreSQL production compatibility.
- **Authentication**: JWT tokens (`python-jose`, `passlib` with bcrypt).

### 3.2 SQLAlchemy Domain Models (`app/database.py`)
- `User`: Email, password hash, display name, school, transition status (`competing` | `transitioning` | `transitioned`), headline (140-char career statement), verified status.
- `AthleteProfile`: Sport, role, years competed, relied-on story prompt (Hinge-style intake), favorite part of game, intake_done flag, cached `skill_map` JSON.
- `CheckIn`: User ID, date (`YYYY-MM-DD`), prompt ID & question, selected option, journal text, ambient health metrics JSON (sleep, activity, HRV).
- `Commitment`: User ID, committed `path_id` (e.g. `consulting`, `nine_to_five`).
- `ActionCompletion`: Completed weekly action ID, ISO week date (`week_of`).
- `ClipboardMessage`: Chat history role (`user` | `ai`), text, persona ID (`friend`, `analyst`, `hype`, `mentor`).
- `Forum`, `Post`, `Comment`, `Vote`: Reddit-style forum entities with categories (`Path`, `Local`, `Sport`, `Support`), post flairs (`WIN`, `VENT`, `QUESTION`, `RESOURCE`, `MILESTONE`), nested comment hierarchy, upvotes.
- `PeerSupportRequest`, `TechSupportRequest`: Support queue items.

### 3.3 Backend Services & Logic Modules

#### 1. Skill Translation Engine (`app/services/skills.py`)
- **Intake Processing**: Translates athletic role, favorite game elements, and story prompt into civilian transferrable skills.
- **Rules Engine (`derive_skill_map`)**:
  - *Captain / Leader* → **Leading peers without authority** (Origin: Team leadership)
  - *Engine* → **Sustained output under fatigue** (Origin: Set pace)
  - *Strategist* → **Pattern recognition & rapid preparation** (Origin: Film study)
  - *Preparation* → **Process-oriented delivery** (Origin: Loved the prep)
  - *Competitiveness* → **Ownership of outcomes** (Origin: Lived for game)
  - *Story Prompt (`relied_on`)* → **Stakeholder management & pitching**

#### 2. Path Fit Scoring Engine (`app/services/skills.py`)
- **Ranking System (`score_path_fit`)**: Evaluates athlete fit across five core work structures:
  1. **9–5 / Corporate**
  2. **Gig work**
  3. **Consulting**
  4. **Overnight / Shift work**
  5. **Entrepreneurship**
- **Scoring Rationale**: Computes fit score based on intake responses and skill badges, returning fit tier (`STRONG FIT` / `WORTH EXPLORING`) and transparent rationale.

#### 3. The Clipboard AI & Invisible Adaptation Engine (`app/services/gemini.py`)
- **Google Gemini 1.5 Flash Integration**: Generates coaching responses configured with persona instructions.
- **Invisible Adaptation Engine (`_summarize_adaptation`)**:
  - Analyzes recent user message length and engagement patterns.
  - **Short answers (< 20 chars)** → Appends directive: *"User experiencing journaling fatigue. Pivot to closed-ended, multiple-choice questions."*
  - **Reflective answers (≥ 120 chars)** → Appends directive: *"User is reflective. Adopt 'The Analyst' persona. Help break things down logically."*
- **Crisis Interception & Fallback**: Automatically redirects safety-critical messages to 988/911 crisis resources. Offers deterministic offline mock responses when API keys are absent.

#### 4. Reddit-Style Community Forums (`app/routes/community.py`)
- **Category Routing**: Forums grouped into `Path` (work structures), `Local`, `Sport`, and `Support`.
- **Post & Comment Mechanics**: Supports post flairs, upvoting (`votes` table), and recursive nested comment trees (`Comment.replies`).

---

## 4. Architectural Integration Plan: Situating `web-prototype`

The goal outlined in `REDESIGN_BRIEF.md` is to combine the emotional wellness/transition substrate of the original product with the new **Career Pillar** and modernized design language.

```
┌─────────────────────────────────────────────────────────────┐
│                    CLIENT LAYER                              │
│  web-prototype (Vite + React)  <--->  Mobile App (Expo)      │
│  (Check-In · Game Plan · Clipboard · Community Forums)      │
└──────────────┬──────────────────────────────┬───────────────┘
               │                              │
               ▼                              ▼
┌──────────────────────────────┐┌─────────────────────────────┐
│      FASTAPI BACKEND         ││    NEXT.JS ADMIN PORTAL     │
│   (backend/app)              ││ (third-and-manageable-admin)│
│                              ││                             │
│ • /auth (JWT Auth)           ││ • User Moderation & Ban     │
│ • /check-ins (Journaling)    ││ • Verification Approval     │
│ • /game-plan (Skill Engine)  ││ • Check-In Trend Analytics  │
│ • /clipboard (Gemini Coach)  ││ • Support Ticket Queue      │
│ • /community (Reddit Forums) ││ • Community Flagged Content │
└──────────────┬───────────────┘└──────────────┬──────────────┘
               │                              │
               └──────────────┬───────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    PERSISTENCE LAYER                        │
│   PostgreSQL / SQLite Database  <--->  Firebase Firestore    │
└─────────────────────────────────────────────────────────────┘
```

### 4.1 Step-by-Step Technical Plan

1. **Frontend API Integration (`web-prototype` → `backend`)**:
   - Replace mocked state in `web-prototype` with API client calls to `backend` endpoints (`/auth`, `/profile`, `/check-ins`, `/game-plan`, `/clipboard`, `/community`).
   - Wire the intake questionnaire in `web-prototype` to trigger `POST /profile/intake`, generating the Skill Map and Path Fit cards dynamically.

2. **Admin Portal Synchronization (`third-and-manageable-admin-main` ↔ `backend`)**:
   - **Option A (Unified PostgreSQL/SQL DB)**: Update Next.js admin app to query the FastAPI SQL database directly via Prisma or Drizzle ORM, keeping admin management in sync with all live backend data.
   - **Option B (Firebase Event Sync / Adapter)**: Add database event listeners or an sync service to populate Firestore `profiles`, `checkins`, `messages`, and `support_requests` whenever FastAPI handles client writes.

3. **Production Service Deployment**:
   - Deploy FastAPI `backend` (using Render / Railway / Docker, referenced by `render.yaml`).
   - Deploy Next.js `third-and-manageable-admin-main` admin app (Vercel / Render).
   - Host `web-prototype` as a static SPA web app while maintaining Expo React Native mobile build parity.

---

## 5. Deployment & App Store Manifest Reference

### 5.1 iOS App Store Submission Metadata (`Info.plist` & Entitlements)
* **Bundle Identifier**: `com.thirdandmanageable.app`
* **URL Schemes**: `thirdandmanageableapp://`, `com.thirdandmanageable.app://`
* **Executable Name**: `ThirdManageable`
* **Minimum OS Version**: `18.0` (Build Target Xcode 16 / iOS 18 SDK)
* **Architecture**: `arm64`, New Architecture enabled (`RCTNewArchEnabled: true`)
* **Encryption Exemption**: `ITSAppUsesNonExemptEncryption: false` (standard App Store encryption declaration)
* **Privacy Manifest (`PrivacyInfo.xcprivacy`)**:
  * **Accessed API Categories**:
    * `NSPrivacyAccessedAPICategoryFileTimestamp` (Reasons: `C617.1`, `0A2A.1`, `3B52.1`)
    * `NSPrivacyAccessedAPICategoryUserDefaults` (Reason: `CA92.1`)
    * `NSPrivacyAccessedAPICategorySystemBootTime` (Reason: `35F9.1`)
    * `NSPrivacyAccessedAPICategoryDiskSpace` (Reasons: `E174.1`, `85F4.1`)
  * **Tracking Declaration**: `NSPrivacyTracking: false`
* **Permission Usage Strings (iOS Privacy Keys)**:
  * `NSPhotoLibraryUsageDescription`: *"Allow Third & Manageable to access your photo library so you can choose a profile photo."*
  * `NSPhotoLibraryAddUsageDescription`: *"Allow Third & Manageable to save profile photo edits when needed."*
  * `NSCameraUsageDescription`: *"Allow Third & Manageable to use your camera so you can upload a profile photo."*
  * `NSMicrophoneUsageDescription`: *"Allow ThirdManageable to access your microphone"*
  * `NSUserNotificationsUsageDescription`: *"Allow notifications for daily check-in reminders and support updates."*

### 5.2 Next.js Admin Panel Environment Variables (`third-and-manageable-admin-main`)
```bash
# Firebase Admin Service Account Credentials
FIREBASE_PROJECT_ID=third-and-manageable-app
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-fbsvc@third-and-manageable-app.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."

# Admin Portal Password
ADMIN_PASSWORD=<redacted — rotate; see VERCEL_MIGRATION_PLAN.md §6.2>

# Public App Base URL
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```
* **Dependencies**: Next.js `16.1.6`, React `19.2.3`, `firebase-admin` `^13.6.1`, Tailwind CSS `^4`.

### 5.3 FastAPI Backend Environment Variables & Render Deployment Spec (`backend/`)
```bash
# Database & Authentication
DATABASE_URL=sqlite:///./third_manageable.db # Local SQLite dev; Render uses PostgreSQL
JWT_SECRET=change-me-in-production
JWT_ALG=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=10080

# Google Gemini API
GEMINI_API_KEY=your-gemini-api-key # Optional: Falls back to offline mock if empty

# CORS Whitelist
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
```
* **Render Deployment Specification (`render.yaml`)**:
  * **Service Type**: Python Web Service (`third-and-manageable-api`)
  * **Region**: Oregon
  * **Python Version**: `3.12.13`
  * **Build Command**: `pip install -r requirements.txt`
  * **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
  * **Health Check**: `/health`
  * **Database**: PostgreSQL (`tm-db`, database name `third_manageable`, user `tm`)
  * **Alembic Database Version Stamp**: `7d2e5f8a1c34`

---

## 6. Product Strategy, Business Model & MVP Assessment

The business proposal and client brief documents (pitch deck, scoping agenda, and reconstructed wireframes) provide crucial context for the redesign and beta phase priorities.

### 6.1 Beta "North Star" & Core Experiences
The immediate goal for the rebuilt beta is to deliver four core experiences exceptionally well, pausing secondary features (like streaks and complex journeys) until the foundation is stable:
1. **Personalized Onboarding**: Moving from basic profile fields to a conversational intake.
2. **AI Transition Companion (The Clipboard)**: Rebuilding with persistent memory, personalization, and documented safety escalations.
3. **Daily Game Plan**: Connecting the daily action and check-in directly to the AI, keeping it simple (one action, one mindset prompt, one habit).
4. **Safe Athlete Community**: Simplifying the Global Room and strengthening privacy and moderation.

### 6.2 Known MVP Debts & Technical Concerns
The original MVP suffers from several critical issues that the new architecture must resolve:
- **Data Privacy Leaks**: User email addresses were inadvertently exposed inside the Global Athlete Room content.
- **Infrastructure Flaws**: The current Appwrite authentication implementation uses a free plan that pauses during inactivity, blocking user sign-ins. Single shared credentials were used across services.
- **Data Logic Errors**: The journey counter displays broken states (e.g., "Day 109 of 90") and conflicting check-in metrics on the dashboard.
- **AI & Safety Gaps**: The current AI lacks persistent memory across sessions, has no connection between check-in data and the Game Plan, and lacks documented crisis escalation for concerning language.
- **Accessibility**: UI elements like light-gray text fail WCAG contrast standards.

### 6.3 Business Model & Revenue Streams
Third & Manageable employs a dual revenue strategy:
- **B2C (Individual Athletes)**:
  - *Free*: Basic check-ins, streak tracking, core prompts.
  - *Premium*: $9.99/mo or $79/yr (Full platform access, advanced AI).
  - *Peer Support*: $35/session (1-on-1 athlete mentoring).
- **B2B (Institutional / University)**:
  - *No-Cost Pilot*: Used for initial campus expansion (e.g., Spring 2025 CWRU Pilot with 84 active users).
  - *Team License*: $7,500/year (covers up to 75 athletes).
  - *Department License*: $25,000/year.
  - *Enterprise*: Custom pricing.

### 6.4 Go-To-Market & Scale Strategy
1. **Phase 1 (Now)**: University Pilots (Athletic director outreach, CWRU model replication).
2. **Phase 2 (Months 3–6)**: Athlete Ambassador Program (Founding athletes, NIL partnerships, word of mouth).
3. **Phase 3 (Months 6–12)**: HBCU Expansion (Sponsored access and mission-aligned partnerships).
4. **Phase 4 (Months 12+)**: Direct-to-Consumer (App Store launch, organic social community growth).

### 6.5 Fundraising & Development Context
The current phase is driven by a **$100,000 pre-seed fundraise** aimed at achieving product readiness and converting initial pilots into paying contracts.
- **Development Allocation**: $40,000 (40% of the raise) is explicitly allocated for app development.
- **Year 2 Target**: 10 universities and 2,000 individual subscribers, projecting $250K–$500K ARR.
- **Advisory Board**: Includes sports and business veterans (e.g., Hue Jackson, Cliff Lewis, Orlando Gunn, Chris Overton, Ty Twine) ensuring strong industry alignment.
