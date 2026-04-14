# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Artifacts

### Lito - Korean-Japanese Dating App (`artifacts/lito`)
- **Type**: Expo (React Native) mobile app
- **Preview Path**: `/`
- **Stack**: Expo Router, React Native, TypeScript, AsyncStorage
- **Key screens**: Onboarding (3 slides), Login, Profile Setup, Discover (swipe cards), Matches, Chats, Chat Detail, Profile, Settings, Dating Style Diagnosis (6-question flow)
- **Data**: Mock data only (6 users, 3 matches, 1 sample conversation)
- **Theme**: White background, rose/pink (#D85870) accent, dark charcoal text
- **UX improvements done**:
  - User type extended: `city?`, `studyingLanguage?`, `languageLevel?`, `interests?`
  - Match type extended: `iceBreaker?` (AI suggested opening line)
  - Discover cards: language study badge (📚 pill, green glass), interests + match reason chips
  - Matches screen: TrustBadge (sm), trust dot overlay, study badge, ice breaker suggestion card, last active
  - Profile screen: 문화 연결 목표 section (KR↔JP flag bridge, beginner/intermediate/advanced level)
- **TODO**: Supabase auth + database, OpenAI translation + AI reply suggestions, Kakao/LINE OAuth

### Lito Admin — Trust & Safety Dashboard (`artifacts/admin`)
- **Type**: data-visualization (React + Vite)
- **Preview Path**: `/admin/`
- **Stack**: React, Wouter, TanStack Query, Tailwind CSS
- **Pages**: 개요, 신고 큐, 사용자 조회, 사용자 상세(모더레이터 조치), 신분증 인증 큐, 위험 플래그, 이의 신청
- **Data**: Mock 데이터 (`src/data/mockData.ts`) — DB 연동 필요 시 API 서버 확장 필요
- **Features**: 리스크 점수, 안티스캠 플래그 7종, 4티어 모더레이터 권한 설계, 감사 로그 설계

### API Server (`artifacts/api-server`)
- **Type**: Express API server
- **Stack**: Express 5, TypeScript, Drizzle ORM, Pino logging

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.

## Lito App Structure

```
artifacts/lito/
  app/
    _layout.tsx          # Root layout: AppProvider → GrowthProvider → GestureHandler → …
    onboarding.tsx       # 4-phase onboarding: 3 feature slides → country selection (KR/JP)
    login.tsx            # Login screen (Email, Kakao, LINE placeholders)
    profile-setup.tsx    # Profile setup (2-step wizard: basics→interests, country pre-selected in onboarding)
    settings.tsx         # Settings screen
    paywall.tsx          # Subscription upgrade screen (Free / Plus / Premium)
    profile-coach.tsx    # AI Profile Coach: suggestions the user can accept/reject
    referral.tsx         # Referral invite: code sharing, rewards, apply friend codes
    (tabs)/
      _layout.tsx        # Tab bar with Discover, Matches, Chats, Profile
      discover.tsx       # Swipe cards + chemistry picks pill in header
      matches.tsx        # Matches list + referral nudge card
      chats.tsx          # Conversations list
      profile.tsx        # My profile + Growth section (plan badge, AI coach, referral)
    chat/
      [id].tsx           # Chat with real-time KR↔JP translation (DO NOT TOUCH)
  components/
    Button.tsx, CompatibilityChip.tsx, CountryFlag.tsx, ProfileImage.tsx, LitoMark.tsx
    TrustBadge.tsx  # Layered trust badge system (4 layers: human/face/id/institution)
  constants/colors.ts    # Design tokens (rose pink theme)
  context/
    AppContext.tsx        # Core app state (auth, users, matches, conversations)
    GrowthContext.tsx     # Phase 5 growth state (subscription, picks, coach, referral)
  services/
    analytics.ts         # Event tracking facade (console in dev, swap in real provider)
    monetization.ts      # Plan definitions, entitlements, usage limits, mock billing
    aiMatching.ts        # Heuristic compatibility scoring + chemistry picks + openers
    referral.ts          # Referral code generation + reward logic
  hooks/
    useEntitlement.ts    # Inline entitlement check hook
    useColors.ts, useLocale.ts
  types/
    index.ts             # Core app types
    growth.ts            # Phase 5 types (plans, entitlements, picks, referral, analytics)
  data/mockData.ts       # Mock users, matches, conversations, messages
```

## Phase 5 — Growth Layer (Implemented)

### Monetization
- 3 plans: Free (20 likes/day, 3 picks), Plus ($9.99, unlimited likes + boost), Premium ($19.99, see who liked + AI coach)
- Consumables: Boost, Direct Intro, City Pass, AI Review
- Entitlement system: `isEntitled(key)` / `useEntitlement(key)` checks plan membership
- Mock billing: `mockUpgradeToPlan()` — ready for RevenueCat/App Store wiring
- Paywall screen: plan comparison, trust note ("translation always free"), one-tap upgrade

### AI Matching (heuristic, clearly labeled in code)
- `computeCompatibility()` scores 5 dimensions: intent fit, interest overlap, cultural fit, conversation style, meeting feasibility
- `generateChemistryPicks()` — daily ranked picks (3 for free, 10 for plus/premium)
- `generateProfileSuggestions()` — template-based intro/bio improvements, user can accept/reject
- `generateOpeners()` — 3 contextual conversation starters based on shared interests + country
- `generateChemistryCard()` — deterministic dating-type card (4 types, shareable)

### Viral / Referral
- `generateReferralCode()` — deterministic userId prefix + random suffix
- Reward system: boost on signup, direct intro on first match
- `applyReferralCode()` — validates and records referral attribution
- Referral screen: code/link sharing, reward claiming, stats, step-by-step explainer

### Analytics
- `trackEvent()` facade covers 24 events across monetization, AI, and viral categories
- Console logging in dev; replace `send()` in analytics.ts to wire in PostHog/Amplitude

### CRITICAL — Do Not Touch
- `chat/[id].tsx` — translation enrichment pipeline (enrichmentMap, inflight, translationCache)
- Pronunciation features must NEVER be reintroduced
- Translation is free for all plans — never paywall it
