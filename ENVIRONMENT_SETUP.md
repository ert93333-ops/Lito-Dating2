# Lito 환경변수 설정 가이드

> 코드, UI, 디자인은 일절 수정하지 않았습니다. 아래 파일들의 `REPLACE_WITH_...` 값만 실제 값으로 교체하면 됩니다.

---

## 생성된 환경변수 파일 목록

| 파일 경로 | 용도 |
|---|---|
| `artifacts/api-server/.env` | Node.js API 서버 환경변수 |
| `artifacts/lito/.env` | Expo 앱 환경변수 (빌드 시 번들 포함) |
| `artifacts/lito/eas.json` | EAS Build 프로파일 (iOS/Android 빌드 설정) |

---

## 1. API 서버 환경변수 (`artifacts/api-server/.env`)

### SESSION_SECRET
- **용도**: JWT 토큰 서명 시크릿
- **현재 값**: 자동 생성된 랜덤 64자리 hex 문자열 (그대로 사용 가능)
- **재생성**: `openssl rand -hex 32`

### DATABASE_URL
- **용도**: PostgreSQL 데이터베이스 연결 문자열
- **형식**: `postgresql://사용자:비밀번호@호스트:5432/데이터베이스명`
- **권장**: Supabase, Railway, Neon, AWS RDS 등 PostgreSQL 서비스 사용

### OPENAI_API_KEY
- **용도**: AI 코치, 번역, 매칭 기능
- **발급**: https://platform.openai.com/api-keys

### GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET
- **용도**: Google 소셜 로그인
- **발급**: https://console.cloud.google.com → API 및 서비스 → 사용자 인증 정보 → OAuth 2.0 클라이언트 ID
- **리디렉션 URI 등록 필수**: `https://YOUR_DOMAIN/api/auth/google/callback`

### KAKAO_APP_KEY / KAKAO_CLIENT_SECRET
- **용도**: 카카오 소셜 로그인 (한국 사용자)
- **발급**: https://developers.kakao.com → 내 애플리케이션 → REST API 키
- **리디렉션 URI 등록 필수**: `https://YOUR_DOMAIN/api/auth/kakao/callback`

### LINE_CHANNEL_ID / LINE_CHANNEL_SECRET
- **용도**: LINE 소셜 로그인 (일본 사용자)
- **발급**: https://developers.line.biz → Providers → 채널 생성 → LINE Login
- **리디렉션 URI 등록 필수**: `https://YOUR_DOMAIN/api/auth/line/callback`

### DEFAULT_OBJECT_STORAGE_BUCKET_ID
- **용도**: 프로필 사진 등 파일 저장소 (Google Cloud Storage)
- **발급**: Google Cloud Console → Cloud Storage → 버킷 생성

---

## 2. Expo 앱 환경변수 (`artifacts/lito/.env`)

### EXPO_PUBLIC_DOMAIN
- **용도**: 앱이 API 서버에 연결할 도메인
- **예시**: `litodate.app` (배포 후 실제 도메인)
- **로컬 개발 시**: `localhost:3000`
- **주의**: `EXPO_PUBLIC_` 접두사가 붙은 변수만 앱 번들에 포함됩니다

---

## 3. EAS Build 설정 (`artifacts/lito/eas.json`)

EAS Build는 Expo Application Services를 통해 iOS(.ipa) 및 Android(.aab/.apk) 빌드를 클라우드에서 수행합니다.

### 사전 준비

```bash
# EAS CLI 설치
npm install -g eas-cli

# Expo 계정 로그인
eas login

# EAS 프로젝트 초기화 (artifacts/lito 디렉토리에서 실행)
cd artifacts/lito
eas build:configure
```

### iOS 빌드 (App Store)

```bash
cd artifacts/lito
eas build --platform ios --profile production
```

**필요 정보:**
- Apple Developer 계정 (연간 $99)
- Bundle ID: `com.litodate.app` (app.json에 이미 설정됨)
- `eas.json`의 `submit.production.ios` 섹션에 Apple 계정 정보 입력

### Android 빌드 (Google Play)

```bash
cd artifacts/lito
eas build --platform android --profile production
```

**필요 정보:**
- Google Play Console 계정 (1회 $25)
- Package name: `app.litodate` (app.json에 이미 설정됨)
- Google Play 서비스 계정 키 파일: `google-play-service-account.json`

### 전체 플랫폼 동시 빌드

```bash
cd artifacts/lito
eas build --platform all --profile production
```

---

## 4. 앱스토어 제출 (빌드 완료 후)

```bash
# iOS App Store 제출
eas submit --platform ios --profile production

# Google Play 제출
eas submit --platform android --profile production
```

---

## 5. 배포 순서 요약

1. PostgreSQL 데이터베이스 생성 → `DATABASE_URL` 입력
2. OpenAI API 키 발급 → `OPENAI_API_KEY` 입력
3. Google/Kakao/LINE OAuth 앱 생성 → 각 키 입력
4. API 서버 배포 (Replit, Railway, Fly.io 등)
5. `EXPO_PUBLIC_DOMAIN` = 배포된 API 서버 도메인으로 설정
6. `eas.json`에 Apple/Google 계정 정보 입력
7. `eas build --platform all --profile production` 실행
8. 앱스토어 심사 제출

---

## 6. 앱 정보 (app.json에서 확인)

| 항목 | 값 |
|---|---|
| 앱 이름 | lito |
| iOS Bundle ID | `com.litodate.app` |
| Android Package | `app.litodate` |
| 버전 | 1.0.0 |
| iOS Build Number | 1 |
| Android Version Code | 1 |
| 지원 방향 | 세로(portrait) 전용 |
| 태블릿 지원 | 미지원 |
