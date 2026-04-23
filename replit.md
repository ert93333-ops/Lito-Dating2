# Overview

This project is a pnpm workspace monorepo using TypeScript, focused on developing a Korean-Japanese dating app called "Lito" and its supporting services.

The Lito app (artifacts/lito) is an Expo (React Native) mobile application designed to connect users from Korea and Japan for dating and language exchange. It features a sophisticated matching system, real-time chat with translation capabilities, and a personalized user experience. Key capabilities include user authentication, profile management, a swipe-based discovery feed, real-time chat with message persistence, object storage for photos, and a contact blocking feature. The app aims to facilitate cultural connection and language learning.

Complementing the app is the Lito Admin dashboard (artifacts/admin), a React-based data visualization tool for trust & safety moderation, and an Express-based API Server (artifacts/api-server) providing backend services, including authentication, user management, chat, AI-powered features (matching, coaching, translation), and legal content serving.

The project's ambition is to create a leading platform for cross-cultural dating with robust AI integration and a strong focus on user safety and experience.

# User Preferences

I want iterative development.
Do not make changes to `chat/[id].tsx`.
Do not reintroduce pronunciation features.
Translation must remain free for all plans; never paywall it.

# System Architecture

The project is structured as a pnpm workspace monorepo using Node.js 24 and TypeScript 5.9.

## UI/UX Decisions (Lito App)

- **Theme**: White background, rose/pink (#D85870) accent, dark charcoal text.
- **App Icons**: Two overlapping hearts (coral pink + golden yellow) on a white background for `icon.png` (1024x1024) and `splash.png` (9:16).
- **Key Screens**: Onboarding (3 slides), Login, Profile Setup, Discover (swipe cards), Matches, Chats, Chat Detail, Profile, Settings, Dating Style Diagnosis.
- **Component Design**: Custom components like `Button`, `CompatibilityChip`, `CountryFlag`, `ProfileImage`, `LitoMark`, and a layered `TrustBadge` system.
- **Animations**:
    - Chat bubble animations: fade + slide-up on entry (200ms), translation toggle crossfade (220ms), AI quick reply panel slide-up (250ms).
    - Discover card animations: fade + slide on entry (260ms), LIKE/PASS stamps with spring animation (scale 0.72→1), directional color overlays (rose tint for LIKE, grey tint for PASS), enhanced bottom gradient, and top scrim for readability.
- **Chat List UI**: Filter tabs (All/Unread/Requests), unread badge on avatar, bold font + rose color for unread timestamps, improved time formatting.
- **Discover Cards**: Language study badge (📚 pill, green glass), interests, and match reason chips.
- **Matches Screen**: TrustBadge, trust dot overlay, study badge, AI ice breaker suggestion card, last active status.
- **Profile Screen**: Section for cultural connection goals (KR↔JP flag bridge, language levels).
- **Lifestyle Filters**: Smoking/Drinking habits with UI for selection chips and display, filtering options in Discover.

## Technical Implementations (Lito App)

- **Monetization**:
    - 3 plans: Free (20 likes/day, 3 picks), Plus (unlimited likes + boost), Premium (see who liked + AI coach).
    - Consumables: Boost, Direct Intro, City Pass, AI Review.
    - Entitlement system (`isEntitled`/`useEntitlement`) to check plan membership.
    - Mock billing system for future integration with RevenueCat/App Store.
    - Paywall screen for plan comparison and upgrades.
- **AI Matching (Heuristic)**:
    - `computeCompatibility()`: Scores based on intent, interests, cultural fit, conversation style, meeting feasibility.
    - `generateChemistryPicks()`: Daily ranked picks (3 for free, 10 for Plus/Premium).
    - `generateProfileSuggestions()`: Template-based intro/bio improvements.
    - `generateOpeners()`: Contextual conversation starters based on shared interests and country.
    - `generateChemistryCard()`: Deterministic dating-type card (4 types).
- **Viral / Referral**:
    - `generateReferralCode()`: Deterministic userId prefix + random suffix.
    - Reward system: boost on signup, direct intro on first match.
    - `applyReferralCode()`: Validates and records referral attribution.
    - Referral screen for code/link sharing, reward claiming, and stats.
- **Analytics**: `trackEvent()` facade covering 24 events across monetization, AI, and viral categories, with console logging in development.
- **Authentication**: Email/password registration/login with JWT (30-day expiry). Social login support for Google, Apple, Kakao, and LINE (server-side OAuth). Deep linking for auth callbacks.
- **Real-time Chat**: WebSocket-based (`ws` package) with JWT authentication, room-based broadcasting, message persistence in DB, auto-reconnection, and HTTP fallback.
- **Object Storage**: Google Cloud Storage (GCS) based for photo uploads, utilizing presigned PUT URLs for direct client-to-GCS uploads, with server-side serving of objects.
- **Discovery**: DB-driven discovery with `swipe_passes` table, enabling actual user interaction tracking (like/pass/match). AI personas auto-match, demo users are in-memory, and unauthenticated guests see demo/AI users.
- **Contact Blocking**: `expo-contacts` and `expo-crypto` are used to hash contact numbers client-side (SHA-256) before sending to the server (`contact_block_hashes` table), ensuring two-way blocking in the Discover feed.

## System Design Choices (API Server)

- **API Framework**: Express 5.
- **Database**: PostgreSQL with Drizzle ORM.
- **Validation**: Zod (`zod/v4`) and `drizzle-zod`.
- **API Codegen**: Orval from OpenAPI spec.
- **Build**: esbuild (CJS bundle).
- **Logging**: Pino.
- **Architecture**: Modular 3-layer design (Router → Service → Repository).
    - **Router**: Handles I/O validation only.
    - **Service**: Contains business logic and LLM calls.
    - **Repository**: Manages DB queries only.
- **Interest Signal System v4**:
    - `conversation_participants`: Manages chat memberships.
    - `feature.extractor`: Extracts conversation features from messages.
    - `interest.repository`: Handles `interest_snapshots` and `latest_interest_snapshots` DB I/O.
    - `llm.circuit`: Implements an LLM circuit breaker for resilience.
    - `interest.worker`: Asynchronous worker for analyzing interest signals with debouncing.
    - `interest.service`: Computes PRS (Persona-Relationship Score) using deterministic and LLM-based logic.
    - `ws.ts`: WebSocket gateway for real-time communication, JWT authentication, room authorization, and interest signal push.
- **AI Coaching/Language Features**: `/ai/coach`, `/ai/suggest-reply`, `/ai/translate`, `/ai/persona`, `/ai/conversation-starter`, `/ai/generate-profile-photo`.

# External Dependencies

- **Monorepo Tool**: pnpm workspaces
- **Package Manager**: pnpm
- **API Framework**: Express 5
- **Database**: PostgreSQL
- **ORM**: Drizzle ORM
- **Validation**: Zod
- **API Codegen**: Orval
- **Build Tool**: esbuild
- **Logging**: Pino
- **Mobile Framework**: Expo (React Native), Expo Router
- **State Management (Mobile)**: AsyncStorage
- **Contact Management (Mobile)**: expo-contacts
- **Cryptography (Mobile)**: expo-crypto
- **Real-time Communication**: `ws` package
- **Object Storage**: Google Cloud Storage (GCS)
- **UI Framework (Admin)**: React
- **Routing (Admin)**: Wouter
- **Data Fetching (Admin)**: TanStack Query
- **Styling (Admin)**: Tailwind CSS
- **OAuth Providers**: Google, Apple (via `expo-apple-authentication`), Kakao, LINE
- **AI/LLM**: OpenAI (via `src/infra/openai`)
- **Analytics**: PostHog/Amplitude (facade present, integration points defined)