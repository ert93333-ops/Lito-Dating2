import { User, Match, Message, Conversation, MyProfile, TrustProfile } from "@/types";

export const CURRENT_USER_ID = "me";

// ── Preset trust profiles (covers all 5 TrustStatus states for demo variety) ──

const TRUST_FULL: TrustProfile = {
  humanVerified:       { status: "verified",  verifiedAt: "2025-01-01T00:00:00Z" },
  faceMatched:         { status: "verified",  verifiedAt: "2025-01-01T00:00:00Z" },
  idVerified:          { status: "verified",  verifiedAt: "2025-01-01T00:00:00Z", expiresAt: "2027-01-01T00:00:00Z" },
  institutionVerified: { status: "verified",  verifiedAt: "2025-01-01T00:00:00Z" },
  photoFingerprintAtVerification: "fp_profile5",
};

const TRUST_THREE_LAYERS: TrustProfile = {
  humanVerified: { status: "verified", verifiedAt: "2025-01-02T00:00:00Z" },
  faceMatched:   { status: "verified", verifiedAt: "2025-01-02T00:00:00Z" },
  idVerified:    { status: "verified", verifiedAt: "2025-01-02T00:00:00Z", expiresAt: "2027-01-02T00:00:00Z" },
  photoFingerprintAtVerification: "fp_profile2",
};

const TRUST_TWO_LAYERS: TrustProfile = {
  humanVerified: { status: "verified",     verifiedAt: "2025-01-03T00:00:00Z" },
  faceMatched:   { status: "verified",     verifiedAt: "2025-01-03T00:00:00Z" },
  idVerified:    { status: "not_verified" },
  photoFingerprintAtVerification: "fp_profile1",
};

const TRUST_HUMAN_ONLY: TrustProfile = {
  humanVerified: { status: "verified",     verifiedAt: "2025-01-04T00:00:00Z" },
  faceMatched:   { status: "not_verified" },
  idVerified:    { status: "not_verified" },
};

const TRUST_NONE: TrustProfile = {
  humanVerified: { status: "not_verified" },
  faceMatched:   { status: "not_verified" },
  idVerified:    { status: "not_verified" },
};

// pending_review: ID document submitted, waiting for backend review
const TRUST_ID_PENDING: TrustProfile = {
  humanVerified: { status: "verified",      verifiedAt: "2025-01-05T00:00:00Z" },
  faceMatched:   { status: "verified",      verifiedAt: "2025-01-05T00:00:00Z" },
  idVerified:    { status: "pending_review", submittedAt: "2026-04-05T10:30:00Z" },
  photoFingerprintAtVerification: "fp_profile6",
};

// rejected: ID document was submitted but rejected (bad quality, mismatch, etc.)
const TRUST_ID_REJECTED: TrustProfile = {
  humanVerified: { status: "verified",  verifiedAt: "2025-01-06T00:00:00Z" },
  faceMatched:   { status: "verified",  verifiedAt: "2025-01-06T00:00:00Z" },
  idVerified:    {
    status: "rejected",
    rejectionReason: "document_unreadable",
  },
  photoFingerprintAtVerification: "fp_profile3",
};

// reverify_required: previously verified, but photo changed → face re-verify needed
const TRUST_FACE_REVERIFY: TrustProfile = {
  humanVerified: { status: "verified",          verifiedAt: "2025-01-07T00:00:00Z" },
  faceMatched:   { status: "reverify_required"  },
  idVerified:    { status: "verified",          verifiedAt: "2025-01-07T00:00:00Z", expiresAt: "2027-01-07T00:00:00Z" },
  photoFingerprintAtVerification: "fp_profile4_old",
};

// ── Mock users ─────────────────────────────────────────────────────────────────

export const mockUsers: User[] = [
  {
    id: "user1",
    nickname: "유나 (Yuna)",
    age: 26,
    country: "KR",
    language: "ko",
    city: "서울 · Seoul",
    bio: "서울에서 그래픽 디자이너로 일하고 있어요. 일본 문화와 애니메이션을 좋아하고, 도쿄를 꼭 방문하고 싶어요! ☀️\n\nGraphic designer based in Seoul. I love Japanese culture and anime — Tokyo is definitely on my bucket list!",
    instagramHandle: "@yuna.designs",
    photos: ["profile1"],
    compatibilityScore: 94,
    compatibilityReasons: ["Creative souls", "Love for travel", "Bilingual ambition", "K-drama fans"],
    trustProfile: TRUST_TWO_LAYERS,
    lastActive: "2분 전",
    isOnline: true,
    studyingLanguage: true,
    languageLevel: "intermediate",
    interests: ["🎨 그래픽 디자인", "🍜 라멘", "🎌 애니메이션", "✈️ 여행", "📷 필름 사진"],
  },
  {
    id: "user2",
    nickname: "타쿠야 (Takuya)",
    age: 28,
    country: "JP",
    language: "ja",
    city: "東京 · Tokyo",
    bio: "東京でソフトウェアエンジニアをしています。韓国語を勉強中で、ソウルに行ってみたいです！音楽と料理が好きです。\n\nSoftware engineer in Tokyo, studying Korean. I want to visit Seoul and love music and cooking.",
    instagramHandle: "@takuya.dev",
    photos: ["profile2"],
    compatibilityScore: 89,
    compatibilityReasons: ["Tech minds", "Music lovers", "Language learners", "Food enthusiasts"],
    trustProfile: TRUST_THREE_LAYERS,
    lastActive: "10분 전",
    studyingLanguage: true,
    languageLevel: "beginner",
    interests: ["💻 개발", "🎵 재즈", "🍳 요리", "🏃 달리기", "🎮 게임"],
  },
  {
    id: "user3",
    nickname: "하나 (Hana)",
    age: 25,
    country: "JP",
    language: "ja",
    city: "京都 · Kyoto",
    bio: "京都出身のフリーランスフォトグラファーです。韓国のカフェ文化に憧れています。読書と写真撮影が趣味です。\n\nFreelance photographer from Kyoto. I'm captivated by Korean café culture. I love reading and photography.",
    instagramHandle: "@hana.photo",
    photos: ["profile3"],
    compatibilityScore: 87,
    compatibilityReasons: ["Art & photography", "Café culture", "Introspective personalities", "Nature lovers"],
    trustProfile: TRUST_HUMAN_ONLY,
    lastActive: "1시간 전",
    studyingLanguage: false,
    interests: ["📷 사진", "☕ 카페", "📚 독서", "🌸 꽃꽂이", "🎋 전통문화"],
  },
  {
    id: "user4",
    nickname: "지훈 (Jihoon)",
    age: 29,
    country: "KR",
    language: "ko",
    city: "부산 · Busan",
    bio: "부산 출신의 요리사입니다. 일본 요리에 관심이 많고, 오사카 맛집 투어를 꿈꾸고 있어요. 음식으로 이어지는 인연!\n\nChef from Busan with a deep love for Japanese cuisine. Dreaming of a food tour in Osaka. Connections over food!",
    instagramHandle: "@jihoon.kitchen",
    photos: ["profile4"],
    compatibilityScore: 82,
    compatibilityReasons: ["Foodie spirits", "Coastal hearts", "Cultural curiosity", "Active lifestyle"],
    trustProfile: TRUST_NONE,
    lastActive: "3시간 전",
    studyingLanguage: true,
    languageLevel: "beginner",
    interests: ["🍣 일식", "🏄 서핑", "🔥 바베큐", "🍺 맥주", "⚽ 축구"],
  },
  {
    id: "user5",
    nickname: "수진 (Soojin)",
    age: 27,
    country: "KR",
    language: "ko",
    city: "서울 · Seoul",
    bio: "서울대 심리학 박사과정입니다. 마음을 연결하는 것에 관심이 많아요. 일본 문학과 히키 음악을 사랑합니다.\n\nPsychology PhD student at Seoul National University. I care deeply about human connection. Love Japanese literature and city pop music.",
    instagramHandle: "@soojin.reads",
    photos: ["profile5"],
    compatibilityScore: 91,
    compatibilityReasons: ["Deep thinkers", "Literature lovers", "City pop fans", "Emotionally intelligent"],
    trustProfile: TRUST_FULL,
    lastActive: "방금 전",
    isOnline: true,
    studyingLanguage: true,
    languageLevel: "advanced",
    interests: ["📖 일본 문학", "🎵 시티팝", "🧘 명상", "🎬 영화", "🖊️ 글쓰기"],
  },
  {
    id: "user6",
    nickname: "렌 (Ren)",
    age: 30,
    country: "JP",
    language: "ja",
    city: "大阪 · Osaka",
    bio: "大阪でジャズミュージシャンをしています。韓国のインディー音楽シーンに刺激を受けています。音楽で国境を越えたい！\n\nJazz musician in Osaka. Inspired by Korea's indie music scene. Music transcends borders!",
    instagramHandle: "@ren.jazz",
    photos: ["profile6"],
    compatibilityScore: 85,
    compatibilityReasons: ["Musical souls", "Creative freedom", "Night owls", "Cultural bridges"],
    trustProfile: TRUST_ID_PENDING,
    lastActive: "30분 전",
    studyingLanguage: true,
    languageLevel: "intermediate",
    interests: ["🎷 재즈", "🎸 기타", "🎤 K-인디", "🌙 야경", "🍻 이자카야"],
  },
];

export const mockMatches: Match[] = [
  {
    id: "match1",
    userId: "user1",
    matchedAt: "2025-01-05T10:30:00Z",
    isNew: false,
    user: mockUsers[0],
    iceBreaker: "둘 다 창의적인 직업이네요! 서로의 작업물을 보여주면 어떨까요? 🎨",
  },
  {
    id: "match2",
    userId: "user5",
    matchedAt: "2025-01-06T14:20:00Z",
    isNew: true,
    user: mockUsers[4],
    iceBreaker: "일본 문학을 좋아하신다고요? 최근에 읽은 책이 있으신가요? 📖",
  },
  {
    id: "match3",
    userId: "user3",
    matchedAt: "2025-01-07T09:10:00Z",
    isNew: true,
    user: mockUsers[2],
    iceBreaker: "교토 출신 사진작가님! 필름 카메라로 찍은 사진 있으면 보고 싶어요 📷",
  },
];

export const mockMessages: Message[] = [
  {
    id: "msg1",
    conversationId: "conv1",
    senderId: "user1",
    originalText: "안녕하세요! 처음 뵙겠습니다. 일본에서 오셨나요?",
    originalLanguage: "ko",
    translatedText: "はじめまして！日本から来られましたか？",
    translatedLanguage: "ja",
    createdAt: "2025-01-05T11:00:00Z",
    isRead: true,
  },
  {
    id: "msg2",
    conversationId: "conv1",
    senderId: CURRENT_USER_ID,
    originalText: "はい、東京出身です！ソウルに興味があります。",
    originalLanguage: "ja",
    createdAt: "2025-01-05T11:05:00Z",
    isRead: true,
  },
  {
    id: "msg3",
    conversationId: "conv1",
    senderId: "user1",
    originalText: "와, 대단해요! 한국어 잘 하시나요? 저도 일본어 배우고 싶어요.",
    originalLanguage: "ko",
    translatedText: "わあ、すごいですね！韓国語はお上手ですか？私も日本語を学びたいです。",
    translatedLanguage: "ja",
    createdAt: "2025-01-05T11:10:00Z",
    isRead: true,
  },
  {
    id: "msg4",
    conversationId: "conv1",
    senderId: CURRENT_USER_ID,
    originalText: "まだ初心者ですが、一緒に練習しませんか？🌸",
    originalLanguage: "ja",
    createdAt: "2025-01-05T11:15:00Z",
    isRead: true,
  },
  {
    id: "msg5",
    conversationId: "conv1",
    senderId: "user1",
    originalText: "물론이죠! 언어 교환 파트너가 되면 좋겠어요 ✨",
    originalLanguage: "ko",
    translatedText: "もちろんです！言語交換パートナーになれたら嬉しいです ✨",
    translatedLanguage: "ja",
    createdAt: "2025-01-05T12:00:00Z",
    isRead: true,
  },
  {
    id: "msg6",
    conversationId: "conv1",
    senderId: "user1",
    originalText: "아직 초보자이지만, 같이 연습하지 않으실래요?",
    originalLanguage: "ko",
    translatedText: "まだ初心者ですが、一緒に練習しませんか？",
    translatedLanguage: "ja",
    createdAt: "2025-01-05T12:05:00Z",
    isRead: true,
  },
];

export const mockMessagesConv3: Message[] = [
  {
    id: "conv3msg1",
    conversationId: "conv3",
    senderId: "user3",
    originalText: "こんにちは！プロフィールを見て、すごく素敵だと思いました。",
    originalLanguage: "ja",
    createdAt: "2025-01-07T09:30:00Z",
    isRead: true,
  },
  {
    id: "conv3msg2",
    conversationId: "conv3",
    senderId: CURRENT_USER_ID,
    originalText: "ありがとうございます！京都出身なんですね、素敵な街ですよね。",
    originalLanguage: "ja",
    createdAt: "2025-01-07T09:45:00Z",
    isRead: true,
  },
  {
    id: "conv3msg3",
    conversationId: "conv3",
    senderId: "user3",
    originalText: "韓国のカフェ文化にとても憧れています。ソウルのおすすめのカフェはありますか？",
    originalLanguage: "ja",
    createdAt: "2025-01-07T10:00:00Z",
    isRead: false,
  },
];

export const mockConversations: Conversation[] = [
  {
    id: "conv1",
    matchId: "match1",
    user: mockUsers[0],
    lastMessage: mockMessages[mockMessages.length - 1],
    unreadCount: 1,
    externalUnlocked: false,
    translationEnabled: true,
  },
  {
    id: "conv2",
    matchId: "match2",
    user: mockUsers[4],
    lastMessage: undefined,
    unreadCount: 0,
    externalUnlocked: false,
    translationEnabled: false,
  },
  {
    id: "conv3",
    matchId: "match3",
    user: mockUsers[2],
    lastMessage: mockMessagesConv3[mockMessagesConv3.length - 1],
    unreadCount: 1,
    externalUnlocked: false,
    translationEnabled: false,
  },
];

export const myProfile: MyProfile = {
  id: CURRENT_USER_ID,
  nickname: "Alex",
  age: 27,
  country: "JP",
  language: "ja",
  intro: "UI/UXデザイナー · K-popと韓国映画が大好き",
  bio: "東京在住のUI/UXデザイナーです。韓国文化が大好きで、Kポップと韓国映画にはまっています。\n\nUI/UX designer living in Tokyo. I love Korean culture and am obsessed with K-pop and Korean cinema.",
  languageLevel: "intermediate",
  interests: ["K-Pop", "Korean Drama", "UI Design", "Photography", "Travel", "Coffee", "Cooking"],
  instagramHandle: "@alex.creates",
  photos: [],
  aiStyleSummary: "Your profile radiates creative energy and cultural curiosity. You lead with authenticity — your love for cross-cultural connection comes through naturally. Tip: Adding a photo of your creative workspace could spark great conversation starters.",
  // humanVerified done · face/ID not started yet → user can go to verify-id screen to start
  trustProfile: {
    humanVerified: { status: "verified",     verifiedAt: "2025-01-10T00:00:00Z" },
    faceMatched:   { status: "not_verified" },
    idVerified:    { status: "not_verified" },
  },
};

// ── Exported presets (used by verify-id.tsx dev helpers & tests) ───────────────
export {
  TRUST_FULL,
  TRUST_THREE_LAYERS,
  TRUST_TWO_LAYERS,
  TRUST_HUMAN_ONLY,
  TRUST_NONE,
  TRUST_ID_PENDING,
  TRUST_ID_REJECTED,
  TRUST_FACE_REVERIFY,
};
