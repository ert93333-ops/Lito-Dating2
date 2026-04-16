import { Router } from "express";
import { and, eq, notInArray, or, gte, lte, sql } from "drizzle-orm";
import { db, users, userProfiles, swipeLikes, swipePasses, matchesTable } from "@workspace/db";
import { optionalAuth, requireAuth } from "../middleware/auth";

const router = Router();

// ── Feature Flag: AI 페르소나 및 데모 유저 활성화 여부 ──────────────────────────
// 프로덕션에서는 ENABLE_AI_PERSONAS=false로 설정하여 AI/데모 유저를 완전히 숨깁니다.
const ENABLE_AI_PERSONAS = (process.env.ENABLE_AI_PERSONAS ?? "false").toLowerCase() === "true";
const ENABLE_DEMO_USERS = (process.env.ENABLE_DEMO_USERS ?? "false").toLowerCase() === "true";

// ── ServerUser 타입 ────────────────────────────────────────────────────────────

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

// ── 목업 AI 페르소나 + 데모 유저 (항상 풀에 포함) ─────────────────────────────

const AI_MOCK_USERS: ServerUser[] = [
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

const DEMO_USERS: ServerUser[] = [
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
];

// 인증 없는 게스트용 인메모리 스와이프 기록
const guestLikes: { fromId: string; toId: string }[] = [];
const guestPasses: { fromId: string; toId: string }[] = [];
const guestMatches: { id: string; userA: string; userB: string; ts: number }[] = [];

// AI/데모 유저가 "me" (게스트)를 미리 좋아한 상태로 시뮬레이션
[...DEMO_USERS, ...AI_MOCK_USERS].forEach((u) => {
  guestLikes.push({ fromId: u.id, toId: "me" });
});

// ── 헬퍼 ──────────────────────────────────────────────────────────────────────

function isDbUserId(id: string): boolean {
  return /^\d+$/.test(id);
}

function buildServerUser(
  user: typeof users.$inferSelect,
  profile: typeof userProfiles.$inferSelect
): ServerUser {
  const country = (user.country as "KR" | "JP") ?? "KR";
  const cityMap: Record<string, string> = {
    KR: "대한민국 · Korea",
    JP: "日本 · Japan",
  };
  return {
    id: String(user.id),
    nickname: profile.nickname || "Lito 사용자",
    age: profile.age,
    country,
    language: (user.language as "ko" | "ja") ?? "ko",
    city: cityMap[country] ?? "대한민국 · Korea",
    bio: profile.bio || profile.intro || "",
    photos: profile.photos ?? [],
    compatibilityScore: 70 + Math.floor(Math.random() * 25),
    compatibilityReasons: ["실제 사용자", "문화 교류", "언어 연습"],
    lastActive: "방금",
    isOnline: true,
    studyingLanguage: true,
    languageLevel: (profile.languageLevel as "beginner" | "intermediate" | "advanced") || "beginner",
    interests: profile.interests ?? [],
    trustScore: 60,
    trustLayers: {
      humanVerified: false,
      faceMatched: false,
      idVerified: false,
      institutionVerified: false,
    },
    instagramHandle: profile.instagramHandle || undefined,
    isAI: false,
  };
}

// ── 한일 관심사 양방향 매핑 ────────────────────────────────────────────────────
// 같은 개념의 한국어·일본어 태그를 동시에 매칭하기 위한 대응표
const INTEREST_BILINGUAL: Array<[string, string]> = [
  ["여행", "旅行"],
  ["요리", "料理"],
  ["카페", "カフェ"],
  ["독서", "読書"],
  ["게임", "ゲーム"],
  ["애니메이션", "アニメ"],
  ["영화", "映画"],
  ["운동", "運動"],
  ["사진", "写真"],
  ["일본어", "日本語"],
  ["한국어", "韓国語"],
  ["음악", "音楽"],
  ["K-POP", "K-POP"],
  ["드라마", "ドラマ"],
  ["패션", "ファッション"],
];

function expandInterestTags(tags: string[]): string[] {
  const expanded = new Set<string>(tags.map((t) => t.toLowerCase()));
  for (const tag of tags) {
    const lower = tag.toLowerCase();
    for (const [ko, ja] of INTEREST_BILINGUAL) {
      if (lower === ko.toLowerCase()) { expanded.add(ja.toLowerCase()); break; }
      if (lower === ja.toLowerCase()) { expanded.add(ko.toLowerCase()); break; }
    }
  }
  return Array.from(expanded);
}

function applyFilters(
  user: ServerUser,
  { country, minAge, maxAge, langLevel, interests, preferredGender }: { country: string; minAge: number; maxAge: number; langLevel: string; interests: string[]; preferredGender?: string }
): boolean {
  if (user.age < minAge || user.age > maxAge) return false;
  if (country !== "all" && user.country !== country) return false;
  if (langLevel !== "all" && user.languageLevel !== langLevel) return false;
  // 매칭 선호 성별 필터링 (preferredGender가 "any"가 아니면 필터링)
  if (preferredGender && preferredGender !== "any" && user.gender !== preferredGender) return false;
  if (interests.length > 0) {
    const expandedFilter = expandInterestTags(interests);
    const userInterests = (user.interests ?? []).map((i) => i.toLowerCase());
    const hasMatch = expandedFilter.some((tag) =>
      userInterests.some((ui) => ui.includes(tag) || tag.includes(ui))
    );
    if (!hasMatch) return false;
  }
  return true;
}

// ── GET /api/users/discover ───────────────────────────────────────────────────

router.get("/users/discover", optionalAuth, async (req, res) => {
  const country = (req.query.country as string) || "all";
  const minAge = req.query.minAge ? Number(req.query.minAge) : 18;
  const maxAge = req.query.maxAge ? Number(req.query.maxAge) : 99;
  const langLevel = (req.query.langLevel as string) || "all";
  const interestsRaw = (req.query.interests as string) || "";
  const interests = interestsRaw ? interestsRaw.split(",").map((s) => s.trim()).filter(Boolean) : [];
  const preferredGender = (req.query.preferredGender as string) || "any";
  const limit = Math.min(Number(req.query.limit) || 20, 50);
  const offset = Number(req.query.offset) || 0;

  const filterOpts = { country, minAge, maxAge, langLevel, interests, preferredGender };

  // ── 인증된 실제 사용자 ──────────────────────────────────────────────────────
  if (req.user) {
    const viewerDbId = req.user.userId;

    try {
      // 이미 좋아요/패스한 DB 유저 ID 조회
      const [likedRows, passedRows] = await Promise.all([
        db.select({ id: swipeLikes.toUserId }).from(swipeLikes).where(eq(swipeLikes.fromUserId, viewerDbId)),
        db.select({ id: swipePasses.toUserId }).from(swipePasses).where(eq(swipePasses.fromUserId, viewerDbId)),
      ]);

      const excludeIds = [
        viewerDbId,
        ...likedRows.map((r) => r.id),
        ...passedRows.map((r) => r.id),
      ];

      // DB에서 다른 실제 사용자 조회 (사진 1장 이상인 사람만)
      const hasPhoto = sql`jsonb_array_length(${userProfiles.photos}) > 0`;
      const whereConditions = excludeIds.length > 0
        ? and(notInArray(users.id, excludeIds), hasPhoto)
        : and(hasPhoto);

      const dbRows = await db
        .select()
        .from(users)
        .innerJoin(userProfiles, eq(userProfiles.userId, users.id))
        .where(whereConditions);

      const dbServerUsers: ServerUser[] = dbRows
        .map((r) => buildServerUser(r.users, r.user_profiles))
        .filter((u) => applyFilters(u, filterOpts));

      // AI/데모 유저: feature flag가 켜져 있을 때만 포함
      let mockPool: ServerUser[] = [];
      if (ENABLE_AI_PERSONAS || ENABLE_DEMO_USERS) {
        const viewerKey = `db:${viewerDbId}`;
        const dbLikedMockIds = new Set(
          guestLikes.filter((l) => l.fromId === viewerKey).map((l) => l.toId)
        );
        const dbPassedMockIds = new Set(
          guestPasses.filter((p) => p.fromId === viewerKey).map((p) => p.toId)
        );

        const candidates = [
          ...(ENABLE_AI_PERSONAS ? AI_MOCK_USERS : []),
          ...(ENABLE_DEMO_USERS ? DEMO_USERS : []),
        ];
        mockPool = candidates.filter(
          (u) =>
            !dbLikedMockIds.has(u.id) &&
            !dbPassedMockIds.has(u.id) &&
            applyFilters(u, filterOpts)
        );
      }

      // AI 우선, 그 다음 호환성 점수 내림차순
      const pool = [...mockPool, ...dbServerUsers].sort((a, b) => {
        if (a.isAI && !b.isAI) return -1;
        if (!a.isAI && b.isAI) return 1;
        return b.compatibilityScore - a.compatibilityScore;
      });

      const total = pool.length;
      const page = pool.slice(offset, offset + limit);
      res.json({ users: page, total, offset, limit });
      return;
    } catch (err) {
      console.error("[discover] DB 오류, 인메모리 폴백:", err);
    }
  }

  // ── 비인증 게스트: feature flag에 따라 데모+AI 유저 표시 ──────────────────
  const viewerId = (req.query.viewerId as string) || "me";
  const seenIds = new Set([
    ...guestLikes.filter((l) => l.fromId === viewerId).map((l) => l.toId),
    ...guestPasses.filter((p) => p.fromId === viewerId).map((p) => p.toId),
    viewerId,
  ]);

  const guestCandidates = [
    ...(ENABLE_AI_PERSONAS ? AI_MOCK_USERS : []),
    ...(ENABLE_DEMO_USERS ? DEMO_USERS : []),
  ];
  const pool = guestCandidates.filter(
    (u) => !seenIds.has(u.id) && applyFilters(u, filterOpts)
  );

  pool.sort((a, b) => {
    if (a.isAI && !b.isAI) return -1;
    if (!a.isAI && b.isAI) return 1;
    return b.compatibilityScore - a.compatibilityScore;
  });

  res.json({ users: pool.slice(offset, offset + limit), total: pool.length, offset, limit });
});
// ── GET /api/users/super-like-status ─────────────────────────────────────────────────
// 오늘 슈퍼 라이크 사용 현황 조회
router.get("/users/super-like-status", requireAuth, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todaySuperLikes = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(swipeLikes)
      .where(
        and(
          eq(swipeLikes.fromUserId, userId),
          eq(swipeLikes.isSuper, true),
          gte(swipeLikes.createdAt, todayStart)
        )
      );
    const used = todaySuperLikes[0]?.count ?? 0;
    const userPlan = (req.user as any).plan ?? "free";
    const limit = userPlan === "premium" ? 5 : userPlan === "plus" ? 3 : 1;

    res.json({ used, limit, remaining: Math.max(0, limit - used), plan: userPlan });
  } catch (err) {
    console.error("[super-like-status] error:", err);
    res.status(500).json({ error: "서버 오류" });
  }
});

// ── POST /api/users/:id/like ────────────────────────────────────────────────────────────

router.post("/users/:id/like", optionalAuth, async (req, res) => {
  const toId = String(req.params.id);
  const isSuper = req.body?.isSuper === true;

  // ── 인증된 사용자 ──────────────────────────────────────────────────────────
  if (req.user) {
    const fromDbId = req.user.userId;

    // ── 슈퍼 라이크 일일 제한 체크 ──────────────────────────────────────────
    if (isSuper) {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const todaySuperLikes = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(swipeLikes)
        .where(
          and(
            eq(swipeLikes.fromUserId, fromDbId),
            eq(swipeLikes.isSuper, true),
            gte(swipeLikes.createdAt, todayStart)
          )
        );
      const superCount = todaySuperLikes[0]?.count ?? 0;

      // 플랜별 일일 슈퍼 라이크 한도: free=1, plus=3, premium=5
      const userPlan = (req.user as any).plan ?? "free";
      const superLikeLimit = userPlan === "premium" ? 5 : userPlan === "plus" ? 3 : 1;

      if (superCount >= superLikeLimit) {
        res.status(429).json({
          error: "daily_super_like_limit",
          message: `오늘의 슈퍼 라이크를 모두 사용했습니다 (${superLikeLimit}/${superLikeLimit})`,
          limit: superLikeLimit,
          used: superCount,
          plan: userPlan,
        });
        return;
      }
    }

    // 실제 DB 유저를 좋아요한 경우
    if (isDbUserId(toId)) {
      const toDbId = parseInt(toId, 10);
      try {
        // 좋아요 기록 저장 (이미 있으면 무시)
        await db
          .insert(swipeLikes)
          .values({ fromUserId: fromDbId, toUserId: toDbId, isSuper })
          .onConflictDoNothing();

        // 상대방도 나를 좋아했는지 확인 → 매칭
        const [mutualLike] = await db
          .select()
          .from(swipeLikes)
          .where(
            and(eq(swipeLikes.fromUserId, toDbId), eq(swipeLikes.toUserId, fromDbId))
          )
          .limit(1);

        let matched = false;
        let matchId: string | null = null;

        if (mutualLike) {
          // 이미 매치가 있는지 확인
          const [existingMatch] = await db
            .select()
            .from(matchesTable)
            .where(
              or(
                and(eq(matchesTable.user1Id, fromDbId), eq(matchesTable.user2Id, toDbId)),
                and(eq(matchesTable.user1Id, toDbId), eq(matchesTable.user2Id, fromDbId))
              )
            )
            .limit(1);

          if (!existingMatch) {
            const [newMatch] = await db
              .insert(matchesTable)
              .values({ user1Id: fromDbId, user2Id: toDbId })
              .onConflictDoNothing()
              .returning();
            if (newMatch) {
              matched = true;
              matchId = String(newMatch.id);
              console.log(`[users] DB 매칭 생성: ${fromDbId} <-> ${toDbId} (match ${matchId})`);
            }
          } else {
            matched = true;
            matchId = String(existingMatch.id);
          }
        }

        // 매칭 상대 프로필 조회
        let matchedUser: ServerUser | null = null;
        if (matched) {
          const [row] = await db
            .select()
            .from(users)
            .innerJoin(userProfiles, eq(userProfiles.userId, users.id))
            .where(eq(users.id, toDbId))
            .limit(1);
          if (row) matchedUser = buildServerUser(row.users, row.user_profiles);
        }

        res.json({ liked: true, matched, matchId, matchedUser, isSuper });
        return;
      } catch (err) {
        console.error("[like] DB 오류:", err);
        res.status(500).json({ error: "서버 오류" });
        return;
      }
    }

    // AI/데모 유저를 좋아요 (인메모리)
    const viewerKey = `db:${fromDbId}`;
    const target = [...AI_MOCK_USERS, ...DEMO_USERS].find((u) => u.id === toId) ?? null;

    const alreadyLiked = guestLikes.some((l) => l.fromId === viewerKey && l.toId === toId);
    if (!alreadyLiked) guestLikes.push({ fromId: viewerKey, toId });

    // AI 유저는 항상 상대를 좋아함 (즉시 매칭)
    const isAiTarget = AI_MOCK_USERS.some((u) => u.id === toId);
    if (isAiTarget) {
      const aiLikedBack = guestLikes.some((l) => l.fromId === toId && l.toId === viewerKey);
      if (!aiLikedBack) guestLikes.push({ fromId: toId, toId: viewerKey });
    }

    const mutual = guestLikes.some((l) => l.fromId === viewerKey && l.toId === toId) &&
                   guestLikes.some((l) => l.fromId === toId && l.toId === viewerKey);
    const alreadyMatched = guestMatches.some(
      (m) => (m.userA === viewerKey && m.userB === toId) || (m.userA === toId && m.userB === viewerKey)
    );
    let matchId: string | null = null;
    let matched = false;

    if (mutual && !alreadyMatched) {
      matchId = `match_${viewerKey}_${toId}_${Date.now()}`;
      guestMatches.push({ id: matchId, userA: viewerKey, userB: toId, ts: Date.now() });
      matched = true;
    }

    res.json({ liked: true, matched, matchId, matchedUser: matched ? target : null });
    return;
  }

  // ── 비인증 게스트 (인메모리) ───────────────────────────────────────────────
  const viewerId = (req.body?.viewerId as string) || "me";
  const target = [...AI_MOCK_USERS, ...DEMO_USERS].find((u) => u.id === toId);
  if (!target && !isDbUserId(toId)) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const alreadyLiked = guestLikes.some((l) => l.fromId === viewerId && l.toId === toId);
  if (!alreadyLiked) guestLikes.push({ fromId: viewerId, toId });

  const mutual =
    guestLikes.some((l) => l.fromId === viewerId && l.toId === toId) &&
    guestLikes.some((l) => l.fromId === toId && l.toId === viewerId);
  const alreadyMatched = guestMatches.some(
    (m) => (m.userA === viewerId && m.userB === toId) || (m.userA === toId && m.userB === viewerId)
  );
  let matchId: string | null = null;

  if (mutual && !alreadyMatched) {
    matchId = `match_${viewerId}_${toId}_${Date.now()}`;
    guestMatches.push({ id: matchId, userA: viewerId, userB: toId, ts: Date.now() });
  }

  res.json({
    liked: true,
    matched: mutual && !alreadyMatched,
    matchId,
    matchedUser: mutual && !alreadyMatched ? target ?? null : null,
  });
});

// ── POST /api/users/:id/pass ──────────────────────────────────────────────────

router.post("/users/:id/pass", optionalAuth, async (req, res) => {
  const toId = String(req.params.id);

  if (req.user) {
    const fromDbId = req.user.userId;

    if (isDbUserId(toId)) {
      const toDbId = parseInt(toId, 10);
      try {
        await db
          .insert(swipePasses)
          .values({ fromUserId: fromDbId, toUserId: toDbId })
          .onConflictDoNothing();
        res.json({ passed: true });
        return;
      } catch (err) {
        console.error("[pass] DB 오류:", err);
        res.status(500).json({ error: "서버 오류" });
        return;
      }
    }

    // AI/데모 유저 패스 (인메모리)
    const viewerKey = `db:${fromDbId}`;
    const alreadyPassed = guestPasses.some((p) => p.fromId === viewerKey && p.toId === toId);
    if (!alreadyPassed) guestPasses.push({ fromId: viewerKey, toId });
    res.json({ passed: true });
    return;
  }

  const viewerId = (req.body?.viewerId as string) || "me";
  const alreadyPassed = guestPasses.some((p) => p.fromId === viewerId && p.toId === toId);
  if (!alreadyPassed) guestPasses.push({ fromId: viewerId, toId });
  res.json({ passed: true });
});

// ── GET /api/users/matches ────────────────────────────────────────────────────

router.get("/users/matches", optionalAuth, async (req, res) => {
  if (req.user) {
    const viewerDbId = req.user.userId;

    try {
      // DB 매칭 조회
      const dbMatchRows = await db
        .select()
        .from(matchesTable)
        .where(
          or(eq(matchesTable.user1Id, viewerDbId), eq(matchesTable.user2Id, viewerDbId))
        );

      const dbMatchResults = await Promise.all(
        dbMatchRows.map(async (m) => {
          const partnerId = m.user1Id === viewerDbId ? m.user2Id : m.user1Id;
          const [row] = await db
            .select()
            .from(users)
            .innerJoin(userProfiles, eq(userProfiles.userId, users.id))
            .where(eq(users.id, partnerId))
            .limit(1);
          if (!row) return null;
          return {
            matchId: String(m.id),
            matchedAt: m.createdAt.getTime(),
            user: buildServerUser(row.users, row.user_profiles),
          };
        })
      );

      // AI/데모 유저와의 인메모리 매칭도 포함
      const viewerKey = `db:${viewerDbId}`;
      const mockMatchResults = guestMatches
        .filter((m) => m.userA === viewerKey || m.userB === viewerKey)
        .map((m) => {
          const partnerId = m.userA === viewerKey ? m.userB : m.userA;
          const partner = [...AI_MOCK_USERS, ...DEMO_USERS].find((u) => u.id === partnerId);
          return partner ? { matchId: m.id, matchedAt: m.ts, user: partner } : null;
        })
        .filter(Boolean);

      const allMatches = [...dbMatchResults.filter(Boolean), ...mockMatchResults];
      res.json({ matches: allMatches });
      return;
    } catch (err) {
      console.error("[matches] DB 오류:", err);
    }
  }

  // 게스트
  const viewerId = (req.query.viewerId as string) || "me";
  const guestMatchResults = guestMatches
    .filter((m) => m.userA === viewerId || m.userB === viewerId)
    .map((m) => {
      const partnerId = m.userA === viewerId ? m.userB : m.userA;
      const partner = [...AI_MOCK_USERS, ...DEMO_USERS].find((u) => u.id === partnerId);
      return partner ? { matchId: m.id, matchedAt: m.ts, user: partner } : null;
    })
    .filter(Boolean);

  res.json({ matches: guestMatchResults });
});

// ── GET /api/users/:id ────────────────────────────────────────────────────────

router.get("/users/:id", async (req, res) => {
  const { id } = req.params;

  // 실제 DB 유저
  if (isDbUserId(id)) {
    try {
      const [row] = await db
        .select()
        .from(users)
        .innerJoin(userProfiles, eq(userProfiles.userId, users.id))
        .where(eq(users.id, parseInt(id, 10)))
        .limit(1);
      if (row) {
        res.json(buildServerUser(row.users, row.user_profiles));
        return;
      }
    } catch (err) {
      console.error("[users/:id] DB 오류:", err);
    }
  }

  // AI/데모 유저
  const mockUser = [...AI_MOCK_USERS, ...DEMO_USERS].find((u) => u.id === id);
  if (mockUser) {
    res.json(mockUser);
    return;
  }

  res.status(404).json({ error: "User not found" });
});

// ── POST /api/users/:id/like-back ─────────────────────────────────────────────
// 데모/테스트용: 상대방이 나를 좋아요한 것을 시뮬레이션 (인메모리만)

router.post("/users/:id/like-back", (req, res) => {
  const fromId = String(req.params.id);
  const toId = (req.body?.viewerId as string) || "me";

  const alreadyLiked = guestLikes.some((l) => l.fromId === fromId && l.toId === toId);
  if (!alreadyLiked) guestLikes.push({ fromId, toId });

  const mutual =
    guestLikes.some((l) => l.fromId === fromId && l.toId === toId) &&
    guestLikes.some((l) => l.fromId === toId && l.toId === fromId);
  const alreadyMatched = guestMatches.some(
    (m) => (m.userA === toId && m.userB === fromId) || (m.userA === fromId && m.userB === toId)
  );
  let matchId: string | null = null;

  if (mutual && !alreadyMatched) {
    matchId = `match_${toId}_${fromId}_${Date.now()}`;
    guestMatches.push({ id: matchId, userA: toId, userB: fromId, ts: Date.now() });
  }

  res.json({ liked: true, matched: mutual && !alreadyMatched, matchId });
});

// ── POST /api/users/reset ─────────────────────────────────────────────────────
// 인메모리 상태 초기화 (개발/데모용)

router.post("/users/reset", optionalAuth, async (req, res) => {
  const viewerId = (req.body?.viewerId as string) || "me";

  if (req.user) {
    const viewerDbId = req.user.userId;
    try {
      await Promise.all([
        db.delete(swipeLikes).where(eq(swipeLikes.fromUserId, viewerDbId)),
        db.delete(swipePasses).where(eq(swipePasses.fromUserId, viewerDbId)),
      ]);
    } catch (err) {
      console.error("[reset] DB 오류:", err);
    }

    const viewerKey = `db:${viewerDbId}`;
    const before = {
      guestLikes: guestLikes.filter((l) => l.fromId === viewerKey).length,
      guestPasses: guestPasses.filter((p) => p.fromId === viewerKey).length,
      guestMatches: guestMatches.filter((m) => m.userA === viewerKey || m.userB === viewerKey).length,
    };
    guestLikes.splice(0, guestLikes.length, ...guestLikes.filter((l) => l.fromId !== viewerKey));
    guestPasses.splice(0, guestPasses.length, ...guestPasses.filter((p) => p.fromId !== viewerKey));
    guestMatches.splice(0, guestMatches.length, ...guestMatches.filter((m) => m.userA !== viewerKey && m.userB !== viewerKey));
    res.json({ reset: true, cleared: before });
    return;
  }

  const before = {
    likes: guestLikes.filter((l) => l.fromId === viewerId).length,
    passes: guestPasses.filter((p) => p.fromId === viewerId).length,
    matches: guestMatches.filter((m) => m.userA === viewerId || m.userB === viewerId).length,
  };
  guestLikes.splice(0, guestLikes.length, ...guestLikes.filter((l) => l.fromId !== viewerId));
  guestPasses.splice(0, guestPasses.length, ...guestPasses.filter((p) => p.fromId !== viewerId));
  guestMatches.splice(0, guestMatches.length, ...guestMatches.filter((m) => m.userA !== viewerId && m.userB !== viewerId));
  res.json({ reset: true, cleared: before });
});

export default router;
