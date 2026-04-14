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
    bio: "서울에서 그래픽 디자이너로 일하고 있어요. 일본 문화와 애니메이션을 좋아하고, 도쿄를 꼭 방문하고 싶어요!\n\nGraphic designer based in Seoul. I love Japanese culture and anime — Tokyo is definitely on my bucket list!",
    instagramHandle: "@yuna.designs",
    photos: ["profile1"],
    compatibilityScore: 94,
    compatibilityReasons: ["Creative souls", "Love for travel", "Bilingual ambition", "K-drama fans"],
    trustProfile: TRUST_TWO_LAYERS,
    lastActive: "2분 전",
    isOnline: true,
    studyingLanguage: true,
    languageLevel: "intermediate",
    interests: ["그래픽 디자인", "라멘", "애니메이션", "여행", "필름 사진"],
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
    interests: ["開発", "ジャズ", "料理", "ランニング", "ゲーム"],
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
    interests: ["写真", "カフェ", "読書", "生け花", "伝統文化"],
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
    interests: ["일식", "서핑", "바베큐", "맥주", "축구"],
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
    interests: ["일본 문학", "시티팝", "명상", "영화", "글쓰기"],
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
    interests: ["ジャズ", "ギター", "K-インディ", "夜景", "居酒屋"],
  },
];

// ── AI Test Personas (TEST ONLY — delete before launch) ───────────────────────
export const aiTestUsers: User[] = [
  {
    id: "ai_mio_jp",
    nickname: "미오 (Mio)",
    age: 23,
    country: "JP",
    language: "ja",
    city: "大阪 · Osaka",
    bio: "大阪出身のフリーランスイラストレーターです。K-POPが大好きで、特にNewJeansとaespaにハマっています。韓国語を一生懸命勉強中！いつかソウルに住みたいな。\n\nFreelance illustrator from Osaka. I'm a huge K-pop fan — totally obsessed with NewJeans and aespa. Studying Korean hard every day. I dream of living in Seoul someday!",
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
    bio: "서울에 사는 프리랜서 번역가예요. 일본 애니메이션과 문화에 완전히 빠져있어요. 귀멸의 칼날, 너의 이름은... 다 좋아해요. 일본어 공부 중이고 일본 친구 사귀고 싶어요!\n\nFreelance translator in Seoul. Obsessed with Japanese anime and culture. Demon Slayer, Your Name... love them all. Studying Japanese and would love to make Japanese friends!",
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

export const mockMatches: Match[] = [
  {
    id: "match1",
    userId: "user1",
    matchedAt: "2025-01-05T10:30:00Z",
    isNew: false,
    user: mockUsers[0],
    iceBreaker: "둘 다 창의적인 직업이네요! 서로의 작업물을 보여주면 어떨까요?",
    iceBreakerJa: "お互いクリエイティブなお仕事ですね！作品を見せ合いませんか？",
  },
  {
    id: "match2",
    userId: "user5",
    matchedAt: "2025-01-06T14:20:00Z",
    isNew: true,
    user: mockUsers[4],
    iceBreaker: "일본 문학을 좋아하신다고요? 최근에 읽은 책이 있으신가요?",
    iceBreakerJa: "日本文学がお好きだとか？最近読んだ本はありますか？",
  },
  {
    id: "match3",
    userId: "user3",
    matchedAt: "2025-01-07T09:10:00Z",
    isNew: true,
    user: mockUsers[2],
    iceBreaker: "교토 출신 사진작가님! 필름 카메라로 찍은 사진 있으면 보고 싶어요.",
    iceBreakerJa: "京都出身のフォトグラファーさんですね！フィルムカメラの写真があれば見てみたいです。",
  },
  // ── AI Test Persona Matches (TEST ONLY) ─────────────────────────────────────
  {
    id: "match_ai_mio",
    userId: "ai_mio_jp",
    matchedAt: "2026-04-08T09:00:00Z",
    isNew: false,
    user: aiTestUsers[0],
    iceBreaker: "서로 언어를 교환하면서 친해지면 어떨까요? 저 한국어 배우고 싶어요!",
    iceBreakerJa: "お互いに言語交換しながら仲良くなりませんか？韓国語を学びたいです！",
  },
  {
    id: "match_ai_jia",
    userId: "ai_jia_kr",
    matchedAt: "2026-04-08T10:00:00Z",
    isNew: false,
    user: aiTestUsers[1],
    iceBreaker: "일본 애니메이션 좋아하신다고요? 같이 얘기해요!",
    iceBreakerJa: "日本のアニメがお好きだとか？一緒に語りましょう！",
  },
];

// ── Conv1 messages — expanded for PRS feature testing ───────────────────────
// Timestamps are realistic (reply gaps 5-15 min in-session, 8h gap between days)
// Covers: questions, validation, topic continuation, warmth, future orientation.
// Locale pair: JP (me) ↔ KR (user1)
export const mockMessages: Message[] = [
  // ── Day 1 Session 1 (11:00 ~ 12:15) ────────────────────────────────────────
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
  // user1 follows up with a question + validation → followUpQuestionRate ↑, validationScore ↑
  {
    id: "msg3",
    conversationId: "conv1",
    senderId: "user1",
    originalText: "와, 대단해요! 한국어 잘 하시나요? 저도 일본어 배우고 싶어요.",
    originalLanguage: "ko",
    translatedText: "わあ、すごいですね！韓国語はお上手ですか？私も日本語を学びたいです。",
    translatedLanguage: "ja",
    createdAt: "2025-01-05T11:12:00Z",
    isRead: true,
  },
  {
    id: "msg4",
    conversationId: "conv1",
    senderId: CURRENT_USER_ID,
    originalText: "まだ初心者ですが、一緒に練習しませんか？",
    originalLanguage: "ja",
    createdAt: "2025-01-05T11:18:00Z",
    isRead: true,
  },
  // user1 responds quickly + warmth cue + future orientation → warmthScore ↑, futureOrientation ↑
  {
    id: "msg5",
    conversationId: "conv1",
    senderId: "user1",
    originalText: "물론이죠! 언어 교환 파트너가 되면 좋겠어요. 다음에 같이 공부해요!",
    originalLanguage: "ko",
    translatedText: "もちろんです！言語交換パートナーになれたら嬉しいです。今度一緒に勉強しましょう！",
    translatedLanguage: "ja",
    createdAt: "2025-01-05T11:23:00Z",
    isRead: true,
  },
  {
    id: "msg6",
    conversationId: "conv1",
    senderId: CURRENT_USER_ID,
    originalText: "嬉しいです！どんな勉強法が好きですか？私はドラマで覚えるのが好きです。",
    originalLanguage: "ja",
    createdAt: "2025-01-05T11:29:00Z",
    isRead: true,
  },
  // user1 continues topic + asks back → contingentReplyScore ↑, topicAlignment ↑
  {
    id: "msg7",
    conversationId: "conv1",
    senderId: "user1",
    originalText: "저도요! 드라마로 배우는 게 제일 재밌어요. 요즘 좋아하는 드라마 있어요?",
    originalLanguage: "ko",
    translatedText: "私もです！ドラマで学ぶのが一番楽しいです。最近好きなドラマはありますか？",
    translatedLanguage: "ja",
    createdAt: "2025-01-05T11:36:00Z",
    isRead: true,
  },
  {
    id: "msg8",
    conversationId: "conv1",
    senderId: CURRENT_USER_ID,
    originalText: "「이상한 변호사 우영우」が大好きです！見ましたか？",
    originalLanguage: "ja",
    createdAt: "2025-01-05T11:42:00Z",
    isRead: true,
  },
  // user1 references drama title directly → contingentReplyScore ↑
  {
    id: "msg9",
    conversationId: "conv1",
    senderId: "user1",
    originalText: "우영우 저도 봤어요! 너무 감동적이지 않았나요? 그 펭수 장면은 진짜 웃겼어요 😂",
    originalLanguage: "ko",
    translatedText: "ウヨンウ私も見ました！すごく感動的じゃなかったですか？ペンスのシーンは本当に面白かったです 😂",
    translatedLanguage: "ja",
    createdAt: "2025-01-05T11:48:00Z",
    isRead: true,
  },
  {
    id: "msg10",
    conversationId: "conv1",
    senderId: CURRENT_USER_ID,
    originalText: "ほんとに！鯨のシーンも好きでした。他に好きな韓国のコンテンツはありますか？",
    originalLanguage: "ja",
    createdAt: "2025-01-05T11:55:00Z",
    isRead: true,
  },
  {
    id: "msg11",
    conversationId: "conv1",
    senderId: "user1",
    originalText: "K-pop도 많이 들어요! BTS 좋아하시나요? 아니면 다른 그룹?",
    originalLanguage: "ko",
    translatedText: "K-popもよく聴きます！BTSはお好きですか？それとも他のグループ？",
    translatedLanguage: "ja",
    createdAt: "2025-01-05T12:02:00Z",
    isRead: true,
  },
  {
    id: "msg12",
    conversationId: "conv1",
    senderId: CURRENT_USER_ID,
    originalText: "BTSも好きですが、最近はNewJeansにはまっています！",
    originalLanguage: "ja",
    createdAt: "2025-01-05T12:08:00Z",
    isRead: true,
  },
  // user1 re-engages after a short gap — session continues
  {
    id: "msg13",
    conversationId: "conv1",
    senderId: "user1",
    originalText: "오 NewJeans 최고예요! 'Ditto'는 너무 좋아요. 혹시 서울 오시면 연락해요!",
    originalLanguage: "ko",
    translatedText: "NewJeansは最高です！'Ditto'はすごく好きです。もしソウルに来たら連絡してください！",
    translatedLanguage: "ja",
    createdAt: "2025-01-05T12:15:00Z",
    isRead: true,
  },

  // ── Day 2 Session 2 — user1 re-initiates after 8h gap ──────────────────────
  // partnerReinitiation ↑ (partner opens new session)
  {
    id: "msg14",
    conversationId: "conv1",
    senderId: "user1",
    originalText: "안녕하세요! 오늘 하루 어땠어요? 저는 일본어 공부 좀 했어요 😊",
    originalLanguage: "ko",
    translatedText: "こんにちは！今日はどうでしたか？私は日本語の勉強をしました 😊",
    translatedLanguage: "ja",
    createdAt: "2025-01-06T09:10:00Z",
    isRead: true,
  },
  {
    id: "msg15",
    conversationId: "conv1",
    senderId: CURRENT_USER_ID,
    originalText: "こんにちは！私も昨日の韓国語の単語を復習しました。何を勉強しましたか？",
    originalLanguage: "ja",
    createdAt: "2025-01-06T09:22:00Z",
    isRead: true,
  },
  // availability sharing → availabilitySharing ↑
  {
    id: "msg16",
    conversationId: "conv1",
    senderId: "user1",
    originalText: "어제 배운 단어들 연습했어요! 주말에 시간 되면 같이 언어 교환 어때요?",
    originalLanguage: "ko",
    translatedText: "昨日習った単語を練習しました！週末に時間があれば一緒に言語交換はどうですか？",
    translatedLanguage: "ja",
    createdAt: "2025-01-06T09:30:00Z",
    isRead: true,
  },
  {
    id: "msg17",
    conversationId: "conv1",
    senderId: CURRENT_USER_ID,
    originalText: "いいですね！週末の午後なら大丈夫です。ビデオ通話で話しましょうか？",
    originalLanguage: "ja",
    createdAt: "2025-01-06T09:38:00Z",
    isRead: true,
  },
  // call acceptance → callOrDateAcceptance ↑
  {
    id: "msg18",
    conversationId: "conv1",
    senderId: "user1",
    originalText: "영상통화 좋아요! 토요일 오후 3시 어때요? 그때 서울은 괜찮을 것 같아요.",
    originalLanguage: "ko",
    translatedText: "ビデオ通話いいですね！土曜日の午後3時はいかがですか？その時間ソウルは大丈夫そうです。",
    translatedLanguage: "ja",
    createdAt: "2025-01-06T09:45:00Z",
    isRead: true,
  },
  {
    id: "msg19",
    conversationId: "conv1",
    senderId: CURRENT_USER_ID,
    originalText: "土曜日の午後3時、完璧です！楽しみにしています。",
    originalLanguage: "ja",
    createdAt: "2025-01-06T09:52:00Z",
    isRead: true,
  },
  // user1 warmth + specificity → warmthScore ↑, authenticityScore ↑
  {
    id: "msg20",
    conversationId: "conv1",
    senderId: "user1",
    originalText: "저도 기대돼요! 그때까지 더 열심히 일본어 공부할게요 💪 감사해요!",
    originalLanguage: "ko",
    translatedText: "私も楽しみです！それまでもっと頑張って日本語を勉強します 💪 ありがとうございます！",
    translatedLanguage: "ja",
    createdAt: "2025-01-06T09:58:00Z",
    isRead: false,
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

// ── AI Persona initial messages (TEST ONLY) ───────────────────────────────────
export const mockMessagesAiMio: Message[] = [
  {
    id: "ai_mio_msg1",
    conversationId: "conv_ai_mio",
    senderId: "ai_mio_jp",
    originalText: "はじめまして！マッチありがとうございます。私、ずっと韓国語を勉強してるんですけど、一緒に練習してもいいですか？",
    originalLanguage: "ja",
    translatedText: "처음 뵙겠습니다! 매칭 감사해요. 저 계속 한국어 공부 중인데, 같이 연습해도 될까요?",
    translatedLanguage: "ko",
    createdAt: "2026-04-08T09:05:00Z",
    isRead: true,
  },
];

export const mockMessagesAiJia: Message[] = [
  {
    id: "ai_jia_msg1",
    conversationId: "conv_ai_jia",
    senderId: "ai_jia_kr",
    originalText: "안녕하세요! 매칭됐네요. 일본 분이시군요! 저 일본 문화 너무 좋아해서 반가워요. 좋아하는 애니메이션 있으세요?",
    originalLanguage: "ko",
    translatedText: "はじめまして！マッチしましたね。日本の方なんですね！私は日本文化がとても好きなので嬉しいです。好きなアニメはありますか？",
    translatedLanguage: "ja",
    createdAt: "2026-04-08T10:05:00Z",
    isRead: true,
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
    unlockRequestState: "received",
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
  // ── AI Test Persona Conversations (TEST ONLY) ──────────────────────────────
  {
    id: "conv_ai_mio",
    matchId: "match_ai_mio",
    user: aiTestUsers[0],
    lastMessage: mockMessagesAiMio[0],
    unreadCount: 1,
    externalUnlocked: false,
    translationEnabled: true,
  },
  {
    id: "conv_ai_jia",
    matchId: "match_ai_jia",
    user: aiTestUsers[1],
    lastMessage: mockMessagesAiJia[0],
    unreadCount: 1,
    externalUnlocked: false,
    translationEnabled: true,
  },
];

export const myProfile: MyProfile = {
  id: CURRENT_USER_ID,
  nickname: "Alex",
  age: 27,
  country: "JP",
  language: "ja",
  intro: "UI/UXデザイナー · K-popと韓国映画が大好き",
  introI18n: {
    ko: "UI/UX 디자이너 · K-pop과 한국 영화를 정말 좋아해요",
    ja: "UI/UXデザイナー · K-popと韓国映画が大好き",
  },
  bio: "東京在住のUI/UXデザイナーです。韓国文化が大好きで、Kポップと韓国映画にはまっています。\n\nUI/UX designer living in Tokyo. I love Korean culture and am obsessed with K-pop and Korean cinema.",
  languageLevel: "intermediate",
  interests: ["K-POP", "韓国ドラマ", "デザイン", "写真", "旅行", "カフェ", "料理"],
  instagramHandle: "@alex.creates",
  photos: [],
  aiStyleSummary: {
    ko: "프로필에서 창의적인 에너지와 문화에 대한 호기심이 느껴져요. 꾸밈없는 모습을 잘 표현하고 있고, 다른 문화와 연결되고 싶은 열정이 자연스럽게 전달됩니다. 팁: 작업 공간이나 취미 관련 사진을 추가하면 대화 시작이 더 쉬워질 거예요.",
    ja: "プロフィールからはクリエイティブなエネルギーと文化への好奇心が伝わります。飾らない自分を出していて、異文化との繋がりへの情熱が自然に感じられます。ヒント：クリエイティブな作業スペースの写真を追加すると、話のきっかけが増えるかもしれません。",
  },
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
