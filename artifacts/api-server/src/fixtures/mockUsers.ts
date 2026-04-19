/**
 * fixtures/mockUsers.ts
 *
 * Static AI persona and demo user fixtures used for:
 *  - Guest/unauthenticated discover feed
 *  - In-memory swipe/match state for mock users
 *  - AI persona chat (Mio, Jia)
 *
 * These fixtures intentionally live outside the route/service layer so they
 * can be imported by both the match module and the coaching module without
 * circular dependencies.
 *
 * Production upgrade path: replace with a seeded Postgres table.
 */

export interface ServerUser {
  id: string;
  nickname: string;
  age: number;
  country: "KR" | "JP";
  language: "ko" | "ja";
  city: string;
  bio: string;
  photos: string[];
  compatibilityScore: number;
  compatibilityReasons: string[];
  lastActive: string;
  isOnline?: boolean;
  studyingLanguage?: boolean;
  languageLevel?: "beginner" | "intermediate" | "advanced";
  interests: string[];
  trustScore: number;
  trustLayers: {
    humanVerified: boolean;
    faceMatched: boolean;
    idVerified: boolean;
    institutionVerified: boolean;
  };
  instagramHandle?: string;
  gender?: "male" | "female" | "other";
  isAI?: boolean;
  personaId?: string;
}

export const AI_MOCK_USERS: ServerUser[] = [
  {
    id: "ai_mio_jp",
    nickname: "미오 (Mio) AI",
    age: 23,
    country: "JP",
    language: "ja",
    city: "東京 · Tokyo",
    bio: "東京在住のAI文化交流パートナーです。韓国語の練習に付き合います。いつでも話しかけてね！\n\nAI cultural exchange partner based in Tokyo. Happy to help you practice Korean anytime!",
    photos: ["profile3"],
    compatibilityScore: 95,
    compatibilityReasons: ["Always available", "Patient teacher", "Cultural insight", "Language practice"],
    lastActive: "방금",
    isOnline: true,
    studyingLanguage: false,
    interests: ["語学交換", "K-POP", "旅行", "料理"],
    trustScore: 100,
    trustLayers: { humanVerified: true, faceMatched: true, idVerified: true, institutionVerified: true },
    gender: "female",
    isAI: true,
    personaId: "ai_mio_jp",
  },
  {
    id: "ai_jia_kr",
    nickname: "지아 (Jia) AI",
    age: 25,
    country: "KR",
    language: "ko",
    city: "서울 · Seoul",
    bio: "서울에 사는 AI 문화 교류 파트너예요. 일본어 연습 언제든지 도와드려요. 편하게 말 걸어요!\n\nAI cultural exchange partner in Seoul. Here to help you practice Japanese whenever you want!",
    photos: ["profile5"],
    compatibilityScore: 93,
    compatibilityReasons: ["Always available", "Warm personality", "Cultural bridge", "Language practice"],
    lastActive: "방금",
    isOnline: true,
    studyingLanguage: false,
    interests: ["일본어", "애니메이션", "카페", "독서"],
    trustScore: 100,
    trustLayers: { humanVerified: true, faceMatched: true, idVerified: true, institutionVerified: true },
    gender: "female",
    isAI: true,
    personaId: "ai_jia_kr",
  },
];

export const DEMO_USERS: ServerUser[] = [
  {
    id: "user1",
    nickname: "유나 (Yuna)",
    age: 26,
    country: "KR",
    language: "ko",
    city: "서울 · Seoul",
    bio: "서울에서 그래픽 디자이너로 일하고 있어요. 일본 문화와 애니메이션을 좋아하고, 도쿄를 꼭 방문하고 싶어요!\n\nGraphic designer based in Seoul. I love Japanese culture and anime — Tokyo is definitely on my bucket list!",
    photos: ["profile1"],
    compatibilityScore: 94,
    compatibilityReasons: ["Creative souls", "Love for travel", "Bilingual ambition", "K-drama fans"],
    lastActive: "2분 전",
    isOnline: true,
    studyingLanguage: true,
    languageLevel: "intermediate",
    interests: ["그래픽 디자인", "라멘", "애니메이션", "여행", "필름 사진"],
    trustScore: 55,
    trustLayers: { humanVerified: true, faceMatched: true, idVerified: false, institutionVerified: false },
    instagramHandle: "@yuna.designs",
    gender: "female",
  },
  {
    id: "user2",
    nickname: "타쿠야 (Takuya)",
    age: 28,
    country: "JP",
    language: "ja",
    city: "東京 · Tokyo",
    bio: "東京でソフトウェアエンジニアをしています。韓国語を勉強中で、ソウルに行ってみたいです！音楽と料理が好きです。\n\nSoftware engineer in Tokyo, studying Korean. I want to visit Seoul and love music and cooking.",
    photos: ["profile2"],
    compatibilityScore: 89,
    compatibilityReasons: ["Tech minds", "Music lovers", "Language learners", "Food enthusiasts"],
    lastActive: "10분 전",
    studyingLanguage: true,
    languageLevel: "beginner",
    interests: ["開発", "ジャズ", "料理", "ランニング", "ゲーム"],
    trustScore: 90,
    trustLayers: { humanVerified: true, faceMatched: true, idVerified: true, institutionVerified: false },
    instagramHandle: "@takuya.dev",
    gender: "male",
  },
  {
    id: "user3",
    nickname: "하나 (Hana)",
    age: 25,
    country: "JP",
    language: "ja",
    city: "京都 · Kyoto",
    bio: "京都出身のフリーランスフォトグラファーです。韓国のカフェ文化に憧れています。読書と写真撮影が趣味です。\n\nFreelance photographer from Kyoto. I'm captivated by Korean café culture. I love reading and photography.",
    photos: ["profile3"],
    compatibilityScore: 87,
    compatibilityReasons: ["Art & photography", "Café culture", "Introspective personalities", "Nature lovers"],
    lastActive: "30분 전",
    studyingLanguage: false,
    languageLevel: "beginner",
    interests: ["写真", "読書", "カフェ", "旅行", "アート"],
    trustScore: 25,
    trustLayers: { humanVerified: true, faceMatched: false, idVerified: false, institutionVerified: false },
    instagramHandle: "@hana.photo",
    gender: "female",
  },
  {
    id: "user4",
    nickname: "지민 (Jimin)",
    age: 27,
    country: "KR",
    language: "ko",
    city: "부산 · Busan",
    bio: "부산 출신의 요리사예요. 일본 요리에 관심이 많고 일본어를 공부하고 있어요. 같이 맛있는 거 먹으러 갈 사람 구해요!\n\nChef from Busan, fascinated by Japanese cuisine and studying Japanese. Looking for someone to share great meals with!",
    photos: ["profile4"],
    compatibilityScore: 82,
    compatibilityReasons: ["Food lovers", "Cultural curiosity", "Language learners", "Adventurous spirits"],
    lastActive: "1시간 전",
    studyingLanguage: true,
    languageLevel: "beginner",
    interests: ["요리", "먹방", "일식", "바다", "음악"],
    trustScore: 100,
    trustLayers: { humanVerified: true, faceMatched: true, idVerified: true, institutionVerified: true },
    instagramHandle: "@jimin.chef",
    gender: "male",
  },
  {
    id: "user5",
    nickname: "아오이 (Aoi)",
    age: 24,
    country: "JP",
    language: "ja",
    city: "大阪 · Osaka",
    bio: "大阪でカフェを経営しています。K-POPが大好きで、韓国語を勉強中です。一緒にカフェ巡りをしませんか？\n\nRunning a café in Osaka. Big K-POP fan, studying Korean. Want to café-hop together?",
    photos: ["profile5"],
    compatibilityScore: 91,
    compatibilityReasons: ["Café culture", "K-POP fans", "Language learners", "Creative personalities"],
    lastActive: "방금",
    isOnline: true,
    studyingLanguage: true,
    languageLevel: "intermediate",
    interests: ["カフェ", "K-POP", "ベーキング", "ファッション", "音楽"],
    trustScore: 100,
    trustLayers: { humanVerified: true, faceMatched: true, idVerified: true, institutionVerified: true },
    instagramHandle: "@aoi.cafe",
    gender: "female",
  },
  {
    id: "user6",
    nickname: "현우 (Hyunwoo)",
    age: 30,
    country: "KR",
    language: "ko",
    city: "서울 · Seoul",
    bio: "서울 의대생이에요. 일본어를 N2 수준까지 공부했고 의학 교류로 일본에도 다녀왔어요. 진지한 만남을 원해요.\n\nMed student in Seoul. Passed JLPT N2 and did a medical exchange in Japan. Looking for something meaningful.",
    photos: ["profile6"],
    compatibilityScore: 78,
    compatibilityReasons: ["Intellectual minds", "Cultural exchange", "Language advanced", "Ambitious goals"],
    lastActive: "3시간 전",
    studyingLanguage: true,
    languageLevel: "advanced",
    interests: ["의학", "독서", "일본어", "등산", "클래식 음악"],
    trustScore: 90,
    trustLayers: { humanVerified: true, faceMatched: true, idVerified: true, institutionVerified: false },
    instagramHandle: "@hyunwoo.md",
    gender: "male",
  },
];

export const ALL_MOCK_USERS = [...AI_MOCK_USERS, ...DEMO_USERS];

// ── In-memory swipe state (guest + AI/demo users) ─────────────────────────────
// Production upgrade path: move to a Redis sorted set or Postgres table.

export const guestLikes: { fromId: string; toId: string }[] = [];
export const guestPasses: { fromId: string; toId: string }[] = [];
export const guestMatches: { id: string; userA: string; userB: string; ts: number }[] = [];

// Seed: every AI/demo user has pre-liked the guest "me" user
ALL_MOCK_USERS.forEach((u) => {
  guestLikes.push({ fromId: u.id, toId: "me" });
});
