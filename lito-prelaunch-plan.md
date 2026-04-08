# Lito — Pre-Launch Improvement Plan
**Based on:** Closed Beta Synthesis (Segments A, B, C, D)  
**Version:** Pre-Launch 1.0  
**Decision date:** 2026-04-08  
**Target:** Public launch readiness

---

## Executive Summary

Beta revealed three clear truths:
1. **The core loop works** — KR↔JP cross-cultural matching with real-time translation was the most positively received feature across both segments.
2. **Trust anxiety is real** — Japanese users in particular showed hesitation without badge signals. Verification UX is not visible enough early in the flow.
3. **The conversation threshold is too high** — users match but don't message. The gap between match and first message is where Lito loses the most value.

---

## 1. Beta Feedback Categorization

### A. Critical Before Launch

| Finding | Segment | Severity | Evidence |
|---|---|---|---|
| Country selection slide: back button exits app instead of going to previous slide | A + B | P0 | 78% of testers hit this; many restarted |
| Human-verified vs. ID-verified badges visually identical at small size — testers cannot distinguish them | A + B | P0 | Only 41% correctly identified ID-verified badge |
| Report button on discover card has too small a tap area — testers miss it | A + B | P0 | 34% failed to find it without guidance |
| No confirmation screen after submitting a report — users unsure if it was sent | A + B | P0 | 67% tapped report button twice thinking it failed |
| Translation button not discovered by new users in first session | C | P0 | 55% of cross-pair testers didn't use translation in session 1 |
| App language defaults to device OS language — some JP users got Korean UI | B | P0 | 3 of 22 JP testers received Korean UI on first launch |
| Profile photos require scroll to see action buttons on small phones (SE, compact Android) | A + B | P0 | 4 testers with smaller devices missed Like/Pass buttons entirely |

### B. Important But Can Wait (post-launch sprint 1)

| Finding | Segment | Priority |
|---|---|---|
| Profile completeness % not shown to user — no self-motivation to improve | A + B | P1 |
| AI compatibility score (%) meaning never explained — testers ignore it or misread it | A + B | P1 |
| Opener suggestions feel generic if no shared interests exist | C | P1 |
| Pronunciation guide button is not discovered without prompting | C | P1 |
| JP testers unfamiliar with "건너뛰기" onboarding skip text — expected Japanese | B | P1 |
| Badge tooltip triggered by long-press only — no indication long-press exists | A + B | P1 |
| "Chemistry Picks" name is unclear — JP testers called it "the star system" | B | P1 |
| Push notification copy for new matches is bland — doesn't create urgency | A + B | P1 |

### C. Nice to Have Later (post-launch sprint 2+)

| Finding | Segment | Notes |
|---|---|---|
| Users want to filter by language proficiency in discovery | A + B | Feature parity with major apps |
| JP testers want kanji + romaji pronunciation shown together | B | Both currently shown but testers want toggle |
| Users want to see translation history in chat | C | Good for async review |
| Chemistry card wants to be shareable to Instagram Stories | A + B | Viral loop — high value, not urgent |
| Users want to know when their match is typing | C | Standard feature — expected |
| Voice message support requested | C | Spoken language practice use case |
| Dark mode inconsistencies on some Android devices | A | Minor polish |

---

## 2. UX Friction Points

### Friction Map (by screen)

```
Onboarding
├── ❌ CRITICAL: Back button exits app on slide 2+
├── ❌ CRITICAL: Language not forced — defaults to OS locale
├── ⚠️  Skip button label in wrong language on first load
└── ✅ Visual design well-received ("felt like a premium app")

Profile Setup
├── ⚠️  No progress indicator — users don't know how much is left
├── ⚠️  "Language level" options (beginner/intermediate/fluent) not enough context
├── ❌ CRITICAL: Small phone users can't reach action buttons (below fold)
└── ✅ Photo upload flow fast and clear

Discover
├── ❌ CRITICAL: Report button tap target too small (14pt area)
├── ⚠️  AI compatibility % unexplained
├── ⚠️  Trust badges at card size too small to read
└── ✅ Card swipe gesture felt natural, fast, satisfying

Matching
├── ✅ Match animation well-received ("felt exciting")
├── ⚠️  Match → Chat CTA not prominent enough on match screen
└── ⚠️  No suggested first-message prompt shown at match moment

Chat
├── ❌ CRITICAL: Translation button not discovered in session 1
├── ⚠️  AI reply suggestions visible but tap area small
├── ⚠️  No delivery/read receipt → users unsure if message was sent
└── ✅ Translation speed (2–3s) accepted once discovered

Profile (own)
├── ⚠️  No completeness ring or visual feedback
├── ⚠️  Trust badge section doesn't explain what to do next
└── ✅ Plan badge (Free/Plus/Premium) well understood
```

---

## 3. Trust & Safety Confusion Points

### Confusion Areas Ranked

| Rank | Issue | KR Impact | JP Impact |
|---|---|---|---|
| 1 | Cannot distinguish human-verified from ID-verified at badge size | High | Very High |
| 2 | Users don't know what "신원 확인 / 身元確認" actually involves | Medium | High |
| 3 | No explanation of what happens after reporting — feels unresolved | High | High |
| 4 | Trust score number (e.g., 72%) not explained — feels arbitrary | Medium | High |
| 5 | "Lito는 이 계정을 검토 중이에요" banner not differentiated from a ban — causes anxiety | Low | Medium |

### JP Segment Specific Concerns
- Japanese users showed significantly higher hesitation with profiles that had zero badges (avg. swipe time +4.2s vs. KR users)
- JP testers used the word "怪しい" (suspicious) for profiles without verification — directly tied to badge absence
- JP testers wanted to know what the verification process involves **before** starting it — "surprise ID request" felt intrusive

### KR Segment Specific Concerns
- KR users more willing to swipe without badges — but they expressed concern about scams after asking about JP users they matched
- KR users actively looked for Instagram handle on profiles — in-app social proof substitute

### Recommendations
1. Add a simple "인증이란? / 認証とは？" info screen reachable from any badge icon
2. Show badge verification steps **before** asking user to start — no surprise
3. After report submission: show "신고가 접수되었어요. 검토까지 최대 24시간이 소요됩니다." confirmation with a reference number

---

## 4. Translation & Chat Problems

### Translation Issues Found

| Issue | Frequency | Severity |
|---|---|---|
| Button not discovered in first session | 55% of C-segment | P0 |
| Korean honorifics (존댓말) not preserved in Japanese translation | Occasional | P1 |
| Long messages (> 80 chars) sometimes cut mid-sentence in translation | Rare | P1 |
| No indication translation is loading (spinner too small) | Moderate | P2 |
| Translated text smaller than original — hard to read | Moderate | P2 |

### Chat UX Issues Found

| Issue | Frequency | Severity |
|---|---|---|
| Users not sure if message was delivered (no read/delivered indicator) | High | P1 |
| AI opener suggestions dismissed too easily — users miss them on second open | Moderate | P1 |
| Chat input keyboard covers last message on Android | Occasional | P1 |
| Pronunciation guide text size too small on Android | Moderate | P2 |

### Cross-cultural Conversation Patterns Observed
- **KR → JP first messages:** mostly used AI opener suggestions (68%) — shows cultural hesitation in initiating
- **JP → KR first messages:** 45% wrote their own message, often in English as a bridge
- **Average time to first message:** 4.2 hours after match (much longer than intended)
- **Observation:** Users wanted a clearer "this is safe to message in your language" signal

---

## 5. Profile & Discovery Issues

### Profile Issues

| Issue | Segment | Severity |
|---|---|---|
| No visible progress feedback on profile completeness | A + B | P1 |
| "한 줄 소개 / 一言紹介" field purpose unclear — some left it identical to bio | A + B | P1 |
| Interest tags limited — users wanted music genre, food type, travel style options | A + B | P2 |
| Main profile photo shown at low resolution in card view on some Android devices | A | P2 |

### Discovery Issues

| Issue | Segment | Severity |
|---|---|---|
| AI compatibility % shown with no tooltip — 44% of users ignored it entirely | A + B | P1 |
| Trust score on card too small — most users didn't register it | A + B | P1 |
| Cross-cultural label (KR 🇰🇷 / JP 🇯🇵) flags not always noticed | A + B | P2 |
| Chemistry Picks naming unclear — "AI 케미 픽 / AIケミピック" not intuitive | A + B | P2 |

---

## 6. Final Launch Changes

### Launch Blocker List (P0 — Must ship before any public user sees the app)

| # | What | Why | Fix |
|---|---|---|---|
| L1 | Fix onboarding back navigation | Crashes the flow for 78% of testers | Handle back gesture on each slide → navigate to previous slide, not exit |
| L2 | Force language selection on first launch | JP users receiving KR UI destroys first impression | Override device locale with explicit language selection as step 0 |
| L3 | Distinguish trust badges visually at card size | 59% badge misidentification is a safety trust failure | Add distinct icon shapes (not just colors): ✅ checkmark / 🤳 camera / 🪪 card |
| L4 | Enlarge report button tap area | 34% failure-to-find is a safety accessibility failure | Minimum 44×44pt touch target, add long-press hint |
| L5 | Add post-report confirmation screen | 67% double-tapping report creates false duplicate reports | Show full confirmation screen with reference ID and expected timeline |
| L6 | Add translation button first-use tooltip | 55% of cross-pair users missed translation in session 1 | One-time highlight on first chat open: "탭하면 번역해요 👆 / タップして翻訳" |
| L7 | Fix action button visibility on small screens | Users on SE/compact Android missing core feature | Ensure action row always visible above tab bar — increase bottom offset or use scroll anchor |

### Final Polish List (Ship if time allows — high user perception impact)

| # | What | Impact |
|---|---|---|
| P1 | Add profile completeness ring to profile tab | Self-motivation to complete — drives activation |
| P2 | Add tooltip to AI compatibility % | Reduces confusion, increases engagement with score |
| P3 | Show verification steps before requesting them | Reduces JP user "intrusive" perception of ID request |
| P4 | Improve match → chat CTA prominence | Directly addresses match-to-message gap |
| P5 | Show "send first message in your language" prompt on new match | Reduces hesitation, drives D1 message rate |
| P6 | Add delivery indicator to messages | Reduces uncertainty, increases trust in the product |
| P7 | Add "인증이란? / 認証とは？" info accessible from any badge | Directly addresses trust comprehension gap |

### Post-Launch Backlog (Sprint 1 — within 30 days of launch)

| # | What | Priority |
|---|---|---|
| B1 | Opener suggestions improvement when no shared interests | P1 |
| B2 | Pronunciation guide discoverability improvement | P1 |
| B3 | Chemistry Picks rename / clearer labeling | P1 |
| B4 | Push notification copy refresh (new match, first message) | P1 |
| B5 | Keyboard overlap fix on Android in chat | P1 |
| B6 | Chat translation: preserve Korean honorific level in Japanese | P2 |
| B7 | Profile completeness score visible to user | P2 |
| B8 | Interest tag expansion (music, food, travel subtypes) | P2 |
| B9 | Chemistry card Instagram Stories sharing | P2 |
| B10 | Trust score explanation tooltip on discover card | P2 |

---

## 7. Launch Readiness Scorecard

| Area | Beta Score | Launch Ready? |
|---|---|---|
| Onboarding | 52% (before fixes) → projected 80% after L1+L2 | ✅ After fixes |
| Profile Setup | 71% completion rate | ✅ Ready |
| Trust Badge Comprehension | 41% (before fix) → projected 78% after L3 | ✅ After fix |
| Translation Discoverability | 45% first-session use (before fix) → projected 70% after L6 | ✅ After fix |
| Report Flow | 66% unaided success (before fix) → projected 92% after L4+L5 | ✅ After fix |
| Scam/Safety Perception | 74% — acceptable but not ideal | ⚠️ Acceptable |
| Match-to-Message Rate | 48% (below 60% target) | ⚠️ P4+P5 helps |
| NPS | 34 overall (KR: 36, JP: 31) | ✅ Above threshold |
| Critical Bugs | 7 P0 items open | ❌ Must fix all 7 |

**Go decision: Fix all 7 launch blockers (L1–L7), apply Polish items P1–P5 if time allows, launch.**

---

*Last updated: 2026-04-08 | Owner: Product + Engineering | Classification: Internal*
