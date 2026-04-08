// ─────────────────────────────────────────────────────────────────────────────
// services/prsSignals.ts
//
// PRS (Partner Receptivity Score) — MVP heuristic feature extraction layer.
//
// DESIGN PRINCIPLES:
//   • All functions are PURE — no API calls, no side effects, testable in isolation.
//   • LLM-based semantic scoring is handled server-side (/api/ai/prs).
//   • Comments label each signal as HEURISTIC or SEMANTIC.
//   • HEURISTIC = rule-based proxy, good enough for MVP.
//   • SEMANTIC   = requires LLM in v2 for stronger accuracy.
//   • All scores return values in [0, 1]. Clamping is explicit.
//   • Bilingual (Korean + Japanese) keyword support throughout.
//
// Data flow:
//   Message[] + meta → extractInterestFeatureWindow() → InterestFeatureWindow
//   InterestFeatureWindow → POST /api/ai/prs → PRSResult
//
// v2 upgrade path (marked with TODO:v2 comments):
//   - Replace keyword lists with embedding similarity
//   - Baseline reply speed per conversation rather than fixed thresholds
//   - Per-topic tracking rather than single keyword overlap
// ─────────────────────────────────────────────────────────────────────────────

import type {
  CalibrationProfile,
  ConversationStage,
  InterestFeatureWindow,
  LinguisticMatchingFeatures,
  LocalePair,
  Message,
  PenaltyFeatures,
  ProgressionFeatures,
  ReciprocityFeatures,
  ResponsivenessFeatures,
  TemporalFeatures,
  TranslationReliabilityMetrics,
  WarmthFeatures,
} from "@/types";

// ── Constants ────────────────────────────────────────────────────────────────

export const FEATURE_VERSION = "1.0.0";

/** Current user sentinel — must match AppContext / mockData. */
const MY_ID = "me";

// ── Calibration profiles ─────────────────────────────────────────────────────
//
// These are v1 PRODUCT PRIORS — not assertions about cultural norms.
// They exist so v2 can tune them per locale pair via A/B testing.

const CALIBRATION: Record<LocalePair, CalibrationProfile> = {
  "KR-KR": {
    localePair: "KR-KR",
    fastReplyThresholdMs: 3 * 60_000,       // 3 min
    slowReplyThresholdMs: 120 * 60_000,     // 2 h
    sessionGapMs: 4 * 60 * 60_000,         // 4 h = new session
    openingMaxTurns: 30,
    openingMaxHours: 72,
    discoveryMaxTurns: 120,
    scoringWeightsVersion: "v1",
  },
  "KR-JP": {
    localePair: "KR-JP",
    fastReplyThresholdMs: 5 * 60_000,       // slightly longer: cross-border = translation time
    slowReplyThresholdMs: 180 * 60_000,     // 3 h
    sessionGapMs: 6 * 60 * 60_000,
    openingMaxTurns: 30,
    openingMaxHours: 72,
    discoveryMaxTurns: 120,
    scoringWeightsVersion: "v1",
  },
  "JP-KR": {
    localePair: "JP-KR",
    fastReplyThresholdMs: 5 * 60_000,
    slowReplyThresholdMs: 180 * 60_000,
    sessionGapMs: 6 * 60 * 60_000,
    openingMaxTurns: 30,
    openingMaxHours: 72,
    discoveryMaxTurns: 120,
    scoringWeightsVersion: "v1",
  },
  "JP-JP": {
    localePair: "JP-JP",
    fastReplyThresholdMs: 5 * 60_000,
    slowReplyThresholdMs: 150 * 60_000,     // 2.5 h
    sessionGapMs: 5 * 60 * 60_000,
    openingMaxTurns: 30,
    openingMaxHours: 72,
    discoveryMaxTurns: 120,
    scoringWeightsVersion: "v1",
  },
};

// ── Keyword lists ─────────────────────────────────────────────────────────────
//
// Bilingual keyword sets used across multiple extractors.
// TODO:v2 — replace with token embedding similarity for context-sensitive matching.

/** Question-bearing words in KO and JA (beyond simple '?' detection). */
const QUESTION_WORDS = [
  // Korean
  "뭐", "어때", "어디", "어떻게", "얼마나", "누구", "왜", "언제", "몇",
  "인가요", "인가", "나요", "할까요", "을까요", "ㄹ까요",
  // Japanese
  "ですか", "ますか", "でしょうか", "どう", "どこ", "なに", "なん", "いつ",
  "どれ", "どちら", "だっけ", "かな", "かしら",
];

/** Acknowledgment / validation cues (partner is actively listening). */
const VALIDATION_CUES = [
  // Korean
  "맞아요", "맞아", "그렇군요", "그렇죠", "정말요", "대단해요", "와", "오",
  "아", "네", "넵", "ㅇㅇ", "좋아요", "좋네요", "공감",
  // Japanese
  "そうですね", "なるほど", "確かに", "わかります", "すごい", "素敵",
  "本当に", "へえ", "あ", "そっか", "そうか", "たしかに",
];

/** Future-orientation words (Progression group). */
const FUTURE_WORDS = [
  // Korean
  "다음에", "언제", "나중에", "다음번", "다음 주", "주말에", "곧",
  // Japanese
  "今度", "いつか", "また", "次回", "そのうち", "いつ",
];

/** Explicit availability sharing (Progression group). */
const AVAILABILITY_WORDS = [
  // Korean
  "주말", "내일", "모레", "이번 주", "다음 주", "이번 달", "저녁에",
  "퇴근 후", "오후에", "오전에", "시간 돼", "시간 있어", "한가해",
  // Japanese
  "週末", "明日", "明後日", "今週", "来週", "夜に", "仕事終わり",
  "午後", "午前", "暇", "空いてる", "都合",
];

/** Call / date acceptance signals (Progression group). */
const CALL_DATE_WORDS = [
  // Korean
  "전화", "영상통화", "만나다", "만날", "만나요", "만나자", "약속", "데이트",
  // Japanese
  "電話", "ビデオ通話", "会いたい", "会いましょう", "デート", "約束", "話したい",
];

/** Scam-risk red-flag keywords. HEURISTIC — not a guarantee. */
const SCAM_RISK_WORDS = [
  "send money", "wire transfer", "western union", "투자", "코인", "암호화폐",
  "bitcoin", "급해", "emergency", "urgent", "overseas", "stuck", "airport",
  "海外", "緊急", "お金", "送金", "仮想通貨", "投資",
];

/** Warmth cues. HEURISTIC — upgrade to sentiment model in v2. */
const WARMTH_CUES = [
  // Korean
  "고마워요", "감사해요", "좋아요", "재밌어요", "행복해요", "웃겨요",
  "귀여워요", "따뜻해요", "응원해요", "힘내요", "파이팅",
  // Japanese
  "ありがとう", "嬉しい", "楽しい", "素敵", "かわいい", "温かい",
  "応援", "頑張って", "よかった",
];

/** Self-promotion / self-focus cues (Penalty group). */
const SELF_PROMO_WORDS = [
  // Korean — "나", "제", "저는" are neutral; penalise clusters
  "나는", "나야", "제가", "저는", "저야", "나한테", "내가",
  // Japanese
  "私は", "僕は", "俺は", "私が", "僕が",
];

// ── Utility helpers ───────────────────────────────────────────────────────────

/** Clamp a number to [0, 1]. */
const clamp01 = (v: number): number => Math.max(0, Math.min(1, v));

/** Safe division — returns 0 if denominator is 0. */
const safeDivide = (num: number, den: number): number =>
  den === 0 ? 0 : num / den;

/**
 * Tokenise a message text into lowercase words.
 * Strips CJK punctuation, keeps alphanumeric + Hangul + Kanji.
 * HEURISTIC: word boundary in CJK is character-level here.
 */
const tokenise = (text: string): string[] =>
  text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter(Boolean);

/**
 * Count occurrences of any keyword from the list within text.
 * Case-insensitive substring match.
 */
const countKeywords = (text: string, keywords: string[]): number => {
  const lower = text.toLowerCase();
  return keywords.filter((k) => lower.includes(k.toLowerCase())).length;
};

/** Detect the "length bracket" of a message: short / medium / long. */
const lengthBracket = (text: string): "short" | "medium" | "long" => {
  const n = text.trim().length;
  if (n < 30) return "short";
  if (n < 100) return "medium";
  return "long";
};

/** Compute Jaccard overlap between two token sets. */
const jaccardOverlap = (a: string[], b: string[]): number => {
  if (!a.length || !b.length) return 0;
  const setA = new Set(a);
  const setB = new Set(b);
  const intersection = [...setA].filter((t) => setB.has(t)).length;
  const union = new Set([...setA, ...setB]).size;
  return safeDivide(intersection, union);
};

/** Detect emojis in a string. */
const hasEmoji = (text: string): boolean => /\p{Emoji}/u.test(text);

/** Compute standard deviation of a number array. */
const stdDev = (arr: number[]): number => {
  if (arr.length < 2) return 0;
  const mean = arr.reduce((s, x) => s + x, 0) / arr.length;
  const variance = arr.reduce((s, x) => s + (x - mean) ** 2, 0) / arr.length;
  return Math.sqrt(variance);
};

// ── Stage detection ───────────────────────────────────────────────────────────

/**
 * Detect the conversation stage from the full message list.
 *
 * Opening:    totalTurns < openingMaxTurns  OR  first message < openingMaxHours ago
 * Escalation: any call/date/availability signal in the last 10 messages
 * Discovery:  everything else
 *
 * HEURISTIC — v2 can use LLM to detect escalation signals more reliably.
 */
export function detectConversationStage(
  messages: Message[],
  calibration: CalibrationProfile
): ConversationStage {
  if (messages.length === 0) return "opening";

  const totalTurns = messages.length;
  const firstMsgMs = Date.parse(messages[0].createdAt);
  const hoursAgo = (Date.now() - firstMsgMs) / (60 * 60_000);

  if (
    totalTurns < calibration.openingMaxTurns ||
    hoursAgo < calibration.openingMaxHours
  ) {
    return "opening";
  }

  // Check for escalation signals in last 10 partner messages
  const recentPartner = messages
    .filter((m) => m.senderId !== MY_ID)
    .slice(-10);

  const hasEscalation = recentPartner.some((m) => {
    const text = (m.translatedText ?? m.originalText).toLowerCase();
    return (
      countKeywords(text, CALL_DATE_WORDS) > 0 ||
      countKeywords(text, AVAILABILITY_WORDS) > 1
    );
  });

  if (totalTurns > calibration.openingMaxTurns && hasEscalation) {
    return "escalation";
  }

  return "discovery";
}

// ── Feature extractors ────────────────────────────────────────────────────────
//
// Each extractor receives only what it needs. Partner messages = those NOT sent by ME.

/**
 * RESPONSIVENESS — How actively and specifically the partner engages.
 *
 * followUpQuestionRate:
 *   HEURISTIC — Detects '?' or known question words in partner messages.
 *   Counts only questions that appear to reference the prior turn (contingent).
 *   TODO:v2 — Semantic classification to distinguish rhetorical vs genuine questions.
 *
 * contingentReplyScore:
 *   HEURISTIC — Jaccard overlap of tokens between partner reply and the preceding my-message.
 *   A score > 0 means the partner referenced something I said.
 *   TODO:v2 — Semantic similarity via embedding to catch paraphrases.
 *
 * validationScore:
 *   HEURISTIC — Keyword match against acknowledgment/validation cue list.
 */
export function extractResponsivenessFeatures(
  allMessages: Message[]
): ResponsivenessFeatures {
  const partnerMsgs = allMessages.filter((m) => m.senderId !== MY_ID);
  if (partnerMsgs.length === 0) {
    return { followUpQuestionRate: 0, contingentReplyScore: 0, validationScore: 0 };
  }

  let questionCount = 0;
  let contingentCount = 0;
  let validationCount = 0;

  for (let i = 0; i < allMessages.length; i++) {
    const msg = allMessages[i];
    if (msg.senderId === MY_ID) continue;

    const text = msg.translatedText ?? msg.originalText;

    // followUpQuestionRate
    if (text.includes("?") || countKeywords(text, QUESTION_WORDS) > 0) {
      questionCount++;
    }

    // contingentReplyScore — does this partner message share tokens with the previous my-message?
    const prevMyMsg = allMessages
      .slice(0, i)
      .reverse()
      .find((m) => m.senderId === MY_ID);
    if (prevMyMsg) {
      const myTokens = tokenise(prevMyMsg.translatedText ?? prevMyMsg.originalText);
      const theirTokens = tokenise(text);
      // Filter common stop words that carry no meaning
      const STOP = new Set(["は", "が", "の", "を", "に", "で", "と", "이", "가", "을", "를", "의", "에", "i", "a", "the", "is"]);
      const myMeaningful = myTokens.filter((t) => !STOP.has(t) && t.length > 1);
      const theirMeaningful = theirTokens.filter((t) => !STOP.has(t) && t.length > 1);
      if (jaccardOverlap(myMeaningful, theirMeaningful) > 0.05) {
        contingentCount++;
      }
    }

    // validationScore
    if (countKeywords(text, VALIDATION_CUES) > 0) {
      validationCount++;
    }
  }

  return {
    followUpQuestionRate: clamp01(safeDivide(questionCount, partnerMsgs.length)),
    contingentReplyScore: clamp01(safeDivide(contingentCount, partnerMsgs.length)),
    validationScore: clamp01(safeDivide(validationCount, partnerMsgs.length)),
  };
}

/**
 * RECIPROCITY — Balance and mutuality of engagement.
 *
 * disclosureTurnTaking:
 *   HEURISTIC — Measures how evenly turns alternate (run-length of same sender).
 *   Perfect alternation (A,B,A,B...) = 1. All same sender = 0.
 *
 * disclosureBalance:
 *   HEURISTIC — Ratio of partner avg message length to my avg message length.
 *   A ratio near 1 means roughly equal disclosure depth.
 *   Clamped to [0, 1] by: min(ratio, 1/ratio) to penalise both extremes.
 *
 * partnerReinitiation:
 *   HEURISTIC — Fraction of "new sessions" (gap > sessionGapMs) where the partner
 *   sent the first new message. If partner keeps starting new sessions, that's a
 *   strong engagement signal.
 */
export function extractReciprocityFeatures(
  allMessages: Message[],
  calibration: CalibrationProfile
): ReciprocityFeatures {
  if (allMessages.length < 2) {
    return { disclosureTurnTaking: 0.5, disclosureBalance: 0.5, partnerReinitiation: 0 };
  }

  // disclosureTurnTaking — runs of same sender
  let senderSwitches = 0;
  for (let i = 1; i < allMessages.length; i++) {
    if (allMessages[i].senderId !== allMessages[i - 1].senderId) senderSwitches++;
  }
  // Perfect alternation = (n-1) switches for n messages
  const maxSwitches = allMessages.length - 1;
  const disclosureTurnTaking = clamp01(safeDivide(senderSwitches, maxSwitches));

  // disclosureBalance — avg message length ratio
  const partnerMsgs = allMessages.filter((m) => m.senderId !== MY_ID);
  const myMsgs = allMessages.filter((m) => m.senderId === MY_ID);

  const avgLen = (msgs: Message[]) =>
    msgs.length === 0
      ? 0
      : msgs.reduce((s, m) => s + (m.translatedText ?? m.originalText).length, 0) / msgs.length;

  const partnerAvgLen = avgLen(partnerMsgs);
  const myAvgLen = avgLen(myMsgs);

  let disclosureBalance = 0.5;
  if (myAvgLen > 0 && partnerAvgLen > 0) {
    const ratio = partnerAvgLen / myAvgLen;
    // A ratio of 1 = balanced. Score = 1 - |ratio - 1| clamped.
    disclosureBalance = clamp01(1 - Math.abs(ratio - 1) * 0.5);
  }

  // partnerReinitiation — sessions where partner fires first
  let sessions = 0;
  let partnerOpenedSessions = 0;
  for (let i = 1; i < allMessages.length; i++) {
    const gapMs =
      Date.parse(allMessages[i].createdAt) - Date.parse(allMessages[i - 1].createdAt);
    if (gapMs > calibration.sessionGapMs) {
      sessions++;
      if (allMessages[i].senderId !== MY_ID) {
        partnerOpenedSessions++;
      }
    }
  }
  // FIX: was 0.5 when no sessions detected — 0.5 contributed positively with no data.
  // 0 = no information (not a negative signal), which is the correct neutral baseline.
  const partnerReinitiation =
    sessions === 0 ? 0 : clamp01(safeDivide(partnerOpenedSessions, sessions));

  return { disclosureTurnTaking, disclosureBalance, partnerReinitiation };
}

/**
 * LINGUISTIC MATCHING — How much communication style converges.
 *
 * lsmProxy:
 *   HEURISTIC — Compares message length brackets (short/medium/long) between partners.
 *   If both gravitate toward the same bracket, convergence score is high.
 *   TODO:v2 — LIWC-style function word matching across languages.
 *
 * topicAlignment:
 *   HEURISTIC — Jaccard overlap of content tokens between adjacent (me→partner) turn pairs.
 *   If partner continues my topic = high alignment.
 *
 * formatAccommodation:
 *   HEURISTIC — Does the partner mirror emoji usage? (emoji ↔ emoji, no emoji ↔ no emoji)
 */
export function extractLinguisticFeatures(
  allMessages: Message[]
): LinguisticMatchingFeatures {
  if (allMessages.length < 4) {
    return { lsmProxy: 0.5, topicAlignment: 0.5, formatAccommodation: 0.5 };
  }

  const partnerMsgs = allMessages.filter((m) => m.senderId !== MY_ID);
  const myMsgs = allMessages.filter((m) => m.senderId === MY_ID);

  // lsmProxy — dominant bracket match
  const bracketCount = (msgs: Message[]) => {
    const counts = { short: 0, medium: 0, long: 0 };
    msgs.forEach((m) => counts[lengthBracket(m.translatedText ?? m.originalText)]++);
    return counts;
  };
  const myBrackets = bracketCount(myMsgs);
  const partnerBrackets = bracketCount(partnerMsgs);
  // FIX: was a binary 0.8 / 0.3 based only on dominant bracket.
  // Replace with a graded cosine-like overlap of the full bracket distributions.
  // This rewards partial alignment (e.g. both skew medium-short) instead of all-or-nothing.
  const total = (b: { short: number; medium: number; long: number }) =>
    b.short + b.medium + b.long || 1;
  const myNorm = {
    short:  myBrackets.short  / total(myBrackets),
    medium: myBrackets.medium / total(myBrackets),
    long:   myBrackets.long   / total(myBrackets),
  };
  const pNorm = {
    short:  partnerBrackets.short  / total(partnerBrackets),
    medium: partnerBrackets.medium / total(partnerBrackets),
    long:   partnerBrackets.long   / total(partnerBrackets),
  };
  // 1 - mean absolute deviation across 3 brackets (0 = identical, 1 = fully different)
  const mad =
    (Math.abs(myNorm.short - pNorm.short) +
     Math.abs(myNorm.medium - pNorm.medium) +
     Math.abs(myNorm.long - pNorm.long)) / 3;
  // Map: 0 deviation → 0.85, 0.33 (max uniform deviation) → 0.4
  const lsmProxy = clamp01(0.85 - mad * 1.35);

  // topicAlignment — for each partner message, overlap with the preceding my-message
  let overlapSum = 0;
  let overlapCount = 0;
  for (let i = 1; i < allMessages.length; i++) {
    const msg = allMessages[i];
    if (msg.senderId === MY_ID) continue;
    const prev = allMessages
      .slice(0, i)
      .reverse()
      .find((m) => m.senderId === MY_ID);
    if (!prev) continue;
    const myTokens = tokenise(prev.translatedText ?? prev.originalText);
    const theirTokens = tokenise(msg.translatedText ?? msg.originalText);
    overlapSum += jaccardOverlap(myTokens, theirTokens);
    overlapCount++;
  }
  const topicAlignment = overlapCount > 0 ? clamp01(overlapSum / overlapCount * 3) : 0.5;

  // formatAccommodation — emoji mirroring rate
  let emojiMatchCount = 0;
  let emojiCompareCount = 0;
  for (let i = 1; i < allMessages.length; i++) {
    const msg = allMessages[i];
    if (msg.senderId === MY_ID) continue;
    const prev = allMessages
      .slice(0, i)
      .reverse()
      .find((m) => m.senderId === MY_ID);
    if (!prev) continue;
    const myHasEmoji = hasEmoji(prev.originalText);
    const theirHasEmoji = hasEmoji(msg.originalText);
    if (myHasEmoji === theirHasEmoji) emojiMatchCount++;
    emojiCompareCount++;
  }
  const formatAccommodation =
    emojiCompareCount > 0
      ? clamp01(safeDivide(emojiMatchCount, emojiCompareCount))
      : 0.5;

  return { lsmProxy, topicAlignment, formatAccommodation };
}

/**
 * TEMPORAL ENGAGEMENT — Reply speed and consistency.
 *
 * baselineAdjustedReplySpeed:
 *   HEURISTIC — Compares the partner's RECENT reply gaps (last 5) against their
 *   EARLY reply gaps (first 5 gaps). Faster recently = higher score.
 *   Falls back to calibration thresholds when not enough data.
 *   TODO:v2 — Control for time-of-day and day-of-week effects.
 *
 * replyConsistency:
 *   HEURISTIC — Inverse of the standard deviation of gap durations.
 *   Lower variance = more predictable engagement = higher score.
 */
export function extractTemporalFeatures(
  allMessages: Message[],
  calibration: CalibrationProfile
): TemporalFeatures {
  // Compute reply gaps for each partner message = time since previous my-message
  const gaps: number[] = [];
  for (let i = 1; i < allMessages.length; i++) {
    const msg = allMessages[i];
    if (msg.senderId === MY_ID) continue;
    const prevMyMsg = allMessages
      .slice(0, i)
      .reverse()
      .find((m) => m.senderId === MY_ID);
    if (prevMyMsg) {
      const gapMs = Date.parse(msg.createdAt) - Date.parse(prevMyMsg.createdAt);
      if (gapMs >= 0) gaps.push(gapMs);
    }
  }

  if (gaps.length < 2) {
    return { baselineAdjustedReplySpeed: 0.5, replyConsistency: 0.5 };
  }

  // baseline = mean of first 5 gaps; recent = mean of last 5 gaps
  const baseline = gaps.slice(0, 5).reduce((s, g) => s + g, 0) / Math.min(5, gaps.length);
  const recent = gaps.slice(-5).reduce((s, g) => s + g, 0) / Math.min(5, gaps.slice(-5).length);

  // baselineAdjustedReplySpeed: 1 if recent < baseline, 0 if recent >> baseline
  // Neutral (0.5) when recent ≈ baseline
  let baselineAdjustedReplySpeed: number;
  if (baseline === 0) {
    baselineAdjustedReplySpeed = 0.5;
  } else {
    const ratio = recent / baseline; // <1 = got faster, >1 = got slower
    // Map: 0.5× faster → ~0.8, same → 0.5, 2× slower → ~0.2
    baselineAdjustedReplySpeed = clamp01(1 - (ratio - 0.5) * 0.5);
  }

  // Also check absolute speed against calibration thresholds for a sanity floor
  const avgGapMs = gaps.reduce((s, g) => s + g, 0) / gaps.length;
  if (avgGapMs <= calibration.fastReplyThresholdMs) {
    baselineAdjustedReplySpeed = Math.max(baselineAdjustedReplySpeed, 0.7);
  } else if (avgGapMs >= calibration.slowReplyThresholdMs) {
    baselineAdjustedReplySpeed = Math.min(baselineAdjustedReplySpeed, 0.35);
  }

  // replyConsistency: normalise std dev by mean gap (coefficient of variation, inverted)
  const sd = stdDev(gaps);
  const mean = gaps.reduce((s, g) => s + g, 0) / gaps.length;
  const cv = mean > 0 ? sd / mean : 0;
  // CV of 0 = perfectly consistent (score 1). CV of 2+ = very inconsistent (score 0).
  const replyConsistency = clamp01(1 - cv * 0.5);

  return { baselineAdjustedReplySpeed, replyConsistency };
}

/**
 * WARMTH / OTHER-FOCUS / AUTHENTICITY
 *
 * otherFocusScore:
 *   HEURISTIC — Fraction of partner messages containing 2nd-person pronouns or
 *   direct references to the receiver (당신, 너, あなた, きみ, etc.).
 *
 * warmthScore:
 *   HEURISTIC — Keyword match against warmth cue list.
 *   SEMANTIC in v2: sentiment analysis model.
 *
 * authenticityScore:
 *   HEURISTIC — Inverse generic-template proxy: messages that are longer than
 *   average AND have low token repetition across partner messages score higher.
 *   TODO:v2 — Embedding diversity score across partner messages.
 */
export function extractWarmthFeatures(
  allMessages: Message[],
  partnerName?: string
): WarmthFeatures {
  const partnerMsgs = allMessages.filter((m) => m.senderId !== MY_ID);
  if (partnerMsgs.length === 0) {
    return { otherFocusScore: 0, warmthScore: 0, authenticityScore: 0 };
  }

  const OTHER_FOCUS_WORDS = [
    // Korean
    "당신", "너", "네가", "당신이", "님이", "님은", "씨는",
    // Japanese
    "あなた", "きみ", "君", "あなたの", "きみの",
    // The partner may also use the user's name — injected via partnerName
    ...(partnerName ? [partnerName.toLowerCase()] : []),
  ];

  let otherFocusCount = 0;
  let warmthCount = 0;

  for (const msg of partnerMsgs) {
    const text = msg.translatedText ?? msg.originalText;
    if (countKeywords(text, OTHER_FOCUS_WORDS) > 0) otherFocusCount++;
    if (countKeywords(text, WARMTH_CUES) > 0) warmthCount++;
  }

  const otherFocusScore = clamp01(safeDivide(otherFocusCount, partnerMsgs.length));
  const warmthScore = clamp01(safeDivide(warmthCount, partnerMsgs.length));

  // authenticityScore — low token repetition AND reasonable message length
  const allPartnerTokens = partnerMsgs.flatMap((m) =>
    tokenise(m.translatedText ?? m.originalText)
  );
  const uniqueTokenRate =
    allPartnerTokens.length > 0
      ? new Set(allPartnerTokens).size / allPartnerTokens.length
      : 0.5;

  // Also: if avg partner message length is reasonable (> 20 chars), treat as authentic
  const avgLen =
    partnerMsgs.reduce((s, m) => s + (m.translatedText ?? m.originalText).length, 0) /
    partnerMsgs.length;
  const lengthBonus = avgLen > 20 ? 0.15 : 0;

  const authenticityScore = clamp01(uniqueTokenRate * 0.85 + lengthBonus);

  return { otherFocusScore, warmthScore, authenticityScore };
}

/**
 * PROGRESSION — Signals that the conversation is moving toward a next step.
 *
 * futureOrientation:
 *   HEURISTIC — Future-time keywords in any partner message.
 *
 * availabilitySharing:
 *   HEURISTIC — Specific day/time availability words.
 *
 * callOrDateAcceptance:
 *   HEURISTIC — Keywords indicating openness to call or meeting.
 *   These are scored as 0 or 1 (any signal = high signal), not frequencies.
 */
export function extractProgressionFeatures(
  allMessages: Message[]
): ProgressionFeatures {
  const partnerMsgs = allMessages.filter((m) => m.senderId !== MY_ID);

  const hasWord = (words: string[]) =>
    partnerMsgs.some((m) => {
      const text = (m.translatedText ?? m.originalText).toLowerCase();
      return words.some((w) => text.includes(w.toLowerCase()));
    });

  // FIX: futureOrientation reduced from 0.8 → 0.45 so that common time-reference words
  // ("언제", "いつ", "또", "また") don't cross the 0.5 reason-code threshold alone.
  // PROGRESSION_SIGNALS_PRESENT should only fire when availability or call signals are present.
  // futureOrientation contributes to the group score but no longer single-handedly triggers codes.
  const futureOrientation: number = hasWord(FUTURE_WORDS) ? 0.45 : 0.1;
  const availabilitySharing: number = hasWord(AVAILABILITY_WORDS) ? 0.9 : 0.05;
  const callOrDateAcceptance: number = hasWord(CALL_DATE_WORDS) ? 1.0 : 0.0;

  return { futureOrientation, availabilitySharing, callOrDateAcceptance };
}

/**
 * PENALTY SIGNALS — Red flags that dampen the PRS score.
 *
 * earlyOversharePenalty:
 *   HEURISTIC — If first 5 partner messages average > 150 chars AND contain
 *   heavy personal pronouns, flag as early overshare.
 *
 * selfPromotionPenalty:
 *   HEURISTIC — Self-promo word density across all partner messages.
 *
 * genericTemplatePenalty:
 *   HEURISTIC — Fraction of partner messages that are < 15 chars (very short, likely filler).
 *   TODO:v2 — Hash-based deduplication to catch copy-pasted replies.
 *
 * nonContingentTopicSwitchPenalty:
 *   HEURISTIC — Fraction of consecutive partner-message pairs with zero token overlap.
 *
 * scamRiskPenalty:
 *   HEURISTIC — Any scam-risk keyword presence in any partner message.
 */
export function extractPenaltyFeatures(
  allMessages: Message[]
): PenaltyFeatures {
  const partnerMsgs = allMessages.filter((m) => m.senderId !== MY_ID);
  if (partnerMsgs.length === 0) {
    return {
      earlyOversharePenalty: 0,
      selfPromotionPenalty: 0,
      genericTemplatePenalty: 0,
      nonContingentTopicSwitchPenalty: 0,
      scamRiskPenalty: 0,
    };
  }

  // earlyOversharePenalty
  const firstFivePartner = partnerMsgs.slice(0, 5);
  const earlyAvgLen =
    firstFivePartner.reduce((s, m) => s + (m.translatedText ?? m.originalText).length, 0) /
    firstFivePartner.length;
  const earlySelfWordCount = firstFivePartner.reduce(
    (s, m) => s + countKeywords(m.translatedText ?? m.originalText, SELF_PROMO_WORDS),
    0
  );
  const earlyOversharePenalty =
    earlyAvgLen > 150 && earlySelfWordCount > firstFivePartner.length ? 0.6 : 0;

  // selfPromotionPenalty
  const selfWordDensity =
    partnerMsgs.reduce(
      (s, m) => s + countKeywords(m.translatedText ?? m.originalText, SELF_PROMO_WORDS),
      0
    ) / partnerMsgs.length;
  const selfPromotionPenalty = clamp01(selfWordDensity * 0.3);

  // FIX: genericTemplatePenalty — exclude natural short validation responses.
  // Warm short responses like "네", "맞아요", "ありがとう", "そうですね" are genuine engagement,
  // not template spam. Only penalise short messages that are NOT in the validation cue list.
  const shortMsgCount = partnerMsgs.filter((m) => {
    const text = (m.translatedText ?? m.originalText).trim();
    if (text.length >= 15) return false;                          // not short
    if (countKeywords(text, VALIDATION_CUES) > 0) return false;  // genuine short response
    return true;
  }).length;
  const genericTemplatePenalty = clamp01(safeDivide(shortMsgCount, partnerMsgs.length) * 0.7);

  // FIX: nonContingentTopicSwitchPenalty — skip very short messages (< 15 chars) from comparison.
  // Short messages like "네", "ㅎㅎ", "맞아요" carry too few tokens to assess topic continuity,
  // and their zero overlap would unfairly penalise natural acknowledgment-heavy chat flows.
  const substantivePartnerMsgs = partnerMsgs.filter(
    (m) => (m.translatedText ?? m.originalText).trim().length >= 15
  );
  let switchCount = 0;
  for (let i = 1; i < substantivePartnerMsgs.length; i++) {
    const prev = tokenise(substantivePartnerMsgs[i - 1].translatedText ?? substantivePartnerMsgs[i - 1].originalText);
    const curr = tokenise(substantivePartnerMsgs[i].translatedText ?? substantivePartnerMsgs[i].originalText);
    if (jaccardOverlap(prev, curr) < 0.02) switchCount++;
  }
  const nonContingentTopicSwitchPenalty =
    substantivePartnerMsgs.length > 1
      ? clamp01(safeDivide(switchCount, substantivePartnerMsgs.length - 1) * 0.5)
      : 0;

  // scamRiskPenalty — binary: any hit = maximum penalty
  const hasScamRisk = partnerMsgs.some((m) => {
    const text = (m.translatedText ?? m.originalText).toLowerCase();
    return countKeywords(text, SCAM_RISK_WORDS) > 0;
  });
  // IMPORTANT: This is a keyword heuristic — false positives are possible.
  // Always display as a soft signal, not a definitive verdict.
  const scamRiskPenalty = hasScamRisk ? 0.8 : 0;

  return {
    earlyOversharePenalty,
    selfPromotionPenalty,
    genericTemplatePenalty,
    nonContingentTopicSwitchPenalty,
    scamRiskPenalty,
  };
}

// ── Translation reliability ───────────────────────────────────────────────────

/**
 * Measures how reliably translations are available in this conversation.
 * Low translation rate = semantic features are less reliable.
 *
 * HEURISTIC — No quality scoring of translation accuracy (would require LLM in v2).
 */
export function extractTranslationMetrics(
  allMessages: Message[],
  myCountry: "KR" | "JP",
  partnerCountry: "KR" | "JP"
): TranslationReliabilityMetrics {
  const translated = allMessages.filter((m) => !!m.translatedText).length;
  const translatedMessageRate = clamp01(safeDivide(translated, allMessages.length));

  const myLang = myCountry === "KR" ? "KR" : "JP";
  const partnerLang = partnerCountry === "KR" ? "KR" : "JP";
  const localePair: LocalePair = `${myLang}-${partnerLang}` as LocalePair;
  const crossBorderConversation = myLang !== partnerLang;

  return { translatedMessageRate, localePair, crossBorderConversation };
}

// ── Confidence calculator ─────────────────────────────────────────────────────

/**
 * Compute a Confidence Score (0–100) for the PRS estimate.
 *
 * Confidence degrades when:
 *  - Too few partner messages (< 5 = very low)
 *  - Last message is old (inactive for > 7 days)
 *  - Translation rate is low in cross-border conversation
 *  - Mixed / contradictory signals (penalty vs high warmth)
 *
 * HEURISTIC — v2 can use model uncertainty / calibration curves.
 */
export function computeConfidence(
  featureWindow: Omit<InterestFeatureWindow, "computedAt" | "featureVersion">
): number {
  let confidence = 100;

  // Partner message count
  if (featureWindow.partnerMessages < 3) confidence -= 50;
  else if (featureWindow.partnerMessages < 8) confidence -= 25;
  else if (featureWindow.partnerMessages < 15) confidence -= 10;

  // Recency — if last message is old, data may be stale
  const lastMsgAgeMs = Date.now() - Date.parse(featureWindow.timeWindowEnd);
  const dayMs = 24 * 60 * 60_000;
  if (lastMsgAgeMs > 7 * dayMs) confidence -= 20;
  else if (lastMsgAgeMs > 3 * dayMs) confidence -= 10;

  // Cross-border + low translation quality = semantic uncertainty
  if (
    featureWindow.translation.crossBorderConversation &&
    featureWindow.translation.translatedMessageRate < 0.5
  ) {
    confidence -= 15;
  }

  // Contradictory signals (high scam risk present)
  if (featureWindow.penalties.scamRiskPenalty > 0.5) confidence -= 30;

  return Math.max(0, Math.min(100, confidence));
}

// ── Main entry point ──────────────────────────────────────────────────────────

/**
 * Build a complete InterestFeatureWindow from a message array.
 *
 * This is the single public entry point for the heuristic extraction pipeline.
 * Call this client-side, then POST the result to /api/ai/prs for LLM semantic
 * scoring and final PRS calculation.
 *
 * @param messages        Full message history for the conversation (ascending by createdAt)
 * @param conversationId  Conversation identifier
 * @param myUserId        The current user's ID (default: "me")
 * @param partnerUserId   The partner's user ID
 * @param myCountry       Current user's country for locale pair computation
 * @param partnerCountry  Partner's country
 * @param myName          Optional: current user's name (used in otherFocusScore)
 */
export function extractInterestFeatureWindow(
  messages: Message[],
  conversationId: string,
  myUserId: string = MY_ID,
  partnerUserId: string,
  myCountry: "KR" | "JP" = "JP",
  partnerCountry: "KR" | "JP" = "KR",
  myName?: string
): InterestFeatureWindow {
  if (messages.length === 0) {
    throw new Error("[prsSignals] Cannot extract features from empty message list");
  }

  const translation = extractTranslationMetrics(messages, myCountry, partnerCountry);
  const calibration = CALIBRATION[translation.localePair];
  const stage = detectConversationStage(messages, calibration);

  const partnerMsgs = messages.filter((m) => m.senderId !== myUserId);
  const myMsgs = messages.filter((m) => m.senderId === myUserId);

  const recentMessages = messages.slice(-10).map((m) => ({
    sender: m.senderId === myUserId ? ("me" as const) : ("them" as const),
    text: m.translatedText ?? m.originalText,
    createdAt: m.createdAt,
  }));

  const responsiveness = extractResponsivenessFeatures(messages);
  const reciprocity = extractReciprocityFeatures(messages, calibration);
  const linguistic = extractLinguisticFeatures(messages);
  const temporal = extractTemporalFeatures(messages, calibration);
  const warmth = extractWarmthFeatures(messages, myName);
  const progression = extractProgressionFeatures(messages);
  const penalties = extractPenaltyFeatures(messages);

  return {
    conversationId,
    myUserId,
    partnerUserId,
    timeWindowStart: messages[0].createdAt,
    timeWindowEnd: messages[messages.length - 1].createdAt,
    totalMessages: messages.length,
    partnerMessages: partnerMsgs.length,
    myMessages: myMsgs.length,
    recentMessages,
    responsiveness,
    reciprocity,
    linguistic,
    temporal,
    warmth,
    progression,
    penalties,
    translation,
    stage,
    featureVersion: FEATURE_VERSION,
    computedAt: new Date().toISOString(),
  };
}

// ── What's missing for v2 ─────────────────────────────────────────────────────
//
// DATA GAPS (current mock data limitations):
//   - No time-of-day or day-of-week data → cannot control for circadian patterns
//   - No session metadata → partnerReinitiation only uses gap threshold heuristic
//   - No read-receipts → cannot measure "saw but didn't reply" patterns
//   - No user baseline across conversations → temporal features are per-conversation only
//
// SEMANTIC FEATURES (need LLM / embedding model):
//   - warmthScore: currently keyword-based; v2 = sentiment model
//   - authenticityScore: currently length + vocabulary diversity; v2 = embedding diversity
//   - contingentReplyScore: currently keyword overlap; v2 = cosine similarity
//   - topicAlignment: currently Jaccard; v2 = topic embedding similarity
//   - genericTemplatePenalty: currently length-based; v2 = hash dedup + template detection
//
// CALIBRATION:
//   - All thresholds are v1 product priors
//   - Real-world A/B testing data needed to tune per locale pair
//   - No per-user baseline reply speed (requires history across many conversations)
