import { Router } from "express";
import { optionalAuth } from "../middleware/auth";

const router = Router();

// ── In-memory store (MVP — no DB required) ────────────────────────────────────
// Keyed by viewerId (in production: JWT sub / session user ID)
// For demo: we use a single viewer ID "me"

interface Like {
  fromId: string;
  toId: string;
  ts: number;
}

interface PassRecord {
  fromId: string;
  toId: string;
  ts: number;
}

interface MatchRecord {
  id: string;
  userA: string;
  userB: string;
  ts: number;
}

const likes: Like[] = [];
const passes: PassRecord[] = [];
const matches: MatchRecord[] = [];

// ── Demo: pre-seed incoming likes so "me" gets instant matches on swipe ──────
// In production this would be driven by real mutual activity.
// These simulate users who already liked "me" before they open the app.
["user1", "user2", "user3", "user4", "user5", "user6", "ai_mio_jp", "ai_jia_kr"].forEach((uid) => {
  likes.push({ fromId: uid, toId: "me", ts: Date.now() });
});

// ── Server-side user profiles ─────────────────────────────────────────────────
// Photo IDs map to local assets in the app (profile1 → require("@/assets/images/profile1.jpg"))
// compatibilityScore is computed client-side for personalisation; we send a base value.

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
  isAI?: boolean;
  personaId?: string;
}

const SERVER_USERS: ServerUser[] = [
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
  },
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
    isAI: true,
    personaId: "ai_jia_kr",
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function hasMutualLike(aId: string, bId: string): boolean {
  const aLikedB = likes.some((l) => l.fromId === aId && l.toId === bId);
  const bLikedA = likes.some((l) => l.fromId === bId && l.toId === aId);
  return aLikedB && bLikedA;
}

function alreadyMatched(aId: string, bId: string): boolean {
  return matches.some(
    (m) =>
      (m.userA === aId && m.userB === bId) ||
      (m.userA === bId && m.userB === aId)
  );
}

// ── GET /api/users/discover ───────────────────────────────────────────────────
// Returns users the viewer hasn't liked or passed, filtered by optional params.
// Query params:
//   viewerId  (string, required for demo — defaults to "me")
//   country   (KR|JP|all, default: all)
//   minAge    (number)
//   maxAge    (number)
//   langLevel (beginner|intermediate|advanced|all)
//   limit     (number, default: 20)
//   offset    (number, default: 0)

router.get("/users/discover", optionalAuth, (req, res) => {
  const viewerId = req.user ? `user:${req.user.userId}` : (req.query.viewerId as string) || "me";
  const country = (req.query.country as string) || "all";
  const minAge = req.query.minAge ? Number(req.query.minAge) : 18;
  const maxAge = req.query.maxAge ? Number(req.query.maxAge) : 99;
  const langLevel = (req.query.langLevel as string) || "all";
  const limit = Math.min(Number(req.query.limit) || 20, 50);
  const offset = Number(req.query.offset) || 0;

  const seenIds = new Set([
    ...likes.filter((l) => l.fromId === viewerId).map((l) => l.toId),
    ...passes.filter((p) => p.fromId === viewerId).map((p) => p.toId),
    viewerId,
  ]);

  let pool = SERVER_USERS.filter((u) => {
    if (seenIds.has(u.id)) return false;
    if (u.age < minAge || u.age > maxAge) return false;
    if (country !== "all" && u.country !== country) return false;
    if (langLevel !== "all" && u.languageLevel !== langLevel) return false;
    return true;
  });

  // Sort: AI users always first, then by compatibilityScore desc
  pool.sort((a, b) => {
    if (a.isAI && !b.isAI) return -1;
    if (!a.isAI && b.isAI) return 1;
    return b.compatibilityScore - a.compatibilityScore;
  });

  const total = pool.length;
  const page = pool.slice(offset, offset + limit);

  res.json({ users: page, total, offset, limit });
});

// ── POST /api/users/:id/like ──────────────────────────────────────────────────
// Records a like. Returns { matched: boolean, matchId?: string, matchedUser?: ServerUser }

router.post("/users/:id/like", optionalAuth, (req, res) => {
  const toId = req.params.id;
  const viewerId = req.user ? `user:${req.user.userId}` : (req.body?.viewerId as string) || "me";

  const target = SERVER_USERS.find((u) => u.id === toId);
  if (!target) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const alreadyLiked = likes.some((l) => l.fromId === viewerId && l.toId === toId);
  if (!alreadyLiked) {
    likes.push({ fromId: viewerId, toId, ts: Date.now() });
  }

  // Check for mutual match
  const mutual = hasMutualLike(viewerId, toId) && !alreadyMatched(viewerId, toId);
  let matchId: string | undefined;

  if (mutual) {
    matchId = `match_${viewerId}_${toId}_${Date.now()}`;
    matches.push({ id: matchId, userA: viewerId, userB: toId, ts: Date.now() });
    console.log(`[users] New match: ${viewerId} <-> ${toId} (${matchId})`);
  }

  res.json({
    liked: true,
    matched: mutual,
    matchId: matchId ?? null,
    matchedUser: mutual ? target : null,
  });
});

// ── POST /api/users/:id/pass ──────────────────────────────────────────────────
// Records a pass.

router.post("/users/:id/pass", optionalAuth, (req, res) => {
  const toId = req.params.id;
  const viewerId = req.user ? `user:${req.user.userId}` : (req.body?.viewerId as string) || "me";

  const alreadyPassed = passes.some((p) => p.fromId === viewerId && p.toId === toId);
  if (!alreadyPassed) {
    passes.push({ fromId: viewerId, toId, ts: Date.now() });
  }

  res.json({ passed: true });
});

// ── GET /api/users/matches ────────────────────────────────────────────────────
// Returns all matched users for the viewer.

router.get("/users/matches", (req, res) => {
  const viewerId = (req.query.viewerId as string) || "me";

  const userMatches = matches
    .filter((m) => m.userA === viewerId || m.userB === viewerId)
    .map((m) => {
      const partnerId = m.userA === viewerId ? m.userB : m.userA;
      const partner = SERVER_USERS.find((u) => u.id === partnerId);
      return partner ? { matchId: m.id, matchedAt: m.ts, user: partner } : null;
    })
    .filter(Boolean);

  res.json({ matches: userMatches });
});

// ── GET /api/users/:id ────────────────────────────────────────────────────────
// Returns a single user profile.

router.get("/users/:id", (req, res) => {
  const user = SERVER_USERS.find((u) => u.id === req.params.id);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json(user);
});

// ── POST /api/users/:id/like-back ─────────────────────────────────────────────
// Simulate the other user liking back (for demo/testing — creates a match)

router.post("/users/:id/like-back", (req, res) => {
  const fromId = req.params.id;
  const toId = (req.body?.viewerId as string) || "me";

  const alreadyLiked = likes.some((l) => l.fromId === fromId && l.toId === toId);
  if (!alreadyLiked) {
    likes.push({ fromId, toId, ts: Date.now() });
  }

  const mutual = hasMutualLike(toId, fromId) && !alreadyMatched(toId, fromId);
  let matchId: string | undefined;

  if (mutual) {
    matchId = `match_${toId}_${fromId}_${Date.now()}`;
    matches.push({ id: matchId, userA: toId, userB: fromId, ts: Date.now() });
  }

  res.json({ liked: true, matched: mutual, matchId: matchId ?? null });
});

// ── POST /api/users/reset ─────────────────────────────────────────────────────
// Reset all likes/passes/matches for the viewer (dev/demo only)

router.post("/users/reset", (req, res) => {
  const viewerId = (req.body?.viewerId as string) || "me";
  const before = {
    likes: likes.filter((l) => l.fromId === viewerId).length,
    passes: passes.filter((p) => p.fromId === viewerId).length,
    matches: matches.filter((m) => m.userA === viewerId || m.userB === viewerId).length,
  };

  const removeLikes = likes.splice(0, likes.length, ...likes.filter((l) => l.fromId !== viewerId));
  const removePasses = passes.splice(0, passes.length, ...passes.filter((p) => p.fromId !== viewerId));
  const removeMatches = matches.splice(0, matches.length, ...matches.filter((m) => m.userA !== viewerId && m.userB !== viewerId));

  console.log(`[users/reset] Cleared viewer=${viewerId}:`, before);
  res.json({ reset: true, cleared: before });
});

export default router;
