# LITO 프로젝트 종합 진단 보고서

**작성일:** 2026년 4월 16일
**작성자:** Manus AI
**목적:** LITO 데이팅 앱의 현재 상태를 진단하고, 출시를 위해 해결해야 할 블로커(Blocker)와 14일 복구 계획을 수립합니다.

---

## 1. 현재 상태 요약

LITO 프로젝트는 **React Native (Expo) 기반의 프론트엔드**와 **Express + Drizzle ORM 기반의 백엔드**로 구성된 풀스택 모노레포(pnpm workspace)입니다. AI 매칭, 실시간 채팅, 다국어 번역, 소셜 로그인 등 데이팅 앱의 핵심 기능 뼈대가 모두 구현되어 있으나, **현재 프론트엔드의 상당 부분이 하드코딩된 Mock 데이터에 의존**하고 있어 실제 백엔드 API와의 연동이 미흡한 상태입니다. 

출시를 위해서는 "UI/UX 완성" 단계에서 "실제 데이터 연동 및 인프라 구축" 단계로의 전환이 시급합니다.

---

## 2. 시스템 아키텍처 및 구조

### 2.1 프론트엔드 구조 (`artifacts/lito`)
- **프레임워크:** Expo (React Native), Expo Router (파일 기반 라우팅)
- **주요 화면:**
  - `(tabs)/discover.tsx`: 스와이프 매칭 화면 (현재 Mock 데이터 사용)
  - `(tabs)/matches.tsx`: 매칭 목록 화면
  - `chat/[id].tsx`: 실시간 채팅 화면 (WebSocket 연동 일부 구현)
  - `profile-setup.tsx`: 온보딩 및 프로필 생성
  - `login.tsx`: 소셜 로그인 화면
- **상태 관리:** React Context (`AppContext.tsx`, `GrowthContext.tsx`)
- **특이사항:** `data/mockData.ts`에 의존성이 매우 높음. `AppContext.tsx`에서 API 호출 대신 Mock 데이터를 초기 상태로 주입하고 있음.

### 2.2 백엔드 구조 (`artifacts/api-server`)
- **프레임워크:** Express.js, Node.js
- **주요 API 라우트:**
  - `/api/auth/*`: 소셜 로그인 (Google, Kakao, LINE, Apple) 및 JWT 발급
  - `/api/users/*`: 프로필 조회, 좋아요/패스 (슈퍼 라이크 포함)
  - `/api/chat/*`: 메시지 전송, 읽음 처리, 대화방 목록
  - `/api/ai/*`: PRS(Partner Receptivity Score) 분석, 번역, 대화 제안, 코칭
  - `/api/storage/*`: GCS 기반 프로필 사진 업로드 (Presigned URL 방식)
- **실시간 통신:** `ws` 라이브러리를 이용한 순수 WebSocket 서버 (`ws.ts`)
- **특이사항:** API 엔드포인트는 대부분 구현되어 있으나, 클라이언트에서 이를 호출하는 로직이 누락되어 있음.

### 2.3 DB 스키마 (`lib/db`)
- **ORM:** Drizzle ORM
- **데이터베이스:** PostgreSQL
- **주요 테이블:**
  - `users`, `user_profiles`: 사용자 기본 정보 및 상세 프로필
  - `oauth_accounts`: 소셜 로그인 연동 정보
  - `swipe_likes`, `swipe_passes`: 스와이프 액션 기록 (`is_super` 포함)
  - `matches`: 상호 좋아요 성사 기록
  - `conversations`, `chat_messages`: 실시간 채팅 기록 (`read_at` 포함)
  - `user_reports`, `user_blocks`: 신고 및 차단 관리

### 2.4 인증 방식
- **방식:** JWT (JSON Web Token) 기반 Stateless 인증
- **소셜 로그인:** Google, Kakao, LINE (서버사이드 콜백 방식), Apple (클라이언트 사이드 검증)
- **흐름:** 클라이언트에서 `/api/auth/{provider}/start` 호출 → 브라우저 인증 → 서버 콜백에서 JWT 발급 → 딥링크(`lito://auth/callback`)로 앱 복귀

---

## 3. 기능 인벤토리 표 (상태 분류)

| 카테고리 | 기능명 | 현재 상태 | 상세 설명 |
|----------|--------|-----------|-----------|
| **인증** | 이메일 회원가입/로그인 | 🟢 동작 | API 및 UI 구현 완료 |
| | 소셜 로그인 (Google, Kakao, LINE) | 🟡 부분 동작 | API 구현됨. 클라이언트 연동 및 개발자 콘솔 설정 필요 |
| | Apple 로그인 | 🟡 부분 동작 | API 구현됨. Apple Developer 계정 및 인증서 설정 필요 |
| **프로필** | 프로필 생성 (온보딩) | 🟡 부분 동작 | UI 구현됨. API 연동 및 사진 업로드(GCS) 테스트 필요 |
| | 프로필 수정 | 🟡 부분 동작 | UI 구현됨. API 연동 필요 |
| | 신분증/얼굴 인증 (Trust Layer) | 🔴 미구현 | UI만 존재. 실제 인증 로직(KYC API) 미연동 |
| **매칭** | 스와이프 (좋아요/패스) | 🟡 부분 동작 | API 구현됨. UI는 현재 Mock 데이터(`mockData.ts`) 사용 중 |
| | 슈퍼 라이크 | 🟢 동작 | API 및 UI 연동 완료 (일일 제한 로직 포함) |
| | 매칭 성사 로직 | 🟡 부분 동작 | API 구현됨. 클라이언트에서 매칭 팝업 연동 필요 |
| **채팅** | 실시간 메시지 전송 | 🟡 부분 동작 | WebSocket 서버 구현됨. 클라이언트 연동 안정화 필요 |
| | 읽음 표시 (Read Receipt) | 🟢 동작 | API, WebSocket, UI 연동 완료 |
| | 번역 기능 | 🟡 부분 동작 | API(`/api/ai/translate`) 구현됨. UI 연동 필요 |
| **AI 기능** | 대화 제안 (Icebreaker) | 🟡 부분 동작 | API 구현됨. UI 연동 필요 |
| | PRS (호감도 분석) | 🟡 부분 동작 | API 구현됨. UI 연동 필요 |
| | AI 프로필 코칭 | 🟡 부분 동작 | API 구현됨. UI 연동 필요 |
| **수익화** | 인앱 결제 (구독, 소모품) | 🔴 미구현 | UI만 존재. RevenueCat 등 결제 모듈 미연동 |
| | 리퍼럴 (초대 코드) | 🔴 미구현 | UI만 존재. 실제 딥링크 및 보상 지급 로직 미구현 |
| **기타** | 푸시 알림 | 🔴 미구현 | Expo Notifications 설정 및 서버 연동 누락 |
| | 신고 및 차단 | 🟡 부분 동작 | API 구현됨. UI 연동 필요 |
| | 관리자 대시보드 | 🟡 부분 동작 | `artifacts/admin` 존재하나 데이터 연동 미흡 |

---

## 4. 환경변수 및 시크릿 누락 리스트

현재 `.env` 파일 구조는 잡혀 있으나, 실제 배포 및 동작을 위해 발급받아 채워 넣어야 할 시크릿이 다수 존재합니다.

| 환경변수명 | 위치 | 용도 | 상태 |
|------------|------|------|------|
| `EXPO_PUBLIC_DOMAIN` | 클라이언트 | API 서버 베이스 URL | ⚠️ 배포 도메인으로 변경 필요 |
| `DATABASE_URL` | 서버 | PostgreSQL 연결 문자열 | ⚠️ 프로덕션 DB URL 필요 |
| `SESSION_SECRET` | 서버 | JWT 서명 키 | 🟢 임시값 존재 (운영 시 변경 권장) |
| `OPENAI_API_KEY` | 서버 | AI 기능 (번역, 코칭 등) | 🟢 임시값 존재 |
| `GOOGLE_CLIENT_ID/SECRET` | 서버 | Google 소셜 로그인 | 🔴 본계정 발급 필요 |
| `KAKAO_APP_KEY/SECRET` | 서버 | Kakao 소셜 로그인 | 🔴 본계정 발급 필요 |
| `LINE_CHANNEL_ID/SECRET` | 서버 | LINE 소셜 로그인 | 🔴 본계정 발급 필요 |
| `APPLE_BUNDLE_ID` | 서버 | Apple 로그인 검증 | 🔴 Apple Developer 설정 필요 |
| `DEFAULT_OBJECT_STORAGE_BUCKET_ID` | 서버 | 프로필 사진 업로드 (GCS) | 🔴 버킷 생성 및 권한 설정 필요 |

---

## 5. 출시를 막는 Blocker TOP 20 (위험도 표)

| 순위 | Blocker 항목 | 위험도 | 영향 범위 | 해결 방안 |
|------|--------------|--------|-----------|-----------|
| 1 | **클라이언트 Mock 데이터 하드코딩** | 🔴 치명적 | 앱 전체 (스와이프, 채팅) | `AppContext.tsx`의 `mockData` 의존성 제거 및 REST API 연동 |
| 2 | **프로필 사진 업로드 인프라 부재** | 🔴 치명적 | 온보딩, 프로필 | GCS 버킷 생성 및 `objectStorage.ts` 설정 완료 |
| 3 | **소셜 로그인 개발자 콘솔 미설정** | 🔴 치명적 | 회원가입/로그인 | Google, Kakao, LINE, Apple 개발자 콘솔 앱 등록 및 키 발급 |
| 4 | **인앱 결제(RevenueCat) 미연동** | 🔴 치명적 | 수익화 (구독, 슈퍼라이크) | RevenueCat SDK 설치 및 상품 등록, 서버 웹훅 연동 |
| 5 | **푸시 알림 미구현** | 🔴 치명적 | 채팅, 매칭 | Expo Notifications 설정 및 서버사이드 푸시 발송 로직 추가 |
| 6 | **WebSocket 연결 불안정성** | 🟠 높음 | 실시간 채팅 | 앱 백그라운드 전환 시 재연결 로직 및 토큰 갱신 처리 |
| 7 | **프로덕션 DB 인프라 부재** | 🟠 높음 | 백엔드 전체 | Railway 또는 Supabase에 PostgreSQL 프로덕션 인프라 구축 |
| 8 | **API 서버 배포 환경 미설정** | 🟠 높음 | 백엔드 전체 | Dockerfile 작성 또는 Railway 배포 파이프라인 구축 |
| 9 | **KYC (신분증/얼굴) 인증 로직 부재** | 🟠 높음 | 신뢰도 (Trust Layer) | 외부 KYC API(예: Sumsub, Veriff) 연동 또는 임시 수동 승인 처리 |
| 10 | **앱스토어 심사용 리뷰 계정 부재** | 🟠 높음 | 앱스토어 심사 | 심사관이 테스트할 수 있는 하드코딩된 테스트 계정 및 우회 로직 추가 |
| 11 | **채팅 번역 API 클라이언트 연동 누락** | 🟡 중간 | 채팅 | 메시지 버블에 번역 버튼 추가 및 `/api/ai/translate` 호출 |
| 12 | **AI 대화 제안 UI 연동 누락** | 🟡 중간 | 채팅 | 채팅방 하단에 Icebreaker 버튼 추가 및 API 연동 |
| 13 | **PRS(호감도) 점수 UI 연동 누락** | 🟡 중간 | 매칭, 채팅 | 상대방 프로필 또는 채팅방 상단에 PRS 점수 표시 |
| 14 | **신고/차단 기능 클라이언트 연동 누락** | 🟡 중간 | 안전/운영 | 프로필 및 채팅방 메뉴에 신고/차단 API 호출 연결 |
| 15 | **리퍼럴(초대) 딥링크 미구현** | 🟡 중간 | 마케팅 | Expo Linking 또는 Branch.io 연동하여 초대 코드 처리 |
| 16 | **관리자 대시보드 데이터 연동 미흡** | 🟡 중간 | 운영 | `artifacts/admin`의 Mock 데이터를 실제 API로 교체 |
| 17 | **에러 바운더리 및 크래시 리포팅 부재** | 🟡 중간 | 안정성 | Sentry 또는 Crashlytics 연동 |
| 18 | **다국어(i18n) 텍스트 누락 및 오타** | 🟢 낮음 | UI/UX | 한국어/일본어 번역 검수 및 누락된 하드코딩 텍스트 추출 |
| 19 | **앱 아이콘 및 스플래시 스크린 해상도** | 🟢 낮음 | 브랜딩 | 고해상도 에셋으로 교체 및 `app.json` 설정 확인 |
| 20 | **이용약관/개인정보처리방침 웹뷰 처리** | 🟢 낮음 | 앱스토어 심사 | (최근 완료됨) 외부 브라우저 대신 앱 내 인앱 브라우저로 열리도록 개선 |

---

## 6. 14일 복구 및 출시 계획 (우선순위 백로그)

### Phase 1: 코어 데이터 연동 및 인프라 (Day 1-4)
- **Day 1:** GCS 버킷 생성 및 프로필 사진 업로드(`photoUpload.ts`) 테스트 완료
- **Day 2:** `AppContext.tsx`에서 Mock 데이터(`mockData.ts`) 완전 제거 및 `/api/users/discover` API 연동
- **Day 3:** 프로덕션 DB(PostgreSQL) 구축 및 API 서버 배포 (Railway 등)
- **Day 4:** 소셜 로그인(Google, Kakao, LINE, Apple) 개발자 콘솔 설정 및 키 발급, 연동 테스트

### Phase 2: 실시간 기능 및 AI 연동 (Day 5-8)
- **Day 5:** WebSocket 채팅 안정화 (재연결 로직, 백그라운드 처리)
- **Day 6:** 채팅 번역(`/api/ai/translate`) 및 대화 제안(`/api/ai/conversation-starter`) UI 연동
- **Day 7:** PRS 호감도 분석 및 AI 프로필 코칭 API 클라이언트 연동
- **Day 8:** 신고/차단 기능 API 연동 및 관리자 대시보드 기본 연동

### Phase 3: 수익화 및 필수 운영 기능 (Day 9-11)
- **Day 9:** RevenueCat SDK 설치 및 인앱 결제(구독, 슈퍼라이크 패키지) 연동
- **Day 10:** Expo Notifications 설정 및 매칭/메시지 푸시 알림 서버 로직 구현
- **Day 11:** KYC(신분증/얼굴) 인증 외부 API 연동 또는 관리자 수동 승인 프로세스 구축

### Phase 4: 폴리싱 및 심사 준비 (Day 12-14)
- **Day 12:** Sentry 연동(크래시 리포팅), 다국어 번역 검수, UI 깨짐 수정
- **Day 13:** 앱스토어 심사용 테스트 계정 생성, 앱 아이콘/스플래시 스크린 최종 적용
- **Day 14:** TestFlight 및 Google Play Internal Track 빌드 업로드, 심사 제출
