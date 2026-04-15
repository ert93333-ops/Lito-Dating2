# Lito 데이팅 앱 소셜 로그인 미연동 원인 분석 보고서

사용자님의 지적대로 소셜 로그인 코드를 정밀 분석한 결과, 코드는 작성되어 있으나 **실제 환경 설정 누락 및 Expo 설정 문제**로 인해 현재 소셜 로그인이 전혀 동작할 수 없는 상태임을 확인했습니다.

## 1. 공통적인 문제 원인 (모든 소셜 로그인 실패)

가장 치명적인 문제는 **딥링크(Deep Link) 설정 오류**입니다.

소셜 로그인은 웹 브라우저에서 인증을 마친 후 다시 앱으로 돌아와야 합니다. 현재 API 서버는 인증 완료 후 `lito://auth/callback?token=...` 형태로 앱을 호출하도록 하드코딩되어 있습니다.
그러나 `app.json`의 `expo-router` 설정에 `origin: "https://replit.com/"`이 하드코딩되어 있어, 앱이 `lito://` 스킴을 정상적으로 처리하지 못하고 Replit 환경에 의존하고 있습니다.

## 2. 제공자별 미연동 원인 및 조치 사항

### 2.1. Google 로그인
- **원인**: `.env` 파일에 `GOOGLE_CLIENT_ID`와 `GOOGLE_CLIENT_SECRET`이 실제 키가 아닌 `REPLACE_WITH_...` 상태로 비어 있습니다.
- **조치**: Google Cloud Console에서 OAuth 2.0 클라이언트 ID를 발급받아 `.env`에 입력해야 합니다. 리디렉션 URI는 `https://[API서버도메인]/api/auth/google/callback`으로 설정해야 합니다.

### 2.2. Kakao 로그인
- **원인**: `.env` 파일에 `KAKAO_APP_KEY`와 `KAKAO_CLIENT_SECRET`이 비어 있습니다. 또한, 코드 상에서 이메일 수집을 위해 `kakao_account.email`을 참조하고 있으나, 카카오 디벨로퍼스에서 **이메일 필수 동의** 설정을 하지 않으면 이메일이 넘어오지 않아 계정 생성이 꼬일 수 있습니다.
- **조치**: 카카오 디벨로퍼스에서 REST API 키를 발급받고, 동의 항목에서 '카카오계정(이메일)'을 필수로 설정해야 합니다.

### 2.3. LINE 로그인
- **원인**: `.env` 파일에 `LINE_CHANNEL_ID`와 `LINE_CHANNEL_SECRET`이 비어 있습니다. 또한, LINE 로그인은 기본적으로 이메일을 제공하지 않으므로, 코드 상에서 `line_{userId}@lito.app` 형태의 가짜 이메일을 생성하여 처리하고 있습니다.
- **조치**: LINE Developers에서 채널을 생성하고 키를 발급받아야 합니다. 이메일 수집이 꼭 필요하다면 LINE 채널 설정에서 Email 권한을 별도로 신청해야 합니다.

### 2.4. Apple 로그인
- **원인**: Apple 로그인은 iOS 네이티브 기능(`expo-apple-authentication`)을 사용하므로, Expo Go 앱에서는 테스트할 수 없으며 **반드시 iOS 네이티브 빌드(TestFlight 등)**를 해야만 동작합니다. 또한 `app.json`의 `ios.usesAppleSignIn` 설정이 누락되어 있습니다.
- **조치**: `app.json`의 `ios` 객체 안에 `usesAppleSignIn: true`를 추가하고, Apple Developer 계정에서 Sign In with Apple Identifier를 설정한 후 EAS Build를 진행해야 합니다.

## 3. 이메일 로그인 (유일하게 동작 가능)

현재 환경변수나 딥링크 설정 없이도 **유일하게 동작 가능한 것은 이메일 로그인/회원가입**입니다.
API 서버의 `/api/auth/register`와 `/api/auth/login` 라우트는 정상적으로 DB에 비밀번호를 해싱하여 저장하고 JWT 토큰을 발급하고 있습니다.

## 4. 해결을 위한 다음 단계

소셜 로그인을 정상화하려면 다음 작업이 선행되어야 합니다.

1. **`app.json` 수정**: `expo-router`의 `origin`을 실제 도메인으로 변경하거나 삭제하여 딥링크(`lito://`)가 정상 작동하도록 수정
2. **API 키 발급 및 입력**: Google, Kakao, LINE 개발자 콘솔에서 앱을 등록하고 발급받은 키를 `artifacts/api-server/.env`에 입력
3. **API 서버 배포**: 로컬(`localhost`)이 아닌 실제 인터넷에서 접근 가능한 도메인(예: Railway, Fly.io)에 API 서버를 배포하여 소셜 제공자의 콜백을 받을 수 있도록 구성

이러한 설정들이 완료되지 않으면 소셜 로그인 버튼을 눌러도 오류 화면만 나타나게 됩니다.
