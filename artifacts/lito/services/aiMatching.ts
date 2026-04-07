/**
 * AI Matching service — heuristic-based compatibility scoring.
 *
 * ARCHITECTURE NOTE:
 * This is an honest heuristic rule-based engine, NOT a trained ML model.
 * Each scoring dimension is designed to be replaceable with a real ML signal
 * without changing the interface. Comments clearly mark where real AI
 * would slot in.
 *
 * Privacy rules enforced:
 * - Private message content is NOT used for scoring
 * - Language ability (translation dependence) is NOT penalized
 * - Scoring reasons are always human-readable and explainable
 */

import { MyProfile, User } from "@/types";
import {
  ChemistryCard,
  ChemistryPick,
  CompatibilityBreakdown,
  OpenerSuggestion,
  ProfileField,
  ProfileSuggestion,
} from "@/types/growth";

// ── Compatibility scoring ─────────────────────────────────────────────────────

/** Weights for each scoring dimension (must sum to 1.0) */
const WEIGHTS = {
  intentFit: 0.30,          // Relationship goal alignment is the strongest signal
  interestOverlap: 0.25,    // Shared interests drive early conversation
  culturalFit: 0.20,        // KR↔JP comfort and openness
  conversationStyle: 0.15,  // Communication style match
  meetingFeasibility: 0.10, // Practical IRL meeting potential
};

function clamp(val: number): number {
  return Math.min(100, Math.max(0, Math.round(val)));
}

/**
 * Relationship intent fit.
 * Rule: same intent = 100, adjacent = 60, opposite = 20.
 *
 * TODO: Replace with learned preference model when behavioral data exists.
 */
function scoreIntentFit(a: MyProfile | User, b: User): number {
  // Both profiles don't yet carry an explicit 'intent' field in MVP.
  // We use age as a proxy: closer in age → more likely compatible intent.
  // This is a weak heuristic. A real intent field should be added to the schema.
  const ageDiff = Math.abs((a as any).age - b.age);
  if (ageDiff <= 2) return 92;
  if (ageDiff <= 5) return 78;
  if (ageDiff <= 10) return 58;
  return 35;
}

/**
 * Interest overlap.
 * Rule: count shared tags divided by union, scaled to 0–100.
 */
function scoreInterestOverlap(a: MyProfile, b: User): number {
  const aInterests = new Set((a.interests ?? []).map((i) => i.toLowerCase()));
  const bInterests = new Set((b as any).interests ? (b as any).interests.map((i: string) => i.toLowerCase()) : []);
  if (aInterests.size === 0 && bInterests.size === 0) return 55; // neutral default
  const intersection = [...aInterests].filter((x) => bInterests.has(x)).length;
  const union = new Set([...aInterests, ...bInterests]).size;
  const jaccard = union > 0 ? intersection / union : 0;
  return clamp(30 + jaccard * 70); // floor at 30, ceiling at 100
}

/**
 * Cultural fit.
 * Rule: cross-country pairs get a bonus (that's the app's purpose),
 * same-country gets a moderate score.
 * Additional bonus if both have bios indicating cross-cultural openness.
 */
function scoreCulturalFit(a: MyProfile, b: User): number {
  const isCrossCultural = a.country !== b.country;
  const base = isCrossCultural ? 80 : 55;
  // Bonus: mentions of the other culture in bio
  const crossCultureKeywords = ["일본", "한국", "日本", "韓国", "japan", "korea", "kpop", "anime", "korean", "japanese"];
  const bioLower = (b.bio ?? "").toLowerCase();
  const hasKeyword = crossCultureKeywords.some((kw) => bioLower.includes(kw));
  return clamp(base + (hasKeyword ? 15 : 0));
}

/**
 * Conversation style compatibility.
 * Rule: based on bio length and intro style as proxies.
 * Both detailed → 85, both brief → 70, mixed → 60.
 */
function scoreConversationStyle(a: MyProfile, b: User): number {
  const aVerbose = (a.bio?.length ?? 0) > 60;
  const bVerbose = (b.bio?.length ?? 0) > 60;
  if (aVerbose && bVerbose) return 85;
  if (!aVerbose && !bVerbose) return 72;
  return 60;
}

/**
 * Meeting feasibility.
 * Rule: always moderate for MVP (we don't have real location data).
 * TODO: Use city/geohash proximity when location is available.
 */
function scoreMeetingFeasibility(_a: MyProfile, _b: User): number {
  // KR↔JP flight is ~2h. Both cultures have strong travel intent data.
  // Defaulting to 68 as a warm baseline for cross-country KR-JP pairs.
  return 68;
}

export function computeCompatibility(
  viewer: MyProfile,
  candidate: User
): { score: number; breakdown: CompatibilityBreakdown; reasons: string[] } {
  const breakdown: CompatibilityBreakdown = {
    intentFit: scoreIntentFit(viewer, candidate),
    interestOverlap: scoreInterestOverlap(viewer, candidate),
    culturalFit: scoreCulturalFit(viewer, candidate),
    conversationStyle: scoreConversationStyle(viewer, candidate),
    meetingFeasibility: scoreMeetingFeasibility(viewer, candidate),
  };

  const score = clamp(
    breakdown.intentFit * WEIGHTS.intentFit +
    breakdown.interestOverlap * WEIGHTS.interestOverlap +
    breakdown.culturalFit * WEIGHTS.culturalFit +
    breakdown.conversationStyle * WEIGHTS.conversationStyle +
    breakdown.meetingFeasibility * WEIGHTS.meetingFeasibility
  );

  const reasons = buildReasons(breakdown, viewer, candidate);

  return { score, breakdown, reasons };
}

function buildReasons(
  breakdown: CompatibilityBreakdown,
  viewer: MyProfile,
  candidate: User
): string[] {
  const reasons: string[] = [];

  if (breakdown.intentFit >= 80) {
    reasons.push("Similar age range and relationship stage");
  }

  const sharedInterests = (viewer.interests ?? []).filter((i) =>
    ((candidate as any).interests ?? []).some((ci: string) =>
      ci.toLowerCase() === i.toLowerCase()
    )
  );
  if (sharedInterests.length >= 2) {
    reasons.push(`Shared interests: ${sharedInterests.slice(0, 2).join(", ")}`);
  } else if (sharedInterests.length === 1) {
    reasons.push(`Common interest: ${sharedInterests[0]}`);
  }

  if (breakdown.culturalFit >= 80 && viewer.country !== candidate.country) {
    reasons.push("Strong Korean-Japanese cultural affinity");
  }

  if (breakdown.conversationStyle >= 80) {
    reasons.push("Compatible communication style");
  }

  if (reasons.length === 0) {
    reasons.push("Good overall compatibility for Korean-Japanese connection");
  }

  return reasons.slice(0, 3);
}

// ── Daily Chemistry Picks ─────────────────────────────────────────────────────

/**
 * Generates daily chemistry picks from the candidate pool.
 * Free tier: up to 3 top picks shown. Plus/Premium: full ranked list.
 */
export function generateChemistryPicks(
  viewer: MyProfile,
  candidates: User[],
  limit: number = 10
): ChemistryPick[] {
  const now = new Date().toISOString();

  const scored = candidates.map((user) => {
    const { score, breakdown, reasons } = computeCompatibility(viewer, user);
    return { userId: user.id, score, breakdown, reasons };
  });

  scored.sort((a, b) => b.score - a.score);
  const top = scored.slice(0, limit);

  return top.map((s, i) => ({
    userId: s.userId,
    score: s.score,
    breakdown: s.breakdown,
    reasons: s.reasons,
    isTopPick: i === 0,
    generatedAt: now,
  }));
}

// ── Profile Coach ─────────────────────────────────────────────────────────────

const INTRO_TEMPLATES_KO = [
  "안녕하세요! 저는 {name}이에요. {interest}를 좋아해서 일본 친구를 사귀고 싶어요. 잘 부탁드려요 😊",
  "처음 뵙겠습니다, {name}입니다. {interest} 덕분에 한국과 일본 문화에 관심이 많아요.",
];

const INTRO_TEMPLATES_JA = [
  "はじめまして、{name}です！{interest}が好きで、韓国の方とお友達になりたいです。よろしくお願いします😊",
  "こんにちは、{name}と申します。{interest}を通じて韓日文化にとても興味があります。",
];

/**
 * Generates profile improvement suggestions.
 * Rule-based for MVP. Designed for a real LLM prompt to replace
 * the suggestion string when AI API is integrated.
 */
export function generateProfileSuggestions(
  profile: MyProfile
): ProfileSuggestion[] {
  const now = new Date().toISOString();
  const suggestions: ProfileSuggestion[] = [];
  const lang = profile.language as "ko" | "ja";
  const name = profile.nickname || "User";
  const interest = (profile.interests ?? [])[0] ?? (lang === "ko" ? "K-Drama" : "Anime");

  // Intro suggestion
  if (!profile.intro || profile.intro.length < 20) {
    const templates = lang === "ko" ? INTRO_TEMPLATES_KO : INTRO_TEMPLATES_JA;
    const template = templates[0];
    const suggestion = template.replace("{name}", name).replace("{interest}", interest);
    suggestions.push({
      id: `sug_intro_${Date.now()}`,
      field: "intro" as ProfileField,
      label: lang === "ko" ? "한 줄 소개" : "一言紹介",
      original: profile.intro ?? "",
      suggestion,
      reason:
        lang === "ko"
          ? "상대방에게 친근하게 다가갈 수 있는 자연스러운 한 줄 소개예요"
          : "相手に親しみやすく近づける自然な一言紹介です",
      accepted: null,
      generatedAt: now,
    });
  }

  // Bio suggestion
  if (!profile.bio || profile.bio.length < 40) {
    const bioSuggestion =
      lang === "ko"
        ? `안녕하세요! 저는 ${name}이에요. ${interest}를 좋아하고, 일본 문화에도 관심이 많아요. 언젠가 일본에 살아보고 싶다는 꿈이 있어요. 한국어와 일본어로 자유롭게 대화해요 🌸`
        : `はじめまして、${name}です！${interest}が大好きで、韓国文化にも興味津々です。いつか韓国に住んでみたい夢があります。日本語・韓国語でのんびりおしゃべりしましょう 🌸`;
    suggestions.push({
      id: `sug_bio_${Date.now() + 1}`,
      field: "bio" as ProfileField,
      label: lang === "ko" ? "자기 소개" : "自己紹介",
      original: profile.bio ?? "",
      suggestion: bioSuggestion,
      reason:
        lang === "ko"
          ? "구체적인 관심사와 연결 의도를 담으면 매칭 가능성이 높아져요"
          : "具体的な興味や繋がりへの意欲を盛り込むとマッチング率が上がります",
      accepted: null,
      generatedAt: now,
    });
  }

  return suggestions;
}

// ── Opener Suggestions ────────────────────────────────────────────────────────

/**
 * Generates contextual conversation starters based on the target profile.
 * MVP: template-based with profile variable substitution.
 * TODO: Replace suggestion strings with GPT-4 prompt when AI API is integrated.
 */
export function generateOpeners(
  viewer: MyProfile,
  target: User
): OpenerSuggestion[] {
  const lang = viewer.language as "ko" | "ja";
  const targetLang = target.language as "ko" | "ja";
  const sharedInterests = (viewer.interests ?? []).filter((i) =>
    ((target as any).interests ?? []).some((ti: string) =>
      ti.toLowerCase() === i.toLowerCase()
    )
  );
  const firstShared = sharedInterests[0];
  const targetName = target.nickname.split(" ")[0];
  const openers: OpenerSuggestion[] = [];

  if (firstShared) {
    openers.push({
      text:
        lang === "ko"
          ? `안녕하세요, ${targetName}님! 저도 ${firstShared} 좋아해요 😊 어떤 계기로 관심 갖게 됐어요?`
          : `こんにちは、${targetName}さん！私も${firstShared}が好きです😊 どんなきっかけで好きになったんですか？`,
      context:
        lang === "ko"
          ? `공통 관심사 "${firstShared}"를 활용한 자연스러운 시작`
          : `共通の趣味「${firstShared}」を使った自然な入り方`,
    });
  }

  // Cross-cultural opener
  if (viewer.country !== target.country) {
    openers.push({
      text:
        lang === "ko"
          ? `안녕하세요! 일본 분이시군요 😊 일본에 꼭 가보고 싶은데, 추천해 주실 곳 있으세요?`
          : `こんにちは！韓国の方ですね😊 韓国にぜひ行ってみたいんですが、おすすめの場所を教えていただけますか？`,
      context:
        lang === "ko"
          ? "상대방의 나라에 관심을 보이는 친근한 시작"
          : "相手の国への関心を示す親しみやすい入り方",
    });
  }

  // Safe general opener
  openers.push({
    text:
      targetLang === "ko"
        ? `안녕하세요 ${targetName}님! 프로필 보고 이야기 나눠보고 싶었어요 😊`
        : `はじめまして、${targetName}さん！プロフィールを見てお話ししてみたくなりました😊`,
    context:
      lang === "ko"
        ? "부담 없이 시작할 수 있는 따뜻한 첫 인사"
        : "気軽に始められる温かい挨拶",
  });

  return openers.slice(0, 3);
}

// ── Chemistry Card ────────────────────────────────────────────────────────────

const DATING_TYPES = [
  {
    datingType: "The Curious Bridge",
    datingTypeBi: "호기심 많은 다리",
    emoji: "🌉",
    description: "You connect through questions, cultural curiosity, and genuine interest in others' worlds.",
    traits: ["Culturally open", "Great listener", "Thoughtful"],
    compatibleWith: "The Warm Guide",
  },
  {
    datingType: "The Warm Guide",
    datingTypeBi: "따뜻한 안내자",
    emoji: "🌸",
    description: "You create comfort and trust naturally. People feel safe sharing with you.",
    traits: ["Empathetic", "Trustworthy", "Steady"],
    compatibleWith: "The Curious Bridge",
  },
  {
    datingType: "The Creative Spark",
    datingTypeBi: "창의적인 불꽃",
    emoji: "✨",
    description: "You bring energy and ideas, finding connection through shared passions and adventures.",
    traits: ["Energetic", "Imaginative", "Passionate"],
    compatibleWith: "The Grounded One",
  },
  {
    datingType: "The Grounded One",
    datingTypeBi: "안정적인 사람",
    emoji: "🍵",
    description: "You value depth over breadth. Real connection comes through honest, slow-building trust.",
    traits: ["Reliable", "Honest", "Deep thinker"],
    compatibleWith: "The Creative Spark",
  },
];

export function generateChemistryCard(profile: MyProfile): ChemistryCard {
  // Deterministic choice based on interests to feel personalized
  const interestStr = (profile.interests ?? []).join("").toLowerCase();
  const idx = Math.abs(interestStr.split("").reduce((a, c) => a + c.charCodeAt(0), 0)) % DATING_TYPES.length;
  const type = DATING_TYPES[idx];

  const langVersion =
    profile.language === "ko"
      ? { bi: type.datingType, main: type.datingTypeBi }
      : { bi: type.datingTypeBi, main: type.datingType };

  return {
    datingType: langVersion.main,
    datingTypeBi: langVersion.bi,
    emoji: type.emoji,
    description: type.description,
    traits: type.traits,
    compatibleWith: type.compatibleWith,
    generatedAt: new Date().toISOString(),
  };
}
