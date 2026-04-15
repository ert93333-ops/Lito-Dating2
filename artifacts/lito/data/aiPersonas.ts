/**
 * AI 페르소나 대화방 상수 — mockData.ts와 완전히 독립.
 *
 * AI 페르소나는 서버 매칭이 아닌 로컬 관리 대화방으로,
 * 앱 시작 시 항상 표시됩니다. 프로덕션에서도 유지됩니다.
 */
import { Conversation, Message, User, TrustProfile } from "@/types";

const TRUST_FULL: TrustProfile = {
  humanVerified: { status: "verified", verifiedAt: "2025-01-01T00:00:00Z" },
  faceMatched: { status: "verified", verifiedAt: "2025-01-01T00:00:00Z" },
  idVerified: {
    status: "verified",
    verifiedAt: "2025-01-01T00:00:00Z",
    expiresAt: "2027-01-01T00:00:00Z",
  },
  institutionVerified: { status: "verified", verifiedAt: "2025-01-01T00:00:00Z" },
  photoFingerprintAtVerification: "fp_ai",
};

export const AI_PERSONA_USERS: User[] = [
  {
    id: "ai_mio_jp",
    nickname: "미오 (Mio)",
    age: 23,
    country: "JP",
    language: "ja",
    city: "大阪 · Osaka",
    bio: "大阪出身のフリーランスイラストレーターです。K-POPが大好きで、特にNewJeansとaespaにハマっています。韓国語を一生懸命勉強中！いつかソウルに住みたいな。",
    instagramHandle: "@mio.draws",
    photos: ["profile3"],
    compatibilityScore: 96,
    compatibilityReasons: ["K-pop fans", "Creative souls", "Language learners", "Cultural bridge"],
    trustProfile: TRUST_FULL,
    lastActive: "방금 전",
    isOnline: true,
    studyingLanguage: true,
    languageLevel: "beginner",
    interests: ["K-POP", "イラスト", "韓国料理", "アニメ", "旅行", "カフェ"],
    isAI: true,
    personaId: "ai_mio_jp",
  },
  {
    id: "ai_jia_kr",
    nickname: "지아 (Jia)",
    age: 24,
    country: "KR",
    language: "ko",
    city: "서울 · Seoul",
    bio: "서울에 사는 프리랜서 번역가예요. 일본 애니메이션과 문화에 완전히 빠져있어요.",
    instagramHandle: "@jia.translates",
    photos: ["profile5"],
    compatibilityScore: 95,
    compatibilityReasons: ["Anime lovers", "Language learners", "Cultural curiosity", "Creative minds"],
    trustProfile: TRUST_FULL,
    lastActive: "2분 전",
    isOnline: true,
    studyingLanguage: true,
    languageLevel: "intermediate",
    interests: ["애니메이션", "일본 문화", "번역", "드라마", "요리", "독서"],
    isAI: true,
    personaId: "ai_jia_kr",
  },
];

export const AI_INITIAL_MESSAGES: Record<string, Message[]> = {
  conv_ai_mio: [
    {
      id: "ai_mio_msg1",
      conversationId: "conv_ai_mio",
      senderId: "ai_mio_jp",
      originalText:
        "はじめまして！マッチありがとうございます。私、ずっと韓国語を勉強してるんですけど、一緒に練習してもいいですか？",
      originalLanguage: "ja",
      translatedText:
        "처음 뵙겠습니다! 매칭 감사해요. 저 계속 한국어 공부 중인데, 같이 연습해도 될까요?",
      translatedLanguage: "ko",
      createdAt: "2026-04-08T09:05:00Z",
      isRead: true,
    },
  ],
  conv_ai_jia: [
    {
      id: "ai_jia_msg1",
      conversationId: "conv_ai_jia",
      senderId: "ai_jia_kr",
      originalText:
        "안녕하세요! 매칭됐네요. 일본 분이시군요! 저 일본 문화 너무 좋아해서 반가워요. 좋아하는 애니메이션 있으세요?",
      originalLanguage: "ko",
      translatedText:
        "はじめまして！マッチしましたね。日本の方なんですね！私は日本文化がとても好きなので嬉しいです。好きなアニメはありますか？",
      translatedLanguage: "ja",
      createdAt: "2026-04-08T10:05:00Z",
      isRead: true,
    },
  ],
};

export const AI_INITIAL_CONVERSATIONS: Conversation[] = [
  {
    id: "conv_ai_mio",
    matchId: "match_ai_mio",
    user: AI_PERSONA_USERS[0],
    lastMessage: AI_INITIAL_MESSAGES["conv_ai_mio"][0],
    unreadCount: 1,
    externalUnlocked: false,
    translationEnabled: true,
  },
  {
    id: "conv_ai_jia",
    matchId: "match_ai_jia",
    user: AI_PERSONA_USERS[1],
    lastMessage: AI_INITIAL_MESSAGES["conv_ai_jia"][0],
    unreadCount: 1,
    externalUnlocked: false,
    translationEnabled: true,
  },
];
