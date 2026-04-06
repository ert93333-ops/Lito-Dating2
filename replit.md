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
- **Key screens**: Onboarding (3 slides), Login, Profile Setup, Discover (swipe cards), Matches, Chats, Chat Detail, Profile, Settings
- **Data**: Mock data only (6 users, 3 matches, 1 sample conversation)
- **Theme**: White background, rose/pink (#E8607A) accent, dark charcoal text
- **TODO**: Supabase auth + database, OpenAI translation + AI reply suggestions, Kakao/LINE OAuth

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
    _layout.tsx          # Root layout with providers (AppProvider, QueryClient, etc.)
    onboarding.tsx       # 3-slide onboarding screen
    login.tsx            # Login screen (Email, Kakao, LINE placeholders)
    profile-setup.tsx    # Profile setup screen
    settings.tsx         # Settings screen
    (tabs)/
      _layout.tsx        # Tab bar with Discover, Matches, Chats, Profile
      discover.tsx       # Swipe card discover screen
      matches.tsx        # Matches list screen
      chats.tsx          # Conversations list screen
      profile.tsx        # My profile screen
    chat/
      [id].tsx           # Chat detail screen with translation + unlock
  components/
    Button.tsx           # Reusable button
    CompatibilityChip.tsx # Match reason chip
    CountryFlag.tsx       # KR/JP flag display
    ProfileImage.tsx      # Profile photo with fallback
  constants/colors.ts    # Design tokens (rose pink theme)
  context/AppContext.tsx  # Global state (auth, users, matches, conversations)
  data/mockData.ts        # Mock users, matches, conversations, messages
  types/index.ts          # TypeScript interfaces
```
