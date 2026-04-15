# 소셜 로그인 설정 가이드 (Google, Kakao, LINE, Apple)

앱에서 소셜 로그인이 정상적으로 동작하도록 코드를 모두 수정했습니다. (커밋 `853919e`)
이제 각 플랫폼의 개발자 콘솔에서 앱을 등록하고 키를 발급받아 `.env` 파일에 넣기만 하면 됩니다.

## 1. 공통 설정 (딥링크 및 도메인)

모든 소셜 로그인은 인증 후 앱으로 돌아오기 위해 **딥링크(Deep Link)**를 사용합니다.
- **앱 스킴**: `lito://`
- **콜백 URL**: `lito://auth/callback`
- **서버 콜백 URL**: `https://[API서버도메인]/api/auth/[provider]/callback`

---

## 2. Google 로그인 설정

1. [Google Cloud Console](https://console.cloud.google.com/) 접속
2. 새 프로젝트 생성 후 **API 및 서비스 > 사용자 인증 정보** 이동
3. **OAuth 동의 화면** 구성 (앱 이름, 지원 이메일 입력)
4. **사용자 인증 정보 만들기 > OAuth 클라이언트 ID** 선택
5. 애플리케이션 유형: **웹 애플리케이션** 선택
6. **승인된 리디렉션 URI**에 다음 주소 추가:
   - `https://[API서버도메인]/api/auth/google/callback`
7. 발급된 **클라이언트 ID**와 **클라이언트 보안 비밀**을 `api-server/.env`에 입력:
   ```env
   GOOGLE_CLIENT_ID=발급받은_클라이언트_ID
   GOOGLE_CLIENT_SECRET=발급받은_클라이언트_보안_비밀
   ```

---

## 3. Kakao 로그인 설정

1. [Kakao Developers](https://developers.kakao.com/) 접속
2. **내 애플리케이션 > 앱 추가**
3. **앱 설정 > 플랫폼 > Web** 플랫폼 등록
   - 사이트 도메인: `https://[API서버도메인]`
4. **제품 설정 > 카카오 로그인** 활성화
5. **Redirect URI** 등록:
   - `https://[API서버도메인]/api/auth/kakao/callback`
6. **동의항목** 설정:
   - `닉네임` (필수 동의)
   - `카카오계정(이메일)` (필수 동의)
7. **앱 키 > REST API 키**와 **보안 > Client Secret**을 `api-server/.env`에 입력:
   ```env
   KAKAO_APP_KEY=발급받은_REST_API_키
   KAKAO_CLIENT_SECRET=발급받은_Client_Secret
   ```

---

## 4. LINE 로그인 설정

1. [LINE Developers](https://developers.line.biz/) 접속
2. **Provider** 생성 후 **LINE Login** 채널 생성
3. **App types**: `Web app` 선택
4. **LINE Login settings** 탭에서 **Callback URL** 등록:
   - `https://[API서버도메인]/api/auth/line/callback`
5. **Basic settings** 탭 하단의 **OpenID Connect** 항목에서 `Email address permission` 활성화 (Apply 버튼 클릭)
6. **Channel ID**와 **Channel secret**을 `api-server/.env`에 입력:
   ```env
   LINE_CHANNEL_ID=발급받은_Channel_ID
   LINE_CHANNEL_SECRET=발급받은_Channel_Secret
   ```

---

## 5. Apple 로그인 설정 (iOS 전용)

Apple 로그인은 서버 키 발급이 필요 없으며, Apple Developer 계정 설정만 필요합니다.

1. [Apple Developer](https://developer.apple.com/) 접속
2. **Certificates, Identifiers & Profiles > Identifiers** 이동
3. 앱의 Bundle ID (`com.litodate.app`) 선택
4. **Capabilities** 탭에서 **Sign In with Apple** 체크 후 저장
5. EAS 빌드 시 자동으로 설정이 적용됩니다. (app.json에 `usesAppleSignIn: true` 추가 완료)
