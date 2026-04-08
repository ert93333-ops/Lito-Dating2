# Lito — Trust & Safety Policy Framework
**Version:** MVP 1.0  
**Scope:** Korean-Japanese dating app  
**Applies to:** All users, moderators, and automated systems

---

## 1. Moderation Priority Levels

| Level | Name | SLA | Trigger Examples |
|---|---|---|---|
| **P0** | Critical | Immediate / Auto | Off-platform money request detected, CSAM signal, mass report spike (≥5 reports in 1h) |
| **P1** | High | < 4 hours | Romance scam suspicion, ID fraud, 3+ reports on same account |
| **P2** | Medium | < 24 hours | AI image suspicion, single harassment report, impersonation claim |
| **P3** | Low | < 72 hours | Minor bio policy violation, spam, unverified photo mismatch |

**Auto-actions** run instantly for P0 triggers.  
**Manual review** is required for all account bans. Restrictions can be automated.

---

## 2. Fake Profile Handling

### Detection Signals (scored 0–100)
| Signal | Weight |
|---|---|
| No human verification | +20 |
| Stock-photo-like face match (perceptual hash) | +35 |
| Bio copied from another account | +25 |
| Multiple reports of "fake account" | +15 per report (cap: +30) |
| Profile created < 48h ago with instant high activity | +10 |

**Score ≥ 60** → Flag for P2 review  
**Score ≥ 80** → Auto-restrict (hide from discovery) + P1 review  
**Score = 100** + confirmed by moderator → Permanent ban

### Moderator Actions
- View full signal breakdown in admin dashboard
- Mark as "confirmed fake" → triggers instant ban + purge from all match lists
- Mark as "false positive" → clears flag, restores account

### What User Sees
- During restriction: "프로필이 검토 중이에요. 잠시 후 다시 시도해주세요."
- After ban: "이 계정은 Lito 가이드라인을 위반하여 비활성화되었습니다."

---

## 3. AI-Generated Image Suspicion

### Detection Signals
- AI image classifier confidence score > 0.80
- Inconsistent lighting/shadow artifacts detected
- Face does not match across multiple photos (face consistency score < 0.60)
- User has no human verification badge

### Automatic Actions
- **Confidence 0.80–0.89:** Add internal flag `ai_image_suspected`, queue for P2 review. No user action yet.
- **Confidence ≥ 0.90 + no human verification:** Auto-hide photos from other users. Request re-verification.

### Moderator Review Checklist
1. View original uploaded photo + AI confidence score
2. Compare all photos for consistency
3. Cross-check against reverse image search result (manual)
4. Decision: Approve / Reject photos / Ban

### Photo Rejection (AI Image)
- All photos removed silently from public view
- User notified: "사진이 Lito의 진정성 가이드라인에 맞지 않아 검토되었어요. 실제 사진으로 교체해주세요."
- User has 72 hours to upload new photos before account is restricted

### What Moderator Sees
- Uploaded photos with AI confidence percentages
- Side-by-side comparison of all profile photos
- Face consistency score
- Verification status

---

## 4. Romance Scam Suspicion

### Behavioral Signals (scored 0–100)
| Signal | Weight |
|---|---|
| User reported for "romance scam" | +30 |
| Message contains financial language (loan, wire, crypto, gift card) | +25 per occurrence (cap: +50) |
| Sends identical messages to 3+ matches | +20 |
| Moves conversation to external platform rapidly (< 3 days) | +20 |
| Profile created < 7 days ago | +10 |
| No face verification | +10 |

**Score ≥ 50** → P1 review + shadow restrict (messages not delivered to new matches)  
**Score ≥ 75** → Auto-suspend + immediate P0 human review  
**Confirmed by moderator** → Permanent ban + report to relevant authorities if financial harm reported

### Automatic In-App Intervention
When financial language keywords detected in any message:
- Message is delivered but flagged in admin dashboard
- Warning banner appears for the **recipient**: "이 메시지에 금전 요청처럼 보이는 내용이 포함되어 있어요. Lito는 어떤 금전 요청도 권장하지 않아요."
- No notification sent to sender that the warning was shown

### Moderator Actions
- Read flagged message thread (full context)
- Apply: Warning / Restrict / Suspend / Ban
- Mark as false positive (e.g., discussing splitting travel costs)

---

## 5. Off-Platform Money Request Behavior

### Definition
Any message or profile content requesting:
- Direct money transfer (계좌이체, 송금, wire transfer)
- Cryptocurrency payment
- Gift card purchase
- Loan request
- Investment opportunity

### Automatic Actions (P0 — No human required)
1. Message **delivered** to recipient (not silently dropped)
2. Recipient sees: "⚠️ 이 메시지에는 금전 요청이 감지되었어요. 앱 외부에서 돈을 요청하는 행위는 Lito 정책에 위반됩니다."
3. Sender's account flagged `money_request_detected`
4. **2nd occurrence within 30 days:** Auto-suspend + P0 review
5. **3rd occurrence or confirmed scam:** Permanent ban

### What Users See
| Party | Message |
|---|---|
| Sender | No notification (silent enforcement) |
| Recipient | Warning banner with option to "이 대화 신고하기" |

### User Reporting Flow
Recipient taps "신고하기" → chooses "금전 요청 / 로맨스 스캠" → submits → P0 queue immediately

---

## 6. Repeated Report Handling

### Thresholds
| Reports | Timeframe | Automatic Action |
|---|---|---|
| 1 report | Any | Log, P3 queue |
| 2 reports | 7 days | P2 queue |
| 3 reports | 7 days | P1 queue + soft restrict (reduce discovery ranking) |
| 5 reports | 30 days | P0 queue + auto-suspend pending review |
| 3+ reports of same type | Any | Escalate priority by 1 level |

### Anti-Abuse (Preventing False Mass Reports)
- Reports from accounts < 24h old are weighted 0.2x
- Reports from the same device are deduplicated
- Revenge-report detection: if User A reports User B within 5 minutes of User B reporting User A, both are flagged for review with low weight

---

## 7. ID Verification Review Outcomes

### Submission States
| State | User Sees | Moderator Action |
|---|---|---|
| `pending` | "인증 검토 중이에요 (보통 24시간 이내)" | Review queue |
| `approved` | Badge granted: ✅ 신원 확인 | Mark approved |
| `rejected_mismatch` | "제출하신 신분증의 이름 또는 사진이 프로필과 일치하지 않아요." | Document reason |
| `rejected_invalid_doc` | "유효하지 않은 서류예요. 여권, 운전면허증, 또는 주민등록증을 사용해주세요." | Document reason |
| `rejected_ai_suspected` | "제출된 사진이 실제 신분증이 아닌 것으로 판단되었어요." | Flag account |
| `expired` | "인증이 만료되었어요. 다시 인증해주세요." | Auto-triggered |

### Moderator Review Checklist
1. Photo vs. ID face match (manual comparison)
2. Document type validity (passport, driver's license, national ID)
3. Visible expiry date (must not be expired)
4. Name consistency with profile
5. Signs of document tampering

### Post-Rejection
- User may resubmit once per 7 days
- 3 consecutive rejections → account flagged for P1 review (possible identity fraud)

---

## 8. Re-Verification Triggers

The following events invalidate an existing verification badge and require re-verification:

| Trigger | Badge Removed | Grace Period |
|---|---|---|
| Profile main photo changed | ⚠️ Under review | 48h to re-verify or badge removed |
| Name/nickname changed significantly | ✅ Removed immediately | Must re-verify |
| Account inactive > 12 months | ✅ Removed | Must re-verify on login |
| Moderator flags account as suspicious | ✅ Removed immediately | Pending review |
| ID document expiry date passed | ✅ Auto-removed | 7-day grace period |
| AI image score spikes after photo update | ⚠️ Under review | 48h |

---

## 9. Appeal Flow

### User Appeal Entry Points
1. In-app: Settings → 지원 → 계정 상태 → 이의 신청
2. Email: safety@lito.app (auto-routes to appeal queue)

### Appeal SLA
| Action | Appeal Window | Review SLA |
|---|---|---|
| Photo rejection | 14 days | 48h |
| Account restriction | 30 days | 72h |
| Account suspension | 30 days | 48h |
| Permanent ban | 30 days | 72h |
| Verification rejection | 7 days | 24h |

### Appeal Process
1. User submits appeal with optional additional context
2. Different moderator reviews (not original reviewer)
3. Decision: **Uphold** / **Overturn** / **Modify** (e.g., reduce ban to suspension)
4. User notified of outcome via push notification + in-app message
5. Appeal decision is final for MVP (no second appeal)

### What Users See During Appeal
"이의 신청이 접수되었어요. 검토까지 최대 ○시간이 소요됩니다. 결과는 앱 내 알림으로 알려드릴게요."

---

## 10. Account Restriction / Suspension / Ban Rules

### Enforcement Ladder

| Level | What It Means | Duration | Reversible? |
|---|---|---|---|
| **Warning** | In-app notice, no functional impact | N/A | Yes |
| **Soft Restrict** | Hidden from discovery, can still chat with existing matches | Until review | Yes |
| **Hard Restrict** | Cannot send messages or like new profiles | 24h – 7 days | Yes, via appeal |
| **Suspension** | Account fully locked, visible to no one | 7–30 days | Yes, via appeal |
| **Permanent Ban** | Account deleted from platform | Permanent | Appeal only within 30 days |

### Auto-Escalation Rules
- Warning → Hard Restrict if same violation within 30 days
- Restriction → Suspension if 2 restrictions within 60 days
- Suspension → Permanent ban if 2 suspensions within 6 months
- Any confirmed money scam or CSAM → Immediate permanent ban (no escalation ladder)

### Permanent Ban Triggers (No Ladder, Immediate)
- Confirmed romance scam with financial harm
- Submission of fraudulent ID
- AI-generated face used as profile photo (confirmed)
- Harassment or threats of violence
- CSAM (child sexual abuse material) — also reported to NCMEC/IWF

---

## 11. Profile Photo Rejection Rules

### Auto-Rejected (System)
| Reason | Detection |
|---|---|
| No face detected | Face detection API |
| Multiple distinct people in first photo | Face count > 1 |
| Explicit/nudity content | Content moderation API |
| AI-generated face (confidence ≥ 0.90) | AI classifier |
| Photo hash matches known scam/stock database | Hash match |
| Image dimensions < 200×200px | Pixel check |

### Manually Rejected (Moderator)
| Reason |
|---|
| Face not clearly visible (dark, blurry, obscured) |
| Photo contains contact info (phone, IG handle in image) |
| Photo contains watermark or brand logo |
| Copyrighted celebrity photo |
| Mismatch with verified ID face |

### User Notification on Rejection
"이 사진은 Lito 가이드라인에 맞지 않아 게시되지 않았어요. 이유: [specific reason]"

### Rejection Does Not Prevent Account Use
- Account remains active with other approved photos
- If **all** photos are rejected, account is soft-restricted until at least 1 approved photo is uploaded
- User has 48h to upload replacement

---

## 12. Moderation Response Priority Summary Table

| Policy Area | P0 (Auto/Immediate) | P1 (< 4h) | P2 (< 24h) | P3 (< 72h) |
|---|---|---|---|---|
| Fake profile | Score ≥ 80: auto-restrict | Score 60–79 | Single report | — |
| AI image | Confidence ≥ 0.90: hide photos | — | Confidence 0.80–0.89 | Confidence < 0.80 |
| Romance scam | Score ≥ 75: auto-suspend | Score 50–74 | Single scam report | — |
| Money request | Instant warning to recipient | 2nd occurrence | 1st occurrence | — |
| Repeated reports | 5 reports / 30d: auto-suspend | 3 reports / 7d | 2 reports / 7d | 1 report |
| ID verification | — | Suspected fraud / 3 rejections | Standard review | — |
| Photo rejection | Auto (explicit/AI) | Fraud-linked photo | Mismatch with ID | Guideline violation |
| Account appeal | CSAM / financial harm | Suspension appeal | Ban appeal | Restriction appeal |

---

## 13. What Each Stakeholder Sees

### User View

| Situation | User Sees |
|---|---|
| Account flagged (under review) | "프로필이 검토 중입니다. 일부 기능이 제한될 수 있어요." |
| Account restricted | "일부 기능이 일시적으로 제한되었어요. 자세한 내용은 지원 센터를 확인하세요." |
| Account suspended | "계정이 일시 정지되었습니다. 이의가 있으시면 이의 신청을 해주세요." |
| Permanent ban | "이 계정은 Lito 커뮤니티 가이드라인을 반복적으로 위반하여 영구 비활성화되었습니다." |
| Photo rejected | Specific rejection reason (see §11) |
| Money request warning | Warning banner in chat thread |
| Receiving scam message | In-chat safety warning |

**Users are never told who reported them.**  
**Users are never told the specific report content.**

### Moderator View (Admin Dashboard)

| Panel | What's Visible |
|---|---|
| Risk Queue | All P0–P3 items sorted by priority and age |
| User Profile | All photos, bio, verification status, account age, country |
| Report History | All reports filed, reporter ID (masked), report reason, timestamp |
| Signal Scores | Fake score, scam score, AI image score with breakdown |
| Message Flags | Flagged messages (keyword matched), full thread context |
| Action Log | Full audit trail of all moderator actions on this account |
| Appeal Queue | Pending appeals with original decision and user context |

**Moderators cannot see:** payment info, private messages not flagged by the system, device identifiers beyond risk signals.

### Automatic vs. Manual Action Summary

| Action | Automatic | Manual Required |
|---|---|---|
| Money request warning to recipient | ✅ | — |
| AI photo hide (confidence ≥ 0.90) | ✅ | — |
| Soft restrict (fake score ≥ 80) | ✅ | — |
| Auto-suspend (5 reports / 30d) | ✅ | — |
| Auto-suspend (scam score ≥ 75) | ✅ | — |
| Re-verification request on photo change | ✅ | — |
| Badge expiry removal | ✅ | — |
| Account restriction confirmation | — | ✅ |
| Permanent ban | — | ✅ (always) |
| ID verification approval/rejection | — | ✅ |
| Appeal decision | — | ✅ |
| Confirmed romance scam action | — | ✅ |
| False positive clearance | — | ✅ |

---

## 14. MVP Scope Limitations & Future Work

| Feature | MVP Status | Future |
|---|---|---|
| AI image detection | Rule-based classifier | Real ML model (e.g., Hive, AWS Rekognition) |
| Scam score | Keyword + behavior heuristic | NLP-based intent model |
| ID verification | Manual moderator review | Automated ID OCR + face match (e.g., Persona, Jumio) |
| Mass report detection | Count threshold | ML-based coordinated abuse detection |
| Appeal workflow | Email + in-app | Full ticketing system (Zendesk) |
| Legal reporting | Internal log only | NCMEC integration for CSAM |
| Data retention (reports) | Indefinite | 24-month rolling policy with legal hold |

---

*Last updated: 2026-04-08 | Owner: Trust & Safety Team | Classification: Internal*
