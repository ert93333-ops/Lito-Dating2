# Lito — Closed Beta Test Plan
**Version:** MVP Beta 1.0  
**Target launch:** Closed beta before public release  
**Scope:** Korean ↔ Japanese cross-cultural dating app  
**Beta size:** 40–80 testers (20–40 per country)

---

## 1. Tester Segments

### Segment A — Korean Users (KR)
| Attribute | Spec |
|---|---|
| Count | 20–40 people |
| Age | 22–35 |
| Location | Seoul, Busan, Daegu (domestic Korea preferred) |
| Japanese exposure | Mix: some studying Japanese, some not |
| Device | Android primary (higher KR market share), some iOS |
| Recruiting channel | KR community Discord, Blind (앱/게임 채널), Instagram DM, university clubs |

### Segment B — Japanese Users (JP)
| Attribute | Spec |
|---|---|
| Count | 20–40 people |
| Age | 22–35 |
| Location | Tokyo, Osaka, Kyoto |
| Korean exposure | Mix: K-pop fans, K-drama watchers, Korean language learners |
| Device | iOS primary (higher JP market share), some Android |
| Recruiting channel | Twitter/X (JP K-culture community), LINE groups, Peatix events |

### Segment C — Cross-pair Sessions (Moderated)
- 5–10 live pairs: 1 KR user + 1 JP user matched intentionally
- Moderated by beta coordinator via observation (no interference)
- Used for: translation test, conversation start test, pronunciation test

### Segment D — Trust Stress Testers
- 5 internal testers only
- Task: attempt to submit fake photos, copy bios, submit fake IDs
- Purpose: validate that trust & safety systems catch edge cases before real users do

---

## 2. Test Goals

| # | Goal | Primary Metric |
|---|---|---|
| G1 | Measure onboarding clarity without guidance | Completion rate ≥ 65% unaided |
| G2 | Validate profile setup finishes in reasonable time | Median < 8 min to first completed profile |
| G3 | Verify trust badges are understood correctly | ≥ 80% correctly identify what each badge means |
| G4 | Validate translation is useful and trustworthy | ≥ 75% say translation is accurate enough to use |
| G5 | Assess pronunciation guide utility | ≥ 60% say it helped them feel more confident |
| G6 | Measure comfort with the matching flow | ≥ 70% swipe on ≥ 5 profiles in first session |
| G7 | Measure ease of starting a conversation | ≥ 60% of matches result in a first message within 24h |
| G8 | Validate scam/fake-profile trust perception | ≥ 80% say they feel the app takes fake profiles seriously |
| G9 | Validate report flow clarity | ≥ 90% successfully complete a test report in < 60 seconds |
| G10 | Validate overall premium/trustworthy feel | NPS ≥ 30 (target ≥ 40) |

---

## 3. Test Scenarios

### Scenario 1 — Onboarding Clarity
**Who:** All testers (A + B)  
**Setup:** Fresh install, no verbal instructions given  
**Task:**
1. Open the app for the first time
2. Complete onboarding without any help

**Observe:**
- Which steps cause hesitation (> 10s pause)
- Where users tap incorrectly
- Whether language selection is intuitive
- Whether country selection chips are understood

**Success:** User reaches main discover tab without asking a question

---

### Scenario 2 — Profile Setup Completion
**Who:** All testers (A + B)  
**Setup:** After onboarding, profile setup screen  
**Task:**
1. Fill in as much of your profile as feels natural
2. Upload a profile photo
3. Set language level

**Observe:**
- Which fields are skipped
- Whether "언어 수준 / 語学レベル" options are clear
- Photo upload friction (permissions, cropping)
- Time from start to "looks done"

**Success:** Profile reaches ≥ 80% completeness organically

---

### Scenario 3 — Trust Badge Understanding
**Who:** All testers (A + B)  
**Setup:** Show a mock profile card with badges (human verified ✅, face matched 🤳, ID verified 🪪)  
**Task:**
1. Look at this profile. Tell me what you think each icon means.
2. Which of these makes you feel most safe? Least safe?
3. Would you swipe right on someone with no badges?

**Observe:**
- Correct identification rate per badge
- Emotional response to missing badges
- Whether "human verified" vs "ID verified" distinction is clear

**Success:** ≥ 80% correctly identify human verified + ID verified meaning

---

### Scenario 4 — Translation Usability
**Who:** Cross-pair sessions (C)  
**Setup:** Match KR user with JP user in a real conversation  
**Task (both sides):**
1. Send 3–5 messages in your native language
2. Use the translation button on messages you receive
3. After conversation, rate: accuracy, speed, ease of use

**Observe:**
- Whether users trust the translation
- Whether translation enables a conversation that wouldn't have happened
- Latency complaints (> 3s felt as slow)
- Cases where translation was clearly wrong

**Success:** ≥ 75% of cross-pair users say "I could have this conversation without speaking their language"

---

### Scenario 5 — Pronunciation Usefulness
**Who:** All testers (A + B)  
**Setup:** Open a conversation with a translated message  
**Task:**
1. Tap the pronunciation guide on a translated message
2. Try to say it aloud (or at least read it)
3. Rate: helpful / not helpful / confusing

**Observe:**
- First-time discoverability of the button
- Whether romanization (romaji / romanized Korean) is legible
- Whether it makes users feel more confident or overwhelmed

**Success:** ≥ 60% say "I'd use this again"

---

### Scenario 6 — Matching Flow Comfort
**Who:** All testers (A + B)  
**Setup:** Full discover feed loaded  
**Task:**
1. Use the app naturally for 15 minutes
2. Think aloud: what information do you look at when deciding to like someone?
3. What would make you more likely to swipe right?

**Observe:**
- Time spent per card
- Swipe ratio (likes/passes)
- Whether trust scores influence swipe decision
- Whether AI compatibility score is understood and valued

**Success:** ≥ 70% swipe on ≥ 5 profiles in the session, < 20% immediately close discover

---

### Scenario 7 — Conversation Start Ease
**Who:** Cross-pair sessions (C) + all testers after getting a match  
**Setup:** User has at least 1 match  
**Task:**
1. Open the chat with your match
2. Send an opening message — you can use the AI suggestion or write your own
3. After sending, rate: easy / hard / awkward

**Observe:**
- Whether AI opener suggestions are used (and which)
- Whether users feel comfortable messaging someone who doesn't speak their language
- Time from match to first message sent

**Success:** ≥ 60% send a first message within 10 minutes of getting a match

---

### Scenario 8 — Scam/Fake-Profile Trust Perception
**Who:** All testers (A + B)  
**Setup:** Show a profile with zero trust badges + one with full badges  
**Task:**
1. Tell me how you feel about this profile (no badges). Would you match?
2. Now look at this one (full badges). Does this change anything?
3. Do you believe Lito can detect fake profiles?

**Observe:**
- Emotional baseline (do users care about trust badges without prompting?)
- Confidence in the platform's ability to self-police
- Whether the "신원 확인 / 身元確認" terminology reads as meaningful

**Success:** ≥ 80% say they feel meaningfully safer seeing verified badges

---

### Scenario 9 — Report Flow Clarity
**Who:** All testers (A + B)  
**Setup:** Tester is viewing a discover card  
**Task:**
1. (Without guidance) — find the way to report this profile
2. Select: "가짜 프로필 / 偽プロフィール"
3. Submit the report

**Observe:**
- Time to locate report button
- Whether the report reasons list makes sense
- Confirmation clarity ("신고가 접수되었습니다")
- Whether users feel heard after submitting

**Success:** ≥ 90% complete a report in < 60 seconds without assistance

---

### Scenario 10 — Premium / Trustworthy Feel
**Who:** All testers (A + B)  
**Setup:** Full session (15–30 min), then survey  
**Task:** Use the app naturally for one full session  
**Survey prompt:** "Based on today's experience, how likely are you to recommend Lito to a friend? (0–10)"

**Observe:**
- NPS score by segment (KR vs JP)
- Qualitative comments on what felt premium vs cheap
- What would make them pay for Plus/Premium
- Whether the cultural branding feels authentic

**Success:** NPS ≥ 30 overall (≥ 35 for JP segment, ≥ 30 for KR segment)

---

## 4. Feedback Questions

### Post-Session Survey (All Testers)

**Section A — Onboarding**
1. How clear was it to get started? (1–5)
2. Was there any step where you weren't sure what to do? (open)
3. Did the language / country selection feel intuitive? (Yes / No / Somewhat)

**Section B — Profile & Trust**
4. How long did it take to feel "done" with your profile? (open)
5. Which trust badge did you find most trustworthy? (multi-select)
6. Did you understand what each badge means? (Yes / No / Partially)

**Section C — Matching & Discovery**
7. When looking at a profile card, what information mattered most to you? (open)
8. Did the AI compatibility score (% match) influence your swipe? (Yes / No / Sometimes)
9. How comfortable were you swiping on profiles from the other country? (1–5)

**Section D — Language & AI Features**
10. Did you use the translation feature? (Yes / No) → If yes: was it accurate? (1–5)
11. Did you use the pronunciation guide? (Yes / No) → If yes: was it helpful? (1–5)
12. Did you use the AI opener suggestions? (Yes / No) → If yes: did you feel it was natural? (1–5)
13. What language feature would you most want improved? (open)

**Section E — Safety**
14. Did the app feel safe to use? (1–5)
15. Did you know how to report a suspicious profile? (Yes / No / After exploring)
16. Do you trust that Lito takes fake profiles seriously? (1–5)

**Section F — Overall**
17. NPS: How likely would you recommend Lito to a friend? (0–10)
18. What did you love most? (open)
19. What frustrated you most? (open)
20. Would you pay for Plus (₩12,900/월 or ¥1,200/月)? (Definitely / Probably / Probably not / No)

### Moderated Session Debrief (Cross-pair, Segment C)
1. Was it strange or exciting to talk to someone from the other country?
2. Did the translation feel like a barrier or a bridge?
3. At what point (if ever) did you feel you were having a real conversation?
4. Would you meet this person if the app facilitated it?

---

## 5. Success Criteria

### Launch Gate: Go / No-Go Criteria

| Criteria | Go Threshold | No-Go |
|---|---|---|
| Onboarding completion rate (unaided) | ≥ 65% | < 50% |
| Profile completion rate | ≥ 50% | < 35% |
| Trust badge comprehension | ≥ 80% correct | < 65% |
| Translation accuracy satisfaction | ≥ 75% positive | < 55% |
| Match-to-first-message rate | ≥ 60% | < 40% |
| Report flow success rate | ≥ 90% unaided | < 75% |
| Scam trust perception | ≥ 80% confident | < 65% |
| NPS | ≥ 30 | < 15 |
| Critical bugs found | 0 P0 open | Any P0 open |
| Security / privacy issues | 0 open | Any open |

If any single No-Go condition is met → **do not launch**, fix and re-test that scenario only.

---

## 6. What to Fix Before Public Release

The following items are pre-launch blockers based on common beta feedback patterns and current app state:

### Must-Fix (P0 — Launch Blockers)

| # | Area | Issue | Fix Required |
|---|---|---|---|
| 1 | Onboarding | Country selection back-navigation broken (known issue) | Fix slide back navigation |
| 2 | Trust | Users don't know the difference between human-verified and ID-verified | Add 1-tap tooltip explanation per badge |
| 3 | Translation | Users may not discover translation button exists | Add first-use highlight animation or onboarding tooltip |
| 4 | Report | Report button on discover card is small (top-right, 14pt tap target) | Increase tap area or add long-press CTA |
| 5 | Safety | No user-facing explanation of what happens after a report | Add "신고 후 처리 안내" confirmation screen |
| 6 | Security | Ensure real ID documents in test submissions are not stored in plaintext | Confirm encrypted at rest + purged after review |

### Should-Fix (P1 — Ship if Possible)

| # | Area | Issue | Fix Required |
|---|---|---|---|
| 7 | Onboarding | Profile completeness % not visible to user — no motivation to complete | Add progress ring on profile tab |
| 8 | Matching | AI compatibility % meaning is not explained | Add "이 점수가 뭔가요?" info tooltip |
| 9 | Messaging | Pronunciation guide discoverability low | Move icon to more visible position |
| 10 | Premium | Paywall doesn't show side-by-side feature comparison clearly | Add feature diff table to paywall |
| 11 | Language | Some JP users may use app in English by default — no language prompt on setup | Force language selection as step 1 |

### Monitor in Beta (P2 — No Block, Track Closely)

| # | Area | Watch for |
|---|---|---|
| 12 | Translation | Specific Korean ↔ Japanese phrase types that translate poorly |
| 13 | Cultural | KR users feeling uncomfortable messaging first / JP users not replying quickly |
| 14 | AI features | Whether chemistry card / opener suggestions are perceived as fun or gimmicky |
| 15 | Trust | Whether lack of badges causes ghosting (no match → no message) |
| 16 | Retention | D1 drop-off rate — if < 35%, push notifications need tuning |

---

## 7. Beta Timeline

| Week | Activity |
|---|---|
| **Week 1** | Recruit testers, onboard Segment D (internal trust stress test) |
| **Week 2** | Segment A (KR) solo sessions + moderated feedback |
| **Week 3** | Segment B (JP) solo sessions + moderated feedback |
| **Week 4** | Segment C (KR↔JP cross-pair live sessions) |
| **Week 4** | Compile all results, apply P0 fixes |
| **Week 5** | Re-test P0 fixes with 10 testers from original pool |
| **Week 6** | Go / No-Go decision → public launch if criteria met |

---

## 8. Beta Infrastructure Requirements

| Requirement | Tool / Method |
|---|---|
| Feedback survey | Tally.so or Google Forms (bilingual KR/JP) |
| Session recording | Lookback.io or Maze (mobile session replay) |
| Bug reporting | GitHub Issues or Linear (internal) |
| Tester communication | KakaoTalk (KR) / LINE (JP) group channels |
| TestFlight / APK | Apple TestFlight (iOS), direct APK (Android) |
| Analytics validation | Verify all 64 events fire correctly during beta |
| NPS tracking | In-app survey triggered after 3rd session |

---

*Last updated: 2026-04-08 | Owner: Product Team | Classification: Internal — Beta Only*
