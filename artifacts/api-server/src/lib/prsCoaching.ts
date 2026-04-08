// ─────────────────────────────────────────────────────────────────────────────
// lib/prsCoaching.ts
//
// PRS Coaching Rule Engine — deterministic, manipulation-free.
//
// RESPONSIBILITY:
//  Convert a ConversationInterestSnapshot + recent message patterns into a
//  structured coaching context that is injected into the LLM system prompt.
//  The LLM then uses this context to generate situationally appropriate
//  suggestions. The rule engine does NOT write final user-facing text — that
//  is the LLM's job.
//
// DESIGN PRINCIPLES:
//  • Pure functions — no API calls, no side effects.
//  • Every rule has an explicit anti-manipulation guard.
//  • Low-confidence and mixed states always bias toward "keep it light".
//  • Progression advice is always framed as opportunity, never pressure.
//  • Cross-cultural/translation context is surfaced when relevant.
//  • Rule outputs are English coaching context for LLM (not user-facing copy).
//
// PUBLIC API:
//  analyseRecentMessages(messages)          → MessagePatterns
//  evaluateCoachingRules(snapshot, patterns)→ CoachingRuleResult[]
//  buildCoachingContextBlock(rules, snapshot) → string  (LLM prompt fragment)
//  runPrsCoaching(snapshot, messages)       → PrsCoachingOutput
// ─────────────────────────────────────────────────────────────────────────────

// ── Types ─────────────────────────────────────────────────────────────────────

export type CoachingRuleId =
  | "EARLY_STAGE_LOW_DATA"       // Too few messages to draw conclusions
  | "HIGH_WARMTH_LOW_PROGRESSION"// Warmth high, forward movement weak
  | "STRONG_PROGRESSION"         // Availability/call signals present
  | "MIXED_SIGNALS"              // Positive and negative signals coexist
  | "LONG_MESSAGE_PATTERN"       // User sends long msgs, partner replies short
  | "PARTNER_FOLLOWS_UP_HIGH"    // Partner frequently asks follow-up questions
  | "TRANSLATION_CROSSBORDER"    // KR-JP conversation with translation context
  | "LOW_CONFIDENCE_AMBIGUOUS";  // CS too low to give directional advice

export interface CoachingRuleResult {
  ruleId: CoachingRuleId;
  priority: number;         // 1–10: higher = include first in LLM prompt
  activated: boolean;       // Whether the rule threshold was met
  /** English coaching context phrase injected into the LLM system prompt. */
  contextPhrase: string;
  /** Safety guard: any rule marked unsafe should not appear in output. */
  isSafe: true;
}

export interface MessagePatterns {
  /** Average character length of the user's ("me") messages in the last 10. */
  myAvgLength: number;
  /** Average character length of partner's messages in the last 10. */
  partnerAvgLength: number;
  /** Ratio: my avg length / partner avg length. >2.0 = I'm sending much longer msgs. */
  lengthRatio: number;
  /** Number of partner messages that contain a question marker */
  partnerQuestionCount: number;
  /** Total messages analysed */
  total: number;
}

export interface PrsCoachingOutput {
  /** List of activated rules (sorted by priority desc). */
  activatedRules: CoachingRuleResult[];
  /** Full coaching context block ready to be appended to the LLM system prompt. */
  coachingContextBlock: string;
  /** Primary coaching directive — the single most important guidance (for logging). */
  primaryDirective: string;
  /** Whether the snapshot has enough confidence for directional advice. */
  hasDirectionalAdvice: boolean;
}

// ── Thresholds (all configurable here, never scattered in logic) ───────────────

const THRESHOLDS = {
  /** PRS Confidence below this = no directional advice */
  minConfidenceForDirectional: 40,
  /** PRS score above this = "warmth/receptivity is solid" */
  highPrs: 65,
  /** Warmth group score above this = warmth is demonstrably high */
  highWarmth: 0.6,
  /** Progression group score below this = progression signals weak */
  lowProgression: 0.45,
  /** Progression group score above this = meaningful progression signals */
  highProgression: 0.65,
  /** Availability or call signals above this = escalation window may exist */
  escalationSignal: 0.6,
  /** My message length / partner length above this = I'm over-investing in length */
  lengthImbalanceRatio: 1.8,
  /** Average message length considered "long" for the user (chars) */
  longMessageThreshold: 120,
  /** Partner follow-up question count >= this in last 10 msgs = high */
  partnerHighFollowUpCount: 3,
  /** Minimum partner messages before non-low-data rules can activate */
  minPartnerMessages: 5,
  /** Translated message rate below which cross-border context is noted */
  lowTranslationRate: 0.5,
} as const;

// ── Message pattern analysis ──────────────────────────────────────────────────

const QUESTION_MARKERS = ["?", "？", "어때요", "어떤가요", "어때", "どう", "ですか", "ませんか", "없나요", "할까요"];

/**
 * analyseRecentMessages
 *
 * Extracts observable message pattern metrics from the last N messages.
 * These feed into coaching rules as objective signals.
 */
export function analyseRecentMessages(
  messages: Array<{ sender: string; text: string }>,
  myId = "me"
): MessagePatterns {
  const recent = messages.slice(-10);
  const myMsgs = recent.filter((m) => m.sender === myId || m.sender === "me");
  const partnerMsgs = recent.filter((m) => m.sender !== myId && m.sender !== "me");

  const avg = (arr: number[]) => arr.length === 0 ? 0 : arr.reduce((s, v) => s + v, 0) / arr.length;

  const myAvgLength = avg(myMsgs.map((m) => m.text.length));
  const partnerAvgLength = avg(partnerMsgs.map((m) => m.text.length));
  const lengthRatio = partnerAvgLength === 0 ? 1 : myAvgLength / partnerAvgLength;

  const partnerQuestionCount = partnerMsgs.filter((m) =>
    QUESTION_MARKERS.some((marker) => m.text.includes(marker))
  ).length;

  return {
    myAvgLength,
    partnerAvgLength,
    lengthRatio,
    partnerQuestionCount,
    total: recent.length,
  };
}

// ── Rule engine ───────────────────────────────────────────────────────────────

interface SnapshotProxy {
  prsScore: number;
  confidenceScore: number;
  stage: string;
  lowConfidenceState: string | null;
  reasonCodes: string[];
  featureBreakdown: {
    responsiveness: number;
    reciprocity: number;
    linguistic: number;
    temporal: number;
    warmth: number;
    progression: number;
    penaltyTotal: number;
  };
  penaltyBreakdown: Record<string, number>;
  partnerMessages?: number;
  translation?: {
    crossBorderConversation?: boolean;
    translatedMessageRate?: number;
    localePair?: string;
  };
}

/**
 * evaluateCoachingRules
 *
 * Evaluates all 8 coaching rules against the snapshot and message patterns.
 * Each rule is evaluated independently. All isSafe = true by design.
 * Rules with activated=false are still returned (for completeness / debugging).
 */
export function evaluateCoachingRules(
  snapshot: SnapshotProxy,
  patterns: MessagePatterns
): CoachingRuleResult[] {
  const T = THRESHOLDS;
  const { prsScore, confidenceScore, featureBreakdown: fb, reasonCodes } = snapshot;
  const partnerMsgCount = snapshot.partnerMessages ?? 0;
  const translation = snapshot.translation ?? {};
  const isCrossBorder = translation.crossBorderConversation === true;
  const translatedRate = translation.translatedMessageRate ?? 1.0;

  const hasCode = (code: string) => reasonCodes.includes(code);

  // Rule 1: EARLY_STAGE_LOW_DATA
  const rule1: CoachingRuleResult = {
    ruleId: "EARLY_STAGE_LOW_DATA",
    priority: 9,
    isSafe: true,
    activated:
      confidenceScore < T.minConfidenceForDirectional ||
      partnerMsgCount < T.minPartnerMessages,
    contextPhrase:
      "There is not enough conversation data yet to give directional advice. " +
      "Recommend the user keep things light, stay curious, and not over-invest emotionally at this stage. " +
      "Do NOT suggest escalation (calls, dates). Focus on continuing the dialogue naturally.",
  };

  // Rule 2: HIGH_WARMTH_LOW_PROGRESSION
  const rule2: CoachingRuleResult = {
    ruleId: "HIGH_WARMTH_LOW_PROGRESSION",
    priority: 7,
    isSafe: true,
    activated:
      fb.warmth >= T.highWarmth &&
      fb.progression < T.lowProgression &&
      confidenceScore >= T.minConfidenceForDirectional &&
      partnerMsgCount >= T.minPartnerMessages,
    contextPhrase:
      "The conversation shows warmth and engagement, but there are no clear forward-movement signals yet " +
      "(no date suggestion, no availability sharing, no call acceptance). " +
      "Recommend a light follow-up question rather than pushing for progression. " +
      "Do NOT recommend suggesting a date, call, or meetup at this stage. " +
      "Encourage natural topic deepening instead.",
  };

  // Rule 3: STRONG_PROGRESSION
  const rule3: CoachingRuleResult = {
    ruleId: "STRONG_PROGRESSION",
    priority: 8,
    isSafe: true,
    activated:
      fb.progression >= T.highProgression &&
      prsScore >= T.highPrs &&
      confidenceScore >= T.minConfidenceForDirectional &&
      partnerMsgCount >= T.minPartnerMessages &&
      (hasCode("AVAILABILITY_SHARED") || hasCode("CALL_DATE_SIGNAL") || hasCode("PROGRESSION_SIGNALS_PRESENT")),
    contextPhrase:
      "Progression signals are present — the partner has shared availability or shown positive forward-movement cues. " +
      "It may be appropriate to gently suggest a low-pressure next step such as a voice call. " +
      "Frame any such suggestion as casual and optional — never urgent or pressuring. " +
      "Only suggest this if it fits the conversation flow naturally. " +
      "Cultural note: in KR-JP cross-cultural contexts, softer invitations are often better received.",
  };

  // Rule 4: MIXED_SIGNALS
  const rule4: CoachingRuleResult = {
    ruleId: "MIXED_SIGNALS",
    priority: 8,
    isSafe: true,
    activated:
      snapshot.lowConfidenceState === "mixed_signals" ||
      (hasCode("SIGNALS_MIXED") && confidenceScore >= T.minConfidenceForDirectional),
    contextPhrase:
      "The conversation is showing mixed engagement signals — some positive cues alongside inconsistencies. " +
      "Recommend the user send a shorter, lower-pressure message. " +
      "Do NOT recommend escalation. Avoid over-analysis. " +
      "Encourage staying curious without over-investing emotionally.",
  };

  // Rule 5: LONG_MESSAGE_PATTERN
  const rule5: CoachingRuleResult = {
    ruleId: "LONG_MESSAGE_PATTERN",
    priority: 6,
    isSafe: true,
    activated:
      patterns.myAvgLength > T.longMessageThreshold &&
      patterns.lengthRatio > T.lengthImbalanceRatio &&
      patterns.partnerAvgLength > 0,
    contextPhrase:
      `The user has been sending significantly longer messages (avg ~${Math.round(patterns.myAvgLength)} chars) ` +
      `than the partner (avg ~${Math.round(patterns.partnerAvgLength)} chars). ` +
      "Recommend the user try a shorter, more focused message this time. " +
      "A specific, single question often works better than a long paragraph. " +
      "Do NOT mention this imbalance directly to the user — frame as a positive style suggestion.",
  };

  // Rule 6: PARTNER_FOLLOWS_UP_HIGH
  const rule6: CoachingRuleResult = {
    ruleId: "PARTNER_FOLLOWS_UP_HIGH",
    priority: 7,
    isSafe: true,
    activated:
      patterns.partnerQuestionCount >= T.partnerHighFollowUpCount &&
      confidenceScore >= T.minConfidenceForDirectional,
    contextPhrase:
      `The partner has asked ${patterns.partnerQuestionCount} follow-up questions recently — a positive responsiveness signal. ` +
      "Recommend the user answer genuinely and specifically, and consider asking a light follow-up question in return. " +
      "This is a good moment for specific, personal (but not overly intimate) sharing.",
  };

  // Rule 7: TRANSLATION_CROSSBORDER
  const rule7: CoachingRuleResult = {
    ruleId: "TRANSLATION_CROSSBORDER",
    priority: 5,
    isSafe: true,
    activated:
      isCrossBorder &&
      confidenceScore >= T.minConfidenceForDirectional,
    contextPhrase:
      `This is a cross-border KR-JP conversation` +
      (translatedRate < T.lowTranslationRate
        ? ` with limited translation coverage (${Math.round(translatedRate * 100)}% translated).`
        : ".") +
      " Be mindful of potential cultural communication differences. " +
      "In Korean-Japanese cross-cultural dating contexts, directness about feelings varies significantly. " +
      "Prefer softer, indirect suggestions. If translation coverage is low, some nuance may be lost. " +
      "Avoid recommending aggressive directness or culturally mismatched tone.",
  };

  // Rule 8: LOW_CONFIDENCE_AMBIGUOUS
  const rule8: CoachingRuleResult = {
    ruleId: "LOW_CONFIDENCE_AMBIGUOUS",
    priority: 9,
    isSafe: true,
    activated:
      confidenceScore < T.minConfidenceForDirectional &&
      partnerMsgCount >= T.minPartnerMessages,
    contextPhrase:
      "Signal quality is currently low — there is not enough conversation data for confident analysis. " +
      "Recommend keeping the next message light and curious. " +
      "Do NOT make strong claims about the partner's interest level. " +
      "Avoid suggesting escalation of any kind.",
  };

  return [rule1, rule2, rule3, rule4, rule5, rule6, rule7, rule8];
}

// ── Coaching context builder ──────────────────────────────────────────────────

/**
 * buildCoachingContextBlock
 *
 * Assembles a structured coaching context block from activated rules.
 * This block is appended to the LLM system prompt to guide suggestion quality.
 *
 * The block is English — internal context for the LLM, not user-facing.
 */
export function buildCoachingContextBlock(
  rules: CoachingRuleResult[],
  snapshot: SnapshotProxy
): string {
  const activated = rules
    .filter((r) => r.activated && r.isSafe)
    .sort((a, b) => b.priority - a.priority);

  if (activated.length === 0) {
    return [
      "=== CONVERSATION SIGNAL CONTEXT ===",
      `Stage: ${snapshot.stage}. PRS: ${snapshot.prsScore}/100. Confidence: ${snapshot.confidenceScore}/100.`,
      "No specific coaching rules activated. Generate balanced, warm, natural suggestions.",
      "=== END CONTEXT ===",
    ].join("\n");
  }

  const lines: string[] = [
    "=== CONVERSATION SIGNAL CONTEXT ===",
    `Stage: ${snapshot.stage}. PRS: ${snapshot.prsScore}/100. Confidence: ${snapshot.confidenceScore}/100.`,
    `Activated coaching rules (${activated.length}):`,
    ...activated.map((r, i) => `${i + 1}. [${r.ruleId}] ${r.contextPhrase}`),
    "",
    "COACHING GENERATION RULES (must follow all):",
    "- Never claim certainty about the partner's feelings.",
    "- Never use pressure tactics or urgency language.",
    "- Never use pickup-artist or manipulative framing.",
    "- All suggestions must be framed as options, not commands.",
    "- Tone: calm, warm, practical, non-absolute.",
    "=== END CONTEXT ===",
  ];

  return lines.join("\n");
}

// ── Main orchestrator ─────────────────────────────────────────────────────────

/**
 * runPrsCoaching
 *
 * Full orchestration:
 *  1. analyseRecentMessages(messages)
 *  2. evaluateCoachingRules(snapshot, patterns)
 *  3. buildCoachingContextBlock(rules, snapshot)
 *  4. Derive primaryDirective for logging
 */
export function runPrsCoaching(
  snapshot: SnapshotProxy,
  messages: Array<{ sender: string; text: string }>
): PrsCoachingOutput {
  const patterns = analyseRecentMessages(messages);
  const rules = evaluateCoachingRules(snapshot, patterns);
  const activatedRules = rules.filter((r) => r.activated && r.isSafe)
    .sort((a, b) => b.priority - a.priority);
  const coachingContextBlock = buildCoachingContextBlock(rules, snapshot);

  // Primary directive: highest priority activated rule's ID, or generic
  const primaryDirective =
    activatedRules[0]?.ruleId ?? "GENERAL_BALANCED_COACHING";

  const hasDirectionalAdvice = snapshot.confidenceScore >= THRESHOLDS.minConfidenceForDirectional;

  return {
    activatedRules,
    coachingContextBlock,
    primaryDirective,
    hasDirectionalAdvice,
  };
}

// ── Test scaffold ─────────────────────────────────────────────────────────────
//
// Run with: npx ts-node --esm src/lib/prsCoaching.ts
// (Only executes when this file is run directly, not when imported)

function makeSnapshot(overrides: Partial<SnapshotProxy>): SnapshotProxy {
  return {
    prsScore: 60,
    confidenceScore: 70,
    stage: "opening",
    lowConfidenceState: null,
    reasonCodes: [],
    featureBreakdown: {
      responsiveness: 0.6,
      reciprocity: 0.6,
      linguistic: 0.6,
      temporal: 0.6,
      warmth: 0.6,
      progression: 0.5,
      penaltyTotal: 0,
    },
    penaltyBreakdown: {},
    partnerMessages: 8,
    translation: { crossBorderConversation: true, translatedMessageRate: 0.7, localePair: "JP-KR" },
    ...overrides,
  };
}

export const TEST_CASES: Array<{ name: string; snapshot: SnapshotProxy; messages: Array<{ sender: string; text: string }> }> = [
  {
    name: "Case 1: Early stage — not enough data",
    snapshot: makeSnapshot({ confidenceScore: 25, partnerMessages: 2 }),
    messages: [{ sender: "them", text: "안녕하세요!" }, { sender: "me", text: "안녕하세요~" }],
  },
  {
    name: "Case 2: High warmth, low progression",
    snapshot: makeSnapshot({
      featureBreakdown: { responsiveness: 0.7, reciprocity: 0.7, linguistic: 0.7, temporal: 0.65, warmth: 0.82, progression: 0.25, penaltyTotal: 0 },
      reasonCodes: ["WARMTH_HIGH", "FOLLOW_UP_QUESTIONS_HIGH", "PROGRESSION_SIGNALS_WEAK"],
    }),
    messages: [
      { sender: "them", text: "요즘 뭐 하세요? 취미 있어요?" },
      { sender: "me", text: "저는 등산을 좋아해요. 그쪽은요?" },
    ],
  },
  {
    name: "Case 3: Strong progression signals",
    snapshot: makeSnapshot({
      prsScore: 78,
      confidenceScore: 85,
      featureBreakdown: { responsiveness: 0.75, reciprocity: 0.8, linguistic: 0.7, temporal: 0.78, warmth: 0.75, progression: 0.85, penaltyTotal: 0 },
      reasonCodes: ["AVAILABILITY_SHARED", "CALL_DATE_SIGNAL", "WARMTH_HIGH"],
    }),
    messages: [
      { sender: "them", text: "토요일 오후에 시간 돼요! 영상통화 어때요?" },
      { sender: "me", text: "좋아요!" },
    ],
  },
  {
    name: "Case 4: Mixed signals",
    snapshot: makeSnapshot({
      lowConfidenceState: "mixed_signals",
      reasonCodes: ["SIGNALS_MIXED", "REPLY_PATTERN_INCONSISTENT", "WARMTH_HIGH"],
    }),
    messages: [
      { sender: "them", text: "네..." },
      { sender: "me", text: "그렇군요! 그래서 말인데 저번에 얘기했던 부분이 사실 저한테 굉장히 인상 깊었어요." },
    ],
  },
  {
    name: "Case 5: Long message pattern",
    snapshot: makeSnapshot({ prsScore: 55 }),
    messages: [
      { sender: "me", text: "저도 사실 일본 문화에 관심이 많아요. 특히 애니메이션이나 음식 문화가 너무 좋아서 작년에 도쿄를 방문했을 때 정말 감동받았어요." },
      { sender: "them", text: "아 그래요?" },
      { sender: "me", text: "네 맞아요! 그리고 제가 어렸을 때부터 일본 만화를 많이 읽었는데 그게 계기가 됐던 것 같아요. 좋아하는 시리즈가 있으세요?" },
      { sender: "them", text: "드래곤볼이요." },
    ],
  },
  {
    name: "Case 6: Partner asks follow-up questions frequently",
    snapshot: makeSnapshot({
      featureBreakdown: { responsiveness: 0.82, reciprocity: 0.75, linguistic: 0.7, temporal: 0.72, warmth: 0.68, progression: 0.5, penaltyTotal: 0 },
      reasonCodes: ["FOLLOW_UP_QUESTIONS_HIGH", "TOPIC_CONTINUITY_STRONG"],
    }),
    messages: [
      { sender: "them", text: "그럼 한국에서 어디 살아요?" },
      { sender: "them", text: "어떤 음식 좋아해요?" },
      { sender: "them", text: "주말엔 주로 뭐 해요?" },
    ],
  },
  {
    name: "Case 7: Translation-heavy KR-JP conversation",
    snapshot: makeSnapshot({
      translation: { crossBorderConversation: true, translatedMessageRate: 0.3, localePair: "JP-KR" },
      confidenceScore: 55,
    }),
    messages: [
      { sender: "them", text: "こんにちは！韓国のご飯好きです" },
      { sender: "me", text: "저도 일본 음식 정말 좋아요!" },
    ],
  },
  {
    name: "Case 8: Low confidence, ambiguous",
    snapshot: makeSnapshot({
      prsScore: 48,
      confidenceScore: 30,
      partnerMessages: 6,
      lowConfidenceState: "low_confidence_hidden_score",
    }),
    messages: [
      { sender: "them", text: "음..." },
      { sender: "me", text: "ㅎㅎ" },
    ],
  },
];

// Self-test (only runs when executed directly)
if (typeof process !== "undefined" && process.argv[1]?.endsWith("prsCoaching.ts")) {
  console.log("=== PRS Coaching Rule Engine — Test Run ===\n");
  for (const tc of TEST_CASES) {
    const output = runPrsCoaching(tc.snapshot, tc.messages);
    console.log(`▶ ${tc.name}`);
    console.log(`  Primary directive: ${output.primaryDirective}`);
    console.log(`  Activated rules: ${output.activatedRules.map((r) => r.ruleId).join(", ") || "(none)"}`);
    console.log(`  Has directional advice: ${output.hasDirectionalAdvice}`);
    console.log();
  }
}
