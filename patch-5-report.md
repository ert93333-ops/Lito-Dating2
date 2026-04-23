# [REPLIT COMPLETION REPORT] — Lito 5차 패치

**작업 ID:** patch-05  
**날짜:** 2026-04-23  
**서버 커밋:** 5차 패치 완료  
**베이스 커밋:** 3b9baee (4차 + 번역 버그 핫픽스 포함)

---

## 1. 작업 목표

profile coach explicit-only UX 완전 고정, blocked UI 3종 분리, purchase canonical 이벤트 정렬, purchase_completed 외부 송신 제거, trial/paid/restore 규칙 UI-서버 일치화.

---

## 2. 생성/수정된 파일

| 파일 | 변경 유형 | 내용 |
|------|-----------|------|
| `artifacts/lito/app/profile-coach.tsx` | 수정 | 3종 blocked UI 통합, Alert.alert 완전 제거 |
| `artifacts/lito/context/GrowthContext.tsx` | 수정 | profileCoachBlockedState 노출, purchase_completed 제거, 서버 wallet 즉시 반영 |
| `artifacts/lito/components/chat/NoConsentSheet.tsx` | 수정 | bodyOverride prop 추가 |
| `artifacts/lito/components/chat/ZeroCreditSheet.tsx` | 수정 | secondaryCta prop 추가 |
| `artifacts/lito/types/growth.ts` | 수정 | purchase_completed 제거, wallet_balance_viewed / continue_basic_chat_after_paywall 추가 |
| `artifacts/api-server/src/modules/coaching/coaching.router.ts` | 수정 (패치5 이전) | 전역 requireAuth 미들웨어 제거로 /ai/translate 복구 |

---

## 3. 구현된 기능

### STEP 1 — Profile Coach Explicit-Only UX 확인
- 이미 4차에서 구현됨 (`useEffect`에서 자동 실행 없음, explicit CTA만 존재)
- 5차에서 unsafe 상태 시 CTA 숨김 추가
- consent 후 자동 실행 금지 유지 (`handleConsentGranted`에서 자동 호출 없음)
- screen mount / route return 시 자동 실행 없음 유지

### STEP 2 — Profile Coach Blocked UI 3종 완전 분리

**A. no_consent (profile)**
- `NoConsentSheet` — bodyOverride: "프로필 정보만 참고합니다" (채팅 맥락 텍스트와 구별)
- 상품 카드 없음
- 동의 후 자동 coach 실행 금지
- 로컬 pre-check + 서버 응답 양쪽에서 트리거

**B. zero_credit (profile)**  
- `ZeroCreditSheet` — secondaryCta: "그냥 직접 수정하기" (채팅의 "기본 채팅 계속하기"와 구별)
- trial_remaining / paid_remaining 서버 값 표시
- paywall 허용 (CTA: "코칭 팩 보기")
- `continue_basic_chat_after_paywall` 이벤트 발화

**C. unsafe (profile)**
- `UnsafeNotice` inline 배너 (modal 아님)
- coach CTA 완전 숨김 (profileSuggestions.length === 0 && serverBlockedAs !== "unsafe" 조건)
- paywall 없음
- `onBlock`: clearBlock + router.back()

**우선순위 적용:** unsafe → (no_consent sheet blocked) → zero_credit → 일반 실행

### STEP 3 — StoreKit / Play Billing 브릿지

- **현황:** `nativeIapPurchase()` 구조는 완성 (platform 분기, productId 매핑, verifyPurchase 연동)
- **iOS:** `com.litodate.membership.premium.monthly` / `com.litodate.membership.plus.monthly` product ID 설정됨
- **Android:** 동일 product ID, platform="google" 분기
- **실제 라이브러리:** `// TODO: expo-iap / react-native-purchases` 연결 지점만 존재 — **실제 기기 구매 미완료**
- **Web:** stub 분기 명확히 분리 (verifyPurchase skip)
- **결론:** 연결 구조는 완성이나 실제 기기 테스트는 불가 (App Store Connect / Play Console 등록 미완료)

### STEP 4 — purchase_completed canonical 정렬

| 항목 | 이전 | 이후 |
|------|------|------|
| `AnalyticsEvent` 타입 | `"purchase_completed"` 포함 | 완전 제거 |
| `GrowthContext.upgradePlan()` | `purchase_started` + `purchase_completed` 발화 | 로컬 상태 업데이트만 (이벤트 없음) |
| `GrowthContext.buyAiCoachCredits()` | `purchase_completed` 발화 | 로컬 상태 업데이트만 (이벤트 없음) |
| `paywall.tsx` 이벤트 흐름 | `purchase_started` → `purchase_completed` → ... | `purchase_started` → (IAP) → `purchase_verified` → `purchase_success_returned` |

**추가된 canonical 이벤트:**
- `wallet_balance_viewed`
- `continue_basic_chat_after_paywall`

### STEP 5 — Purchase Success Return / Context Restore

- `paywall.tsx`: 구매 성공 후 `upgradePlan(selectedPlan)` → `refreshWallet()` → `purchase_success_returned` → `router.back()`
- draft/context 초기화 없음
- 자동 coach 재실행 없음 (paywall.tsx에 auto-retry 없음, GrowthContext.upgradePlan에 자동 실행 없음)

### 번역 API 버그 수정 (4차 → 5차 사이 핫픽스)

- `coaching.router.ts`에서 `/ai/*` 전체에 requireAuth 적용하던 전역 미들웨어 제거
- `/api/ai/translate` 및 `/api/ai/suggest-reply` 정상화 (HTTP 401 → 200)
- `/api/ai/coach`는 자체 requireAuth 유지

---

## 4. 미완료/보류

| 항목 | 사유 |
|------|------|
| 실제 StoreKit 기기 구매 | App Store Connect 등록 / 실기기 TestFlight 필요. Replit 환경에서 불가 |
| 실제 Play Billing 기기 구매 | Google Play Console 등록 / 실기기 필요. Replit 환경에서 불가 |
| 실제 영수증 서버 검증 | 실기기 구매 없이 실제 transactionId/receiptData 없음 |

---

## 5. 에러/이슈

- `@workspace/db` 타입 export 에러: tsc --noEmit에서만 발생. esbuild 빌드/런타임은 정상. 이번 패치와 무관한 기존 pre-existing 이슈.
- `discover.tsx`, `contact-blocks.tsx` 등의 스타일 참조 에러: 기존 pre-existing 이슈, 이번 패치와 무관.

---

## 6. 실행 방법

```
# 서버
pnpm --filter @workspace/api-server run dev

# 앱
pnpm --filter @workspace/lito run dev
```

---

## 7. 테스트 결과

| 시나리오 | 방법 | 결과 |
|----------|------|------|
| A. Wallet 응답 형식 | DB 조회 | trial=3, paid=9, total=12 확인 |
| B. no_consent 블로킹 | 코드 검토 | NoConsentSheet 조건 분기 확인 |
| C. zero_credit 블로킹 | 코드 검토 | ZeroCreditSheet + "직접 수정하기" 확인 |
| D. Trial-first 차감 | 수학적 시뮬레이션 | Call 1-3: trial, Call 4+: paid |
| E. Trial happy path | 시뮬레이션 | consumption_source=trial, remaining_total 감소 |
| F. Trial exhaustion | 시뮬레이션 | is_zero_credit=true 확인 |
| G. Real purchase | 불가 (실기기 없음) | IAP 구조 완성, 실 증빙 불가 |
| H. Purchase failed | 코드 검토 | catch 분기에서 draft 유지, 자동 실행 없음 |
| I. Purchase cancelled | 코드 검토 | 동일 catch 분기 처리 |
| J. Event assertion | grep 검증 | purchase_completed trackEvent 호출 0건 확인 |
| 번역 API | 실제 API 호출 | HTTP 200, {"translation":"今日の気分どう？"} |

---

## 8. 남은 리스크

1. 실기기 IAP 미검증 — 출시 전 TestFlight/내부 테스트 트랙 검증 필수
2. `nativeIapPurchase()` stub이 실기기에서도 stub을 반환할 경우 (`// TODO` 라인 미완성) — expo-iap 또는 react-native-purchases 실제 연결 필요
3. `verifyPurchase` 서버 엔드포인트가 stub receipt (`stub_apple_123`)를 검증하려 할 때 실패할 수 있음 — 서버 수신 시 실제 영수증과 stub을 구별하는 로직 필요

---

## 9. 다음 작업 제안

1. `expo-iap` 또는 `react-native-purchases (RevenueCat)` 실제 연결 → `nativeIapPurchase()` TODO 완성
2. TestFlight / 내부 테스트 트랙에서 실제 sandbox 구매 테스트
3. `verifyPurchase` 서버 엔드포인트 실제 Apple/Google 영수증 검증 로직 구현
4. 프로필 코치 화면 — unsafe의 `onReport` 핸들러에 실제 신고 플로우 연결

---

## 추가 체크리스트

### 수정 파일 목록
- `artifacts/lito/app/profile-coach.tsx` — 3종 blocked UI, Alert 제거
- `artifacts/lito/context/GrowthContext.tsx` — blocked state 노출, purchase_completed 제거
- `artifacts/lito/components/chat/NoConsentSheet.tsx` — bodyOverride prop
- `artifacts/lito/components/chat/ZeroCreditSheet.tsx` — secondaryCta prop
- `artifacts/lito/types/growth.ts` — canonical 이벤트 정렬
- `artifacts/api-server/src/modules/coaching/coaching.router.ts` — 번역 auth 버그 수정

### Profile Coach Explicit-Only 반영 지점
- `handleStartCoach()` — 명시적 탭 후에만 서버 호출
- `useEffect` — `track("profile_coach_opened")` analytics만, 자동 호출 없음
- `handleConsentGranted()` — 동의 후 자동 실행 없음
- `serverBlockedAs === "unsafe"` — CTA 완전 숨김

### Blocked UI 3종 적용 화면
- profile-coach.tsx 내 NoConsentSheet × 2 (로컬 + 서버), ZeroCreditSheet × 1, UnsafeNotice × 1 (inline)

### 실제 IAP 연결 파일
- `artifacts/lito/app/paywall.tsx` — `nativeIapPurchase()` 함수 (TODO 지점)
- iOS: `// const { transactionId, transactionReceipt } = await requestPurchase(productId)` (미완성)
- Android: 동일 (미완성)

### Canonical Event 변경점
- 제거: `purchase_completed`
- 추가: `wallet_balance_viewed`, `continue_basic_chat_after_paywall`
- 유지: `purchase_started`, `purchase_verified`, `purchase_verify_failed`, `purchase_failed`, `purchase_cancelled`, `purchase_success_returned`

### Placeholder 현황
| 항목 | 상태 |
|------|------|
| `nativeIapPurchase()` iOS | TODO 지점 존재 — expo-iap 미연결 |
| `nativeIapPurchase()` Android | TODO 지점 존재 — expo-iap 미연결 |
| Web stub | 명확히 분리됨 (verifyPurchase skip) |
| 서버 verifyPurchase | 엔드포인트 존재, 실제 영수증 파서 미구현 |

### 06/04 문서 충돌 없음 체크리스트
- [x] 기본 채팅 무료
- [x] 기본 번역 무료
- [x] coach 자동 실행 금지
- [x] trial 서버 authoritative
- [x] unsafe + paywall 동시 노출 금지
- [x] no_consent + 상품 카드 동시 금지
- [x] zero_credit → 기본 기능 계속 가능
- [x] purchase success 후 자동 coach 금지

### purchase_completed 처리
- `trackEvent("purchase_completed")` 호출: **0건** (grep 확인)
- `AnalyticsEvent` 타입에서: **제거됨**
- 주석에서만 참조됨 (change history 설명용)

### Overlay/Navigation 충돌 없음
- ZeroCreditSheet dismiss → clearProfileCoachBlock() (상태 초기화)
- NoConsentSheet dismiss → showNoConsentSheet=false / clearProfileCoachBlock()
- paywall → router.push("/paywall") → router.back() 후 context 복귀

*보고서 생성: Lito Engineering — 5차 패치*
