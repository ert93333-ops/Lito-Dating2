import { Router } from "express";

const router = Router();

const HTML_HEAD = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>{TITLE} — lito</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #FAFAFA; color: #2D2D2D; line-height: 1.75; }
    .wrap { max-width: 760px; margin: 0 auto; padding: 48px 24px 80px; }
    header { text-align: center; margin-bottom: 48px; border-bottom: 1px solid #E8E8E8; padding-bottom: 32px; }
    .logo { font-size: 32px; font-weight: 700; letter-spacing: -1px; color: #E8667A; margin-bottom: 8px; }
    h1 { font-size: 22px; font-weight: 600; color: #2D2D2D; }
    .updated { font-size: 13px; color: #999; margin-top: 6px; }
    h2 { font-size: 16px; font-weight: 600; margin: 36px 0 12px; color: #2D2D2D; padding-left: 12px; border-left: 3px solid #E8667A; }
    p { font-size: 14px; color: #555; margin-bottom: 12px; }
    ul { font-size: 14px; color: #555; padding-left: 20px; margin-bottom: 12px; }
    li { margin-bottom: 6px; }
    a { color: #E8667A; text-decoration: none; }
    a:hover { text-decoration: underline; }
    footer { text-align: center; margin-top: 56px; font-size: 12px; color: #aaa; border-top: 1px solid #E8E8E8; padding-top: 24px; }
  </style>
</head>
<body><div class="wrap">`;

const HTML_FOOT = `
<footer>
  <p><a href="/">lito</a> &nbsp;·&nbsp; <a href="/api/legal/privacy">개인정보처리방침</a> &nbsp;·&nbsp; <a href="/api/legal/terms">이용약관</a></p>
  <p style="margin-top:8px">© 2025 lito. All rights reserved.</p>
</footer>
</div></body></html>`;

// ── GET /api/legal/privacy ────────────────────────────────────────────────────
router.get("/legal/privacy", (_req, res) => {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(
    HTML_HEAD.replace("{TITLE}", "개인정보처리방침") +
    `
    <header>
      <div class="logo">lito</div>
      <h1>개인정보처리방침</h1>
      <p class="updated">시행일: 2025년 1월 1일 &nbsp;·&nbsp; 최종 수정: 2025년 1월 1일</p>
    </header>

    <h2>1. 수집하는 개인정보</h2>
    <p>lito는 서비스 제공을 위해 아래의 개인정보를 수집합니다.</p>
    <ul>
      <li><strong>회원가입 시</strong>: 이메일 주소, 닉네임, 생년월일, 성별, 국가, 언어 설정</li>
      <li><strong>소셜 로그인 시</strong>: OAuth 제공자(Google, Apple, Kakao, LINE)로부터 제공된 식별자 및 이메일</li>
      <li><strong>프로필 작성 시</strong>: 사진, 자기소개, 관심사, 거주 도시</li>
      <li><strong>서비스 이용 시</strong>: 채팅 내용, 매칭 정보, 서비스 이용 기록</li>
      <li><strong>자동 수집</strong>: 기기 정보, IP 주소, 접속 일시, 서비스 이용 기록</li>
    </ul>

    <h2>2. 개인정보 수집 및 이용 목적</h2>
    <ul>
      <li>회원 가입 및 본인 확인</li>
      <li>매칭 서비스 및 채팅 기능 제공</li>
      <li>AI 문화 매칭 및 언어 번역 서비스 제공</li>
      <li>서비스 개선 및 신규 기능 개발</li>
      <li>부정 이용 방지 및 안전한 서비스 환경 조성</li>
      <li>법령 및 이용약관 위반 행위 조사</li>
    </ul>

    <h2>3. 개인정보 보유 및 이용 기간</h2>
    <p>회원 탈퇴 시 즉시 파기합니다. 단, 관련 법령에 따라 일정 기간 보관이 필요한 정보는 해당 법령에서 정한 기간 동안 보관합니다.</p>
    <ul>
      <li>계약 또는 청약철회 관련 기록: 5년 (전자상거래법)</li>
      <li>소비자 불만 또는 분쟁 처리 기록: 3년 (전자상거래법)</li>
      <li>접속 로그, 접속 IP 정보: 3개월 (통신비밀보호법)</li>
    </ul>

    <h2>4. 개인정보 제3자 제공</h2>
    <p>lito는 원칙적으로 이용자의 개인정보를 외부에 제공하지 않습니다. 다만, 아래의 경우에는 예외입니다.</p>
    <ul>
      <li>이용자가 사전에 동의한 경우</li>
      <li>법령의 규정에 의거하거나 수사 목적으로 법령에 정해진 절차와 방법에 따라 수사기관의 요구가 있는 경우</li>
    </ul>

    <h2>5. 개인정보 처리 위탁</h2>
    <p>lito는 서비스 제공을 위해 아래와 같이 개인정보 처리를 위탁합니다.</p>
    <ul>
      <li><strong>OpenAI</strong>: AI 번역 및 매칭 분석 서비스</li>
      <li><strong>Google Cloud</strong>: 서버 인프라 및 데이터 저장</li>
    </ul>

    <h2>6. 이용자의 권리</h2>
    <p>이용자는 언제든지 다음의 권리를 행사할 수 있습니다.</p>
    <ul>
      <li>개인정보 열람 요청</li>
      <li>개인정보 정정·삭제 요청</li>
      <li>개인정보 처리 정지 요청</li>
      <li>회원 탈퇴 (앱 내 설정에서 직접 가능)</li>
    </ul>

    <h2>7. 개인정보 보호책임자</h2>
    <p>개인정보 관련 문의는 아래로 연락해주세요.</p>
    <ul>
      <li>이메일: <a href="mailto:privacy@litodate.app">privacy@litodate.app</a></li>
      <li>서비스명: lito</li>
    </ul>

    <h2>8. 개인정보처리방침 변경</h2>
    <p>본 방침은 법령 또는 서비스 변경에 따라 내용이 추가·삭제·수정될 수 있습니다. 변경 시 앱 내 공지 또는 이메일을 통해 사전 고지합니다.</p>
    ` +
    HTML_FOOT
  );
});

// ── GET /api/legal/terms ──────────────────────────────────────────────────────
router.get("/legal/terms", (_req, res) => {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(
    HTML_HEAD.replace("{TITLE}", "이용약관") +
    `
    <header>
      <div class="logo">lito</div>
      <h1>이용약관</h1>
      <p class="updated">시행일: 2025년 1월 1일 &nbsp;·&nbsp; 최종 수정: 2025년 1월 1일</p>
    </header>

    <h2>제1조 (목적)</h2>
    <p>본 약관은 lito(이하 "서비스")가 제공하는 한국-일본 문화 교류 및 소셜 매칭 서비스의 이용과 관련하여 서비스와 이용자 간의 권리, 의무 및 책임사항을 규정함을 목적으로 합니다.</p>

    <h2>제2조 (이용자 자격)</h2>
    <ul>
      <li>만 18세 이상인 자</li>
      <li>서비스 이용약관 및 개인정보처리방침에 동의한 자</li>
      <li>한국 또는 일본에 거주하거나 해당 문화에 관심 있는 자</li>
    </ul>

    <h2>제3조 (계정)</h2>
    <p>이용자는 계정 등록 시 정확하고 최신의 정보를 제공해야 합니다. 타인의 정보를 도용하거나 허위 정보를 입력하는 행위는 금지됩니다. 계정 보안에 대한 책임은 이용자에게 있습니다.</p>

    <h2>제4조 (금지 행위)</h2>
    <p>이용자는 다음 행위를 해서는 안 됩니다.</p>
    <ul>
      <li>타인을 사칭하거나 허위 프로필 작성</li>
      <li>음란물, 혐오 표현, 폭력적 콘텐츠 게시</li>
      <li>스팸, 광고, 상업적 목적의 메시지 발송</li>
      <li>사기, 피싱, 금전 요구 행위</li>
      <li>다른 이용자를 괴롭히거나 위협하는 행위</li>
      <li>서비스 시스템을 무단으로 해킹하거나 악용하는 행위</li>
    </ul>

    <h2>제5조 (콘텐츠)</h2>
    <p>이용자가 서비스에 게시한 콘텐츠(프로필 사진, 소개글 등)에 대한 저작권은 이용자에게 있습니다. 단, lito는 서비스 운영 및 개선을 위해 해당 콘텐츠를 사용할 수 있는 비독점적 라이선스를 갖습니다.</p>

    <h2>제6조 (AI 기능)</h2>
    <p>lito는 AI 기반 매칭, 번역, 대화 제안 기능을 제공합니다. AI 기능의 결과는 참고용이며, 서비스는 AI 결과의 정확성을 보장하지 않습니다. 번역은 자동 번역으로, 미묘한 뉘앙스가 다를 수 있습니다.</p>

    <h2>제7조 (서비스 제한)</h2>
    <p>lito는 다음의 경우 사전 통보 없이 서비스 이용을 제한하거나 계정을 삭제할 수 있습니다.</p>
    <ul>
      <li>금지 행위 위반 시</li>
      <li>타 이용자의 신고가 접수되어 확인된 경우</li>
      <li>서비스 운영에 심각한 지장을 초래하는 경우</li>
    </ul>

    <h2>제8조 (면책사항)</h2>
    <p>lito는 이용자 간의 만남 또는 거래에서 발생하는 문제에 대해 책임을 지지 않습니다. 서비스는 이용자를 연결하는 플랫폼이며, 직접적인 만남 시 발생하는 사고에 대해 책임지지 않습니다.</p>

    <h2>제9조 (유료 서비스)</h2>
    <p>lito는 무료 및 유료(프리미엄) 서비스를 제공할 수 있습니다. 유료 서비스 이용 시 별도 안내되는 요금 정책이 적용됩니다. 결제 취소 및 환불은 관련 법령 및 앱스토어 정책에 따릅니다.</p>

    <h2>제10조 (준거법 및 분쟁 해결)</h2>
    <p>본 약관은 대한민국 법률에 따라 해석됩니다. 서비스 이용과 관련한 분쟁은 대한민국 법원을 관할 법원으로 합니다.</p>

    <h2>문의</h2>
    <p>약관 관련 문의: <a href="mailto:support@litodate.app">support@litodate.app</a></p>
    ` +
    HTML_FOOT
  );
});

export default router;
