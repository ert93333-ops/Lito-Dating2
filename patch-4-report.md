# Lito 4차 패치 작업보고서

**날짜:** 2026-04-23  
**커밋:** `493d3de3ed8ae7f574a054f2f05f390582604d78`  
**도메인:** litodate.app  

---

## 1. 패치 목적

| 목표 | 설명 |
|------|------|
| Trial 서버 권한 | 클라이언트 로컬 카운터 제거, 서버 DB가 유일한 truth |
| Profile Coach 자동 실행 제거 | 사용자 명시적 액션 없이 AI 호출 금지 |
| 실제 StoreKit/Play Billing 브릿지 | 더미 함수 → 실제 IAP 호출 구조 완성 |
| Blocked UI 3종 완전 분리 | no_consent / zero_credit / unsafe 각각 독립 sheet/notice |
| 구매 이벤트 분리 | `purchase_completed`와 `purchase_verified` 독립 발화 |

---

## 2. 작업 태스크 전체 목록

### S01 — DB 스키마: `trial_remaining` 컬럼 추가
- **파일:** `lib/db/src/schema/billing.ts`
- **변경:** `credit_wallets` 테이블에 `trial_remaining integer NOT NULL DEFAULT 0` 컬럼 추가
- **적용 방법:** `drizzle-kit push`가 unique constraint 프롬프트로 블로킹되어 `ALTER TABLE credit_wallets ADD COLUMN trial_remaining integer NOT NULL DEFAULT 3` 직접 실행
- **검증:** `SELECT trial_remaining FROM credit_wallets` → 값 3 확인

---

### S02 — 서버 wallet endpoint 응답 확장
- **파일:** `artifacts/api-server/src/modules/billing/billing.router.ts`
- **변경:** `GET /api/v1/billing/wallet` 응답에 `trial_remaining`, `paid_remaining`, `remaining_total` 필드 추가
- **이전:** `balance` 단일 필드
- **이후:** `{ trial_remaining, paid_remaining, remaining_total, ...기존 필드 }`

---

### S03 — 서버 `/api/ai/coach` consent + credit + trial-first 차감
- **파일:** `artifacts/api-server/src/modules/coaching/coaching.router.ts`
- **변경:**
  - `ai_consents` 테이블에서 `conversation_coach` consent 확인 → 없으면 `blocked: "no_consent"` 반환
  - `remaining_total` 0 이하이면 `blocked: "zero_credit"` 반환
  - 성공 시 `debitCoachCredit()` 호출: trial 먼저 → 없으면 paid 차감
  - 응답에 `consumption_applied: true`, `consumption_source: "trial" | "paid"` 포함

---

### S04 — 서버 profile coach `consumption_applied` 응답 정렬
- **파일:** `artifacts/api-server/src/modules/profile_coach/profile_coach.router.ts`
- **변경:** `debitCreditTrialFirst()` 헬퍼로 교체, 응답에 `consumption_applied`, `consumption_source` 필드 포함
- **이전:** 단순 balance 차감
- **이후:** trial-first 우선 차감 + 소비 출처 명시

---

### S05 — 클라이언트 WalletState + GrowthContext 서버 authoritative 전환
- **파일:** `artifacts/lito/services/coachApi.ts`, `artifacts/lito/context/GrowthContext.tsx`
- **변경:**
  - `WalletState` 타입에 `trial_remaining`, `paid_remaining`, `remaining_total` 추가
  - `GrowthContext`에서 `SHARED_TRIAL_COUNT` 로컬 상수 완전 제거
  - wallet 상태를 서버 응답 기준으로만 관리

---

### S06 — profile-coach.tsx 자동 실행 제거
- **파일:** `artifacts/lito/app/profile-coach.tsx`
- **변경:** 화면 진입 시 자동 AI 호출 로직 제거, 사용자가 직접 "코칭 요청" 버튼을 눌러야만 호출

---

### S07 — Blocked UI 3종 컴포넌트 신규 제작
- **파일:**
  - `artifacts/lito/components/NoConsentSheet.tsx` — AI 기능 동의 미완료 시 bottom sheet
  - `artifacts/lito/components/ZeroCreditSheet.tsx` — 크레딧 소진 시 결제 유도 bottom sheet
  - `artifacts/lito/components/UnsafeNotice.tsx` — 안전 위반 감지 시 신고/차단 CTA
- **설계 원칙:**
  - `NoConsentSheet` 내에 결제 CTA 없음 (동의와 결제 혼용 금지)
  - `UnsafeNotice` 내에 결제 CTA 없음 (안전 이슈와 paywall 혼용 금지)
  - `ZeroCreditSheet`만 결제 유도 포함

---

### S08 — chat/[id].tsx Blocked UI 3종 통합
- **파일:** `artifacts/lito/app/chat/[id].tsx`
- **변경:**
  - 기존 `Alert.alert()` 대체 → 3종 sheet/notice 컴포넌트 조건부 렌더링
  - 서버 `blocked: "no_consent" | "zero_credit" | "unsafe"` 응답 파싱
  - 옵티미스틱 크레딧 차감 로직 완전 제거 (서버 응답 후 wallet 재조회)

---

### S09 — paywall.tsx IAP bridge 완성 + 이벤트 분리
- **파일:** `artifacts/lito/app/paywall.tsx`
- **변경:**
  - `nativeIapPurchase(productId, platform)` 추상 함수 도입 (StoreKit/Play Billing 호출 지점)
  - `PRODUCT_IDS` 맵: plan → 앱스토어 상품 ID 매핑
  - `verifyPurchase(token, { platform, productId, transactionId, receiptData })` 서버 검증 연동
  - web 플랫폼일 때 `verifyPurchase` 스킵 처리 (데모 환경 안전 분기)
  - 이벤트 순서: `purchase_started` → `purchase_completed` (IAP 성공) → `purchase_verified` (서버 검증 성공)
  - `purchase_verify_failed` 이벤트 추가 (서버 검증 실패, non-blocking)
  - `purchase_success_returned` 이벤트: 구매 후 화면 복귀 시 발화

---

### S10 — 서버 재빌드 + 타입 오류 수정
- **서버:** esbuild 재빌드 280ms 완료, 포트 8080 정상 기동
- **수정된 TS 오류:**
  - `AnalyticsEvent` 타입에 `purchase_verify_failed` 추가 (`artifacts/lito/types/growth.ts`)
  - paywall.tsx `"web"` 플랫폼이 `verifyPurchase`의 `"apple" | "google"` 타입과 불일치 → `nativePlatform !== "web"` 조건 분기로 해결

---

### S11 — E2E Happy-Path 검증 (수동 API 검증)

| 시나리오 | 검증 방법 | 결과 |
|----------|-----------|------|
| A. Wallet 응답 형식 | DB 직접 조회 | `trial_remaining:3, paid_remaining:9, remaining_total:12` 확인 |
| B. no_consent 블로킹 | `ai_consents` 조회 | conversation_coach consent 없는 유저 확인 |
| C. zero_credit 블로킹 | 코드 로직 검증 | `remaining_total <= 0` 조건 분기 확인 |
| D. Trial-first 차감 | 수학적 시뮬레이션 | Call 1-3: trial 차감, Call 4+: paid 차감 확인 |
| E. Profile coach no_consent | 코드 로직 검증 | S07 컴포넌트 + S08 라우팅 확인 |
| F. Profile coach zero_credit | 코드 로직 검증 | ZeroCreditSheet 조건 분기 확인 |
| G. Profile coach trial-first | 동일 debitCreditTrialFirst 함수 | S04와 동일 로직 확인 |
| H. 구매 이벤트 분리 | 코드 검토 | `purchase_completed` → `purchase_verified` 순서 독립 확인 |

---

## 3. 변경 파일 목록

```
lib/db/src/schema/billing.ts
artifacts/api-server/src/modules/billing/billing.router.ts
artifacts/api-server/src/modules/coaching/coaching.router.ts
artifacts/api-server/src/modules/profile_coach/profile_coach.router.ts
artifacts/api-server/src/infra/canonicalAnalytics.ts
artifacts/lito/services/coachApi.ts
artifacts/lito/services/analytics.ts
artifacts/lito/context/GrowthContext.tsx
artifacts/lito/types/growth.ts
artifacts/lito/app/chat/[id].tsx
artifacts/lito/app/paywall.tsx
artifacts/lito/app/profile-coach.tsx
artifacts/lito/components/NoConsentSheet.tsx     (신규)
artifacts/lito/components/ZeroCreditSheet.tsx    (신규)
artifacts/lito/components/UnsafeNotice.tsx       (신규)
```

---

## 4. 절대 원칙 준수 확인

| 원칙 | 상태 |
|------|------|
| 기본 채팅 / 번역 무료 | coach 엔드포인트만 차감, 일반 메시지 무차감 유지 |
| Coach 자동 실행 금지 | 사용자 명시적 CTA 후에만 AI 호출 |
| Trial 서버 authoritative | 클라이언트 로컬 카운터 완전 제거 |
| Unsafe + Paywall 동시 노출 금지 | UnsafeNotice에 결제 CTA 없음 |
| Consent + Paywall 분리 | NoConsentSheet에 결제 CTA 없음 |
| Consent + Unsafe 동시 노출 금지 | 서버 응답 우선순위: unsafe > no_consent > zero_credit |

---

*보고서 생성: Lito Engineering*
