# Lito — Analytics Tracking & KPI Instrumentation
**Version:** MVP 1.0  
**Scope:** Korean-Japanese dating app — Expo (mobile) + Admin dashboard  
**Analytics target:** Mixpanel / Amplitude / PostHog (schema is platform-agnostic)

---

## 1. Event Tracking Specification

All events follow this envelope:

```json
{
  "event": "<event_name>",
  "userId": "<uuid | anonymous_id>",
  "timestamp": "<ISO 8601>",
  "platform": "ios | android | web",
  "appVersion": "1.0.0",
  "sessionId": "<uuid>",
  "properties": { ... }
}
```

`userId` is set to an anonymous ID before login; replaced with the real user ID upon account creation. All events use snake_case names.

---

### 1.1 Onboarding Events

| # | Event Name | Trigger | Key Properties |
|---|---|---|---|
| 1 | `onboarding_started` | First app launch, onboarding screen shown | `entry_point: "fresh_install" \| "re-login"` |
| 2 | `onboarding_country_selected` | User taps a country chip | `country: "KR" \| "JP"`, `step_index: number` |
| 3 | `onboarding_step_completed` | Each onboarding slide advanced | `step_name: "language" \| "country" \| "intent" \| "photos"`, `step_index: number` |
| 4 | `onboarding_skipped` | User taps 건너뛰기 / スキップ | `at_step: string`, `step_index: number` |
| 5 | `onboarding_completed` | User reaches main tabs for first time | `duration_seconds: number`, `country: string`, `language: string`, `steps_completed: number` |

---

### 1.2 Profile Events

| # | Event Name | Trigger | Key Properties |
|---|---|---|---|
| 6 | `profile_setup_started` | User opens profile setup screen | `is_first_time: boolean` |
| 7 | `profile_field_filled` | User saves a profile field | `field: "bio" \| "intro" \| "interests" \| "photo" \| "language_level"` |
| 8 | `profile_photo_uploaded` | Photo successfully added | `photo_index: number`, `is_primary: boolean` |
| 9 | `profile_completed` | Profile reaches ≥ 80% completeness | `fields_filled: string[]`, `photo_count: number`, `has_bio: boolean`, `has_interests: boolean` |
| 10 | `profile_viewed` | User views another user's full profile | `viewer_id`, `subject_id`, `source: "discover" \| "matches" \| "chemistry_pick"`, `trust_score: number` |
| 11 | `profile_coach_opened` | User opens AI profile coach | — |
| 12 | `profile_suggestion_accepted` | User accepts AI coach suggestion | `suggestion_field: "bio" \| "intro"` |
| 13 | `profile_suggestion_rejected` | User rejects AI coach suggestion | `suggestion_field: string` |

**Profile Completeness Definition (MVP)**

| Field | Weight |
|---|---|
| Nickname | 10% |
| Age | 5% |
| Country | 5% |
| Bio (≥ 40 chars) | 20% |
| Intro (≥ 10 chars) | 10% |
| ≥ 1 photo | 20% |
| ≥ 1 interest | 15% |
| Language level set | 15% |

---

### 1.3 Verification Events

| # | Event Name | Trigger | Key Properties |
|---|---|---|---|
| 14 | `verification_started` | User taps any verify CTA | `type: "human" \| "id"`, `entry_point: "profile" \| "prompt" \| "trust_wall"` |
| 15 | `human_verification_completed` | Selfie video submitted | `duration_seconds: number` |
| 16 | `human_verification_approved` | Moderator approves human check | `review_duration_hours: number` |
| 17 | `id_verification_submitted` | ID document submitted | `document_type: "passport" \| "driver_license" \| "national_id"`, `country: string` |
| 18 | `id_verification_approved` | Moderator approves ID | `review_duration_hours: number` |
| 19 | `id_verification_rejected` | Moderator rejects ID | `rejection_reason: string`, `attempt_number: number` |
| 20 | `reverification_triggered` | System triggers re-verify | `trigger: "photo_changed" \| "nickname_changed" \| "inactivity" \| "flag"` |

---

### 1.4 Discovery & Matching Events

| # | Event Name | Trigger | Key Properties |
|---|---|---|---|
| 21 | `like_sent` | User swipes right or taps heart | `liked_user_id`, `source: "discover" \| "chemistry_pick"`, `trust_score: number`, `compatibility_score: number` |
| 22 | `pass_sent` | User swipes left or taps X | `passed_user_id`, `source: string`, `trust_score: number` |
| 23 | `match_created` | Mutual like confirmed | `match_id`, `user_country`, `match_country`, `cross_cultural: boolean` |
| 24 | `chemistry_picks_viewed` | User opens chemistry picks list | `pick_count: number` |
| 25 | `daily_pick_liked` | User likes from chemistry pick | `pick_rank: number`, `compatibility_score: number` |
| 26 | `filter_applied` | User sets discovery filters | `filters: { country, intent, language_level }` |
| 27 | `feature_gate_hit` | User hits plan limit | `feature: "daily_likes" \| "ai_coach"`, `plan: "free" \| "plus" \| "premium"` |

---

### 1.5 Messaging Events

| # | Event Name | Trigger | Key Properties |
|---|---|---|---|
| 28 | `chat_opened` | User opens a conversation | `conversation_id`, `is_first_open: boolean`, `match_age_hours: number` |
| 29 | `first_message_sent` | First message sent in a new match | `conversation_id`, `match_id`, `message_length: number`, `hours_since_match: number` |
| 30 | `first_reply_received` | Counterpart replies in a new match | `conversation_id`, `hours_since_first_message: number` |
| 31 | `message_sent` | Any message sent | `conversation_id`, `message_type: "text" \| "opener_suggestion"`, `has_translation: boolean` |
| 32 | `opener_suggestion_used` | User sends AI opener | `conversation_id`, `opener_index: number` |

---

### 1.6 Language & AI Feature Events

| # | Event Name | Trigger | Key Properties |
|---|---|---|---|
| 33 | `translation_used` | User taps translate on a message | `conversation_id`, `source_lang: "ko" \| "ja"`, `target_lang: "ko" \| "ja"` |
| 34 | `pronunciation_toggle_used` | User taps pronunciation guide | `conversation_id`, `character_count: number` |
| 35 | `ai_reply_suggestion_viewed` | User opens AI reply suggestions | `conversation_id` |
| 36 | `ai_reply_suggestion_used` | User sends AI reply suggestion | `conversation_id`, `suggestion_index: number` |
| 37 | `chemistry_card_generated` | User views their chemistry card | `dating_type: string` |
| 38 | `chemistry_card_shared` | User shares chemistry card | `share_platform: "native" \| "copy"` |

---

### 1.7 Call & Date Intent Events

| # | Event Name | Trigger | Key Properties |
|---|---|---|---|
| 39 | `call_initiated` | User taps call button | `conversation_id`, `call_type: "voice" \| "video"` |
| 40 | `call_completed` | Call ends | `conversation_id`, `duration_seconds: number`, `ended_by: "user" \| "match" \| "system"` |
| 41 | `date_intent_action_taken` | User taps "実際に会う / 직접 만나요" CTA | `conversation_id` |
| 42 | `contact_unlocked` | User unlocks match's contact info | `conversation_id`, `unlock_type: "trust_based" \| "premium"` |

---

### 1.8 Safety & Trust Events

| # | Event Name | Trigger | Key Properties |
|---|---|---|---|
| 43 | `report_submitted` | User submits a report | `reported_user_id`, `reason: string`, `source: "discover" \| "profile" \| "chat"` |
| 44 | `block_action_taken` | User blocks another user | `blocked_user_id` |
| 45 | `account_flagged` | System or moderator flags account | `flag_type: "fake" \| "scam" \| "ai_image" \| "spam"`, `score: number`, `auto: boolean` |
| 46 | `money_request_detected` | System detects financial language | `conversation_id`, `confidence: number` |
| 47 | `account_restricted` | Any restriction applied | `restriction_level: "soft" \| "hard" \| "suspension" \| "ban"`, `auto: boolean` |
| 48 | `appeal_submitted` | User submits appeal | `original_action: string`, `days_since_action: number` |
| 49 | `appeal_resolved` | Moderator resolves appeal | `outcome: "upheld" \| "overturned" \| "modified"`, `review_duration_hours: number` |

---

### 1.9 Monetization Events

| # | Event Name | Trigger | Key Properties |
|---|---|---|---|
| 50 | `paywall_viewed` | User sees paywall screen | `entry_point: "profile" \| "feature_gate" \| "discover"`, `current_plan: string` |
| 51 | `plan_selected` | User taps a plan on paywall | `plan_id: "plus" \| "premium"`, `price_display: string` |
| 52 | `purchase_started` | Purchase flow initiated | `plan_id: string`, `price_usd: number` |
| 53 | `purchase_completed` | Successful subscription | `plan_id: string`, `price_usd: number`, `currency: string` |
| 54 | `purchase_failed` | Billing failure | `plan_id: string`, `error_code: string` |
| 55 | `consumable_used` | Boost / Direct Intro consumed | `consumable_id: string` |
| 56 | `referral_code_shared` | User shares referral link | `share_method: "copy" \| "native"` |
| 57 | `referral_signup_completed` | Referred user completes onboarding | `referrer_id` |

---

### 1.10 Retention Events

| # | Event Name | Trigger | Key Properties |
|---|---|---|---|
| 58 | `app_session_started` | App foregrounded | `session_number: number`, `days_since_install: number` |
| 59 | `app_session_ended` | App backgrounded | `session_duration_seconds: number` |
| 60 | `push_notification_received` | Push delivered | `notification_type: "new_match" \| "new_message" \| "like_back"` |
| 61 | `push_notification_tapped` | User taps push | `notification_type: string` |
| 62 | `d1_retained` | System event: user returns on day 1 | `days_since_install: 1` |
| 63 | `d7_retained` | System event: user returns on day 7 | `days_since_install: 7` |
| 64 | `d30_retained` | System event: user returns on day 30 | `days_since_install: 30` |

---

## 2. Core KPI Definitions

### 2.1 Acquisition & Onboarding

| KPI | Formula | Target (MVP) |
|---|---|---|
| **Onboarding completion rate** | `onboarding_completed` / `onboarding_started` | ≥ 65% |
| **Country selection rate** | `onboarding_country_selected` / `onboarding_started` | ≥ 90% |
| **Profile completion rate** | Users with completeness ≥ 80% / total registered | ≥ 50% |
| **Photo upload rate** | Users with ≥ 1 photo / total registered | ≥ 75% |
| **Time to first profile completion** | Median minutes from `onboarding_completed` → `profile_completed` | < 10 min |

### 2.2 Trust & Verification

| KPI | Formula | Target (MVP) |
|---|---|---|
| **Human verification rate** | `human_verification_completed` / total users | ≥ 30% |
| **Human verification completion rate** | `human_verification_approved` / `verification_started (type=human)` | ≥ 85% |
| **ID verification submission rate** | `id_verification_submitted` / total users | ≥ 10% |
| **ID verification approval rate** | `id_verification_approved` / `id_verification_submitted` | ≥ 70% |
| **Suspicious account rate** | `account_flagged` (unique) / total active users | < 2% |

### 2.3 Engagement & Matching

| KPI | Formula | Target (MVP) |
|---|---|---|
| **Like-to-match rate** | `match_created` / `like_sent` | ≥ 15% |
| **Match-to-first-message rate** | `first_message_sent` / `match_created` | ≥ 60% |
| **First-message-to-reply rate** | `first_reply_received` / `first_message_sent` | ≥ 50% |
| **Translation usage rate** | Users using `translation_used` / active chatters | ≥ 40% |
| **AI feature usage rate** | Users using any AI event / active users | ≥ 25% |
| **Call conversion rate** | `call_initiated` / `match_created` | ≥ 5% |
| **Date intent rate** | `date_intent_action_taken` / `match_created` | ≥ 3% |

### 2.4 Safety

| KPI | Formula | Target (MVP) |
|---|---|---|
| **Report rate** | `report_submitted` / active user-days | < 0.5% |
| **Scam detection rate** | `account_flagged (type=scam)` / active users | < 1% |
| **False positive rate** | `appeal_resolved (outcome=overturned)` / `account_restricted` | < 10% |
| **Moderation SLA compliance** | Actions resolved within SLA / total actions | ≥ 90% |

### 2.5 Retention

| KPI | Formula | Target (MVP) |
|---|---|---|
| **D1 retention** | Users returning on day 1 / new installs (same cohort) | ≥ 40% |
| **D7 retention** | Users returning on day 7 / new installs | ≥ 20% |
| **D30 retention** | Users returning on day 30 / new installs | ≥ 10% |
| **Weekly active rate** | WAU / MAU | ≥ 35% |

### 2.6 Monetization

| KPI | Formula | Target (MVP) |
|---|---|---|
| **Paywall view rate** | `paywall_viewed` / active users | — |
| **Paywall conversion rate** | `purchase_completed` / `paywall_viewed` | ≥ 3% |
| **Subscription rate** | Paid users / total users | ≥ 5% |
| **Referral k-factor** | Successful referral signups / referral link sharers | ≥ 0.3 |

---

## 3. Dashboard Structure (Admin)

### Dashboard 1: Acquisition & Onboarding Funnel
**Audience:** Product / Growth team

```
[Install] → [onboarding_started] → [onboarding_completed]
         → [profile_setup_started] → [profile_completed]
         → [verification_started] → [human_verification_completed]
```

**Panels:**
- Daily installs by country (KR / JP split)
- Onboarding drop-off by step (bar chart per step_name)
- Profile completion distribution (0–20%, 20–40%, ... 80–100%)
- Time-to-completion histogram

---

### Dashboard 2: Engagement Funnel
**Audience:** Product team

```
[match_created] → [chat_opened] → [first_message_sent]
               → [first_reply_received] → [translation_used]
               → [call_initiated] → [date_intent_action_taken]
```

**Panels:**
- Match-to-message rate (weekly trend)
- First-message-to-reply rate (weekly trend)
- Translation usage rate by country pair (KR→JP / JP→KR)
- AI feature adoption (opener, reply suggestion, chemistry card) side-by-side
- Average messages per conversation before first reply

---

### Dashboard 3: Trust & Safety Operations
**Audience:** Moderation / Safety team

```
[report_submitted] → [account_flagged] → [account_restricted]
                  → [appeal_submitted] → [appeal_resolved]
```

**Panels:**
- Open queue by priority level (P0–P3 counts, real-time)
- Average review time by priority level
- Report reasons breakdown (pie)
- Scam / fake / AI image flags over time (line chart)
- SLA compliance rate by day
- False positive rate (overturned appeals / total restrictions)
- Moderator throughput (actions per moderator per day)

---

### Dashboard 4: Retention & Health
**Audience:** Growth / Leadership

**Panels:**
- Cohort retention table (D1 / D7 / D30 by weekly install cohort)
- DAU / WAU / MAU trend
- Push notification open rate by type
- Session length distribution
- Cross-cultural match rate (KR↔JP vs same-country)
- New matches per active user per week

---

### Dashboard 5: Monetization
**Audience:** Finance / Growth

**Panels:**
- Paywall funnel: viewed → plan selected → purchase started → completed
- Revenue by plan (Plus vs Premium)
- Conversion rate by entry point (profile / feature_gate / discover)
- Referral k-factor trend
- Feature gate hits by feature (which limits are users hitting most)

---

## 4. Funnel Specifications

### Funnel A: New User Activation
```
1. onboarding_started
2. onboarding_completed          → drop-off: measure skip rate
3. profile_setup_started
4. profile_completed             → drop-off: measure field abandonment
5. verification_started
6. human_verification_completed  → drop-off: measure friction
7. like_sent (first time)        → activation milestone
```
**Activation = user reaches `like_sent` within 7 days of install**

---

### Funnel B: Match → Meaningful Conversation
```
1. match_created
2. chat_opened                   → drop-off: notification / cold feet
3. first_message_sent            → drop-off: who initiates?
4. first_reply_received          → drop-off: quality of opener
5. translation_used              → language barrier signal
6. 10+ messages exchanged        → engaged conversation
```
**Conversion goal = `first_reply_received` within 48h of match**

---

### Funnel C: Scam Detection
```
1. message_sent (any)
2. money_request_detected        → flag trigger
3. account_flagged               → automated
4. report_submitted              → user-reported
5. account_restricted            → action taken
```
**Monitor: time from `money_request_detected` → `account_restricted`**

---

### Funnel D: Monetization
```
1. feature_gate_hit              → intent signal
2. paywall_viewed
3. plan_selected
4. purchase_started
5. purchase_completed
```
**Conversion goal = `purchase_completed` within 7 days of `feature_gate_hit`**

---

## 5. Implementation Notes

### Event Naming Conventions
- All lowercase snake_case
- Prefix by domain: `onboarding_*`, `profile_*`, `verification_*`, `match_*`, `chat_*`, `safety_*`, `paywall_*`
- Past tense for completed actions (`like_sent`, not `send_like`)
- Present tense for views (`paywall_viewed`, `chemistry_picks_viewed`)

### Current Implementation
The Lito codebase already calls `trackEvent()` from `services/analytics.ts` at key points (paywall, match, chemistry, coach). Extend the `AnalyticsEvent` union type in `types/growth.ts` for all new events above.

### Sampling Strategy (MVP)
- Track **all** events for users in first 30 days
- After 30 days: sample non-critical events at 50% (exclude safety events from sampling)
- Safety events (`report_submitted`, `account_flagged`, `money_request_detected`) are **never** sampled — always 100%

### User Privacy
- No message content is tracked in event properties
- `conversation_id` is a hashed ID, not linked to message content
- Analytics data is separated from safety/moderation data stores
- Users can request analytics data deletion (GDPR/APPI compliant)

---

*Last updated: 2026-04-08 | Owner: Product / Data Team | Classification: Internal*
