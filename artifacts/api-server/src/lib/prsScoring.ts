// ─────────────────────────────────────────────────────────────────────────────
// lib/prsScoring.ts
//
// PRS Scoring Engine — converts extracted InterestFeatureWindow + LLM semantic
// scores into a structured ConversationInterestSnapshot.
//
// DESIGN PRINCIPLES:
//  • Pure functions — no side effects, no API calls, no database access.
//  • All configuration constants are at the top; nothing hardcoded inside logic.
//  • LLM outputs are injected as SemanticScores — this file doesn't call OpenAI.
//  • The route handler (routes/ai.ts) calls OpenAI, then delegates here.
//  • Framing: "engagement signals", never "love", "attraction", or "certainty".
//
// Public API:
//  detectConversationStageFromFeatureWindow(fw) → ConversationStage
//  computeGroupScores(fw, semanticScores)        → GroupScoreBreakdown
//  computePartnerReceptivityScore(groups, stage) → number (0–100)
//  computeConfidenceScore(fw)                    → { score, factors }
//  generateInterestReasonCodes(fw, groups, prs, cs, semanticScores) → { codes, insights }
//  generateConversationInterestSnapshot(fw, semanticScores, viewerLang) → ConversationInterestSnapshot
// ─────────────────────────────────────────────────────────────────────────────

// ── Configuration constants ───────────────────────────────────────────────────
// ALL thresholds and weights live here. Change here, not inside logic.

export const PRS_SCORING_CONFIG = {
  /** Semver for reproducibility. Increment when changing weights. */
  modelVersion: "1.0.0",

  /** Stage detection thresholds */
  stage: {
    openingMaxTurns: 30,     // Fewer than this = still in Opening
    openingMaxHours: 72,     // OR first message < 72h ago = Opening
    discoveryMaxTurns: 120,  // Beyond this + escalation signals = Escalation
  },

  /** Score display threshold — hide PRS when confidence is below this */
  minDisplayConfidence: 35,

  /** Stage-weighted group scores. Must sum to ~1.0 per stage. v1 priors. */
  stageWeights: {
    opening: {
      responsiveness: 0.26,
      reciprocity:    0.22,
      temporal:       0.18,
      warmth:         0.14,
      linguistic:     0.12,
      progression:    0.08,
    },
    discovery: {
      reciprocity:    0.22,
      linguistic:     0.18,
      responsiveness: 0.18,
      temporal:       0.14,
      progression:    0.14,
      warmth:         0.14,
    },
    escalation: {
      progression:    0.28,
      temporal:       0.20,
      reciprocity:    0.18,
      responsiveness: 0.14,
      linguistic:     0.10,
      warmth:         0.10,
    },
  } as Record<string, Record<string, number>>,

  /** Penalty signal weights. Penalty is subtracted before clamping. */
  penaltyWeights: {
    earlyOversharePenalty:           0.30,
    selfPromotionPenalty:            0.25,
    genericTemplatePenalty:          0.20,
    nonContingentTopicSwitchPenalty: 0.15,
    scamRiskPenalty:                 0.10,
  } as Record<string, number>,

  /** Penalty dampener — prevents penalty from swamping the score entirely. */
  penaltyDampeningFactor: 0.5,

  /** Confidence computation weights — six factors each 0–1, summing to CS. */
  confidenceWeights: {
    messageVolumeFactor:      0.20,
    partnerMessageFactor:     0.25,
    sessionCountFactor:       0.15,
    signalConsistencyFactor:  0.20,
    recentnessFactor:         0.10,
    translationReliabilityFactor: 0.10,
  } as Record<string, number>,

  /** Thresholds for each confidence factor. */
  confidenceThresholds: {
    messageVolumeMin: 5,    // below this: factor degrades linearly
    messageVolumeGood: 20,  // above this: full factor
    partnerMessagesMin: 3,  // below this: very low confidence
    partnerMessagesGood: 12,
    sessionsMin: 1,
    sessionsGood: 3,
    stalenessHours: 72,     // last message older than this = recency penalty
    translationMinRate: 0.4, // below this in cross-border: translation penalty
  },

  /** Feature thresholds for reason code generation. */
  reasonThresholds: {
    followUpHigh: 0.5,
    followUpLow: 0.2,
    contingentStrong: 0.5,
    replySpeedAbove: 0.65,
    replySpeedBelow: 0.35,
    consistencyHigh: 0.65,
    consistencyLow: 0.35,
    balanceGood: 0.65,
    balancePoor: 0.35,
    reinitiationHigh: 0.5,
    validationPresent: 0.35,
    warmthHigh: 0.55,
    authenticityHigh: 0.6,
    progressionPresent: 0.5,
    availabilityPresent: 0.5,
    callDatePresent: 0.5,
    templatePenaltyHigh: 0.3,
    selfPromoPenaltyHigh: 0.2,
    earlyOversharePenaltyHigh: 0.3,
    scamRiskPresent: 0.5,
  },
} as const;

// ── Type definitions used only in this module ─────────────────────────────────
// Imported from types, but defined inline here so the lib has no external deps.

export type ConversationStage = "opening" | "discovery" | "escalation";
export type ReasonCode = string; // Full enum lives in types/index.ts
export type LowConfidenceState =
  | "not_enough_data"
  | "mixed_signals"
  | "low_confidence_hidden_score"
  | null;

export interface SemanticScores {
  warmth: number;         // 0–1 — LLM scored
  authenticity: number;   // 0–1 — LLM scored
  linguisticMatch: number; // 0–1 — LLM scored
}

export interface GroupScoreBreakdown {
  responsiveness: number;
  reciprocity: number;
  linguistic: number;
  temporal: number;
  warmth: number;
  progression: number;
  penaltyTotal: number;
}

export interface ConfidenceFactors {
  messageVolumeFactor: number;
  partnerMessageFactor: number;
  sessionCountFactor: number;
  signalConsistencyFactor: number;
  recentnessFactor: number;
  translationReliabilityFactor: number;
}

export interface ConversationInsight {
  code: string;
  textKo: string;
  textJa: string;
  polarity: "positive" | "negative" | "neutral";
}

export interface ConversationInterestSnapshot {
  conversationId: string;
  myUserId: string;
  partnerUserId: string;
  stage: ConversationStage;
  prsScore: number;
  confidenceScore: number;
  lowConfidenceState: LowConfidenceState;
  featureBreakdown: GroupScoreBreakdown;
  penaltyBreakdown: Record<string, number>;
  reasonCodes: string[];
  generatedInsights: ConversationInsight[];
  generatedAt: string;
  modelVersion: string;
}

// ── Internal helpers ──────────────────────────────────────────────────────────

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const safeDivide = (n: number, d: number) => (d === 0 ? 0 : n / d);

/** Group average for a plain object of 0–1 numbers. */
function groupAvg(obj: Record<string, number>): number {
  const vals = Object.values(obj);
  return vals.length === 0 ? 0 : vals.reduce((s, v) => s + v, 0) / vals.length;
}

/** Weighted sum of an object's numeric values against a matching weights object. */
function weightedSum(
  values: Record<string, number>,
  weights: Record<string, number>
): number {
  let sum = 0;
  let wSum = 0;
  for (const [k, w] of Object.entries(weights)) {
    if (k in values) {
      sum += (values[k] ?? 0) * w;
      wSum += w;
    }
  }
  return wSum > 0 ? sum / wSum : 0;
}

/** Normalise a raw value linearly between lo (→ 0) and hi (→ 1). */
function linearNorm(v: number, lo: number, hi: number): number {
  if (hi <= lo) return 0;
  return clamp01((v - lo) / (hi - lo));
}

// ── Stage detection ───────────────────────────────────────────────────────────

/**
 * detectConversationStageFromFeatureWindow
 *
 * Determines the conversation stage from a serialized feature window object.
 * Called server-side from the route handler where a full Message[] is not
 * available — only the already-extracted feature metadata.
 *
 * HEURISTIC:
 *  Opening    → totalMessages < openingMaxTurns OR firstMsg < openingMaxHours ago
 *  Escalation → progression signals present (availability + call/date) AND past Opening
 *  Discovery  → everything else
 */
export function detectConversationStageFromFeatureWindow(
  fw: Record<string, unknown>
): ConversationStage {
  const cfg = PRS_SCORING_CONFIG.stage;
  const total = typeof fw.totalMessages === "number" ? fw.totalMessages : 0;
  const windowStart = typeof fw.timeWindowStart === "string" ? fw.timeWindowStart : null;

  // Opening: low message count OR very recent conversation start
  if (total < cfg.openingMaxTurns) return "opening";
  if (windowStart) {
    const hoursAgo = (Date.now() - Date.parse(windowStart)) / (60 * 60_000);
    if (hoursAgo < cfg.openingMaxHours) return "opening";
  }

  // Escalation: progression signals detected AND past opening thresholds
  const progression = (fw.progression ?? {}) as Record<string, number>;
  const hasEscalation =
    (progression.availabilitySharing ?? 0) > 0.5 ||
    (progression.callOrDateAcceptance ?? 0) > 0.5;

  if (total > cfg.openingMaxTurns && hasEscalation) return "escalation";

  return "discovery";
}

// ── Group score computation ───────────────────────────────────────────────────

/**
 * computeGroupScores
 *
 * Converts raw feature window fields into per-group 0–1 averages.
 * Injects LLM semantic scores into warmth (warmthScore, authenticityScore)
 * and linguistic (linguisticMatch) groups, overriding the heuristic baselines.
 *
 * Design: semantic scores "win" over heuristic proxies when available.
 * Fallback to heuristic value if semantic score is exactly 0.5 (default/missing).
 */
export function computeGroupScores(
  fw: Record<string, unknown>,
  semanticScores: SemanticScores
): GroupScoreBreakdown {
  const get = (group: string, key: string): number => {
    const g = (fw as Record<string, Record<string, number>>)[group];
    return g?.[key] ?? 0.5;
  };

  // Responsiveness
  const responsiveness = groupAvg({
    followUpQuestionRate: get("responsiveness", "followUpQuestionRate"),
    contingentReplyScore: get("responsiveness", "contingentReplyScore"),
    validationScore: get("responsiveness", "validationScore"),
  });

  // Reciprocity
  const reciprocity = groupAvg({
    disclosureTurnTaking: get("reciprocity", "disclosureTurnTaking"),
    disclosureBalance:    get("reciprocity", "disclosureBalance"),
    partnerReinitiation:  get("reciprocity", "partnerReinitiation"),
  });

  // Linguistic — inject LLM linguisticMatch alongside heuristic proxy fields
  const linguistic = groupAvg({
    lsmProxy:            get("linguistic", "lsmProxy"),
    topicAlignment:      get("linguistic", "topicAlignment"),
    formatAccommodation: get("linguistic", "formatAccommodation"),
    linguisticMatch:     semanticScores.linguisticMatch, // LLM score
  });

  // Temporal
  const temporal = groupAvg({
    baselineAdjustedReplySpeed: get("temporal", "baselineAdjustedReplySpeed"),
    replyConsistency:           get("temporal", "replyConsistency"),
  });

  // Warmth — inject LLM warmth + authenticity
  const warmth = groupAvg({
    otherFocusScore:  get("warmth", "otherFocusScore"),
    warmthScore:      semanticScores.warmth,       // LLM score
    authenticityScore: semanticScores.authenticity, // LLM score
  });

  // Progression
  const progression = groupAvg({
    futureOrientation:    get("progression", "futureOrientation"),
    availabilitySharing:  get("progression", "availabilitySharing"),
    callOrDateAcceptance: get("progression", "callOrDateAcceptance"),
  });

  // Penalty — weighted sum (already 0–1 for each signal)
  const penalties = (fw.penalties ?? {}) as Record<string, number>;
  const penaltyRaw = weightedSum(penalties, PRS_SCORING_CONFIG.penaltyWeights);
  // Dampen: a penaltyRaw of 1.0 should only reduce PRS by dampening factor, not eliminate it
  const penaltyTotal = clamp01(penaltyRaw * PRS_SCORING_CONFIG.penaltyDampeningFactor);

  return {
    responsiveness: clamp01(responsiveness),
    reciprocity:    clamp01(reciprocity),
    linguistic:     clamp01(linguistic),
    temporal:       clamp01(temporal),
    warmth:         clamp01(warmth),
    progression:    clamp01(progression),
    penaltyTotal,
  };
}

// ── PRS computation ───────────────────────────────────────────────────────────

/**
 * computePartnerReceptivityScore
 *
 * Applies stage-weighted formula to group scores, subtracts penalty, clamps,
 * and converts to 0–100 integer.
 *
 * Formula:
 *   PRS_raw = Σ(weight[group] × score[group])   (stage-specific weights)
 *   PRS_adjusted = clamp(PRS_raw - penaltyTotal, 0, 1)
 *   PRS = round(PRS_adjusted × 100)
 */
export function computePartnerReceptivityScore(
  groups: GroupScoreBreakdown,
  stage: ConversationStage
): number {
  const weights = PRS_SCORING_CONFIG.stageWeights[stage] ?? PRS_SCORING_CONFIG.stageWeights.opening;

  const prsRaw = weightedSum(
    {
      responsiveness: groups.responsiveness,
      reciprocity:    groups.reciprocity,
      linguistic:     groups.linguistic,
      temporal:       groups.temporal,
      warmth:         groups.warmth,
      progression:    groups.progression,
    },
    weights
  );

  const prsAdjusted = clamp01(prsRaw - groups.penaltyTotal);
  return Math.round(prsAdjusted * 100);
}

// ── Confidence score computation ──────────────────────────────────────────────

/**
 * computeConfidenceScore
 *
 * Computes a Confidence Score (0–100) and a per-factor breakdown.
 * Six weighted factors:
 *
 *  1. messageVolumeFactor       — total message count (more = more confident)
 *  2. partnerMessageFactor      — partner-only message count (we need their signals)
 *  3. sessionCountFactor        — number of distinct "sessions" detected
 *  4. signalConsistencyFactor   — temporal consistency of partner reply gaps
 *  5. recentnessFactor          — how recent the last message is
 *  6. translationReliabilityFactor — coverage of translation in cross-border chats
 *
 * HEURISTIC — v2 can use statistical calibration curves instead.
 */
export function computeConfidenceScore(fw: Record<string, unknown>): {
  score: number;
  factors: ConfidenceFactors;
} {
  const thresholds = PRS_SCORING_CONFIG.confidenceThresholds;
  const total = typeof fw.totalMessages === "number" ? fw.totalMessages : 0;
  const partnerMsgs = typeof fw.partnerMessages === "number" ? fw.partnerMessages : 0;
  const windowEnd = typeof fw.timeWindowEnd === "string" ? fw.timeWindowEnd : new Date().toISOString();
  const translation = (fw.translation ?? {}) as Record<string, unknown>;
  const temporal = (fw.temporal ?? {}) as Record<string, number>;

  // 1. messageVolumeFactor
  const messageVolumeFactor = linearNorm(
    total,
    thresholds.messageVolumeMin,
    thresholds.messageVolumeGood
  );

  // 2. partnerMessageFactor — strongest signal: we need partner data to score partner
  const partnerMessageFactor = linearNorm(
    partnerMsgs,
    thresholds.partnerMessagesMin,
    thresholds.partnerMessagesGood
  );

  // 3. sessionCountFactor
  // Estimate sessions from message gaps (not directly available in feature window).
  // Proxy: if partnerMessages >= 5 and there's been ≥1 re-initiation, assume 2+ sessions.
  const partnerReinitiation = (fw as Record<string, Record<string, number>>).reciprocity
    ?.partnerReinitiation ?? 0;
  const estimatedSessions = partnerMsgs >= 8 ? (partnerReinitiation > 0.3 ? 3 : 2) : 1;
  const sessionCountFactor = linearNorm(
    estimatedSessions,
    thresholds.sessionsMin,
    thresholds.sessionsGood
  );

  // 4. signalConsistencyFactor — higher temporal consistency = more reliable signals
  const replyConsistency = temporal.replyConsistency ?? 0.5;
  const signalConsistencyFactor = replyConsistency;

  // 5. recentnessFactor — data older than stalenessHours gets penalised
  const lastMsgAgeHours = (Date.now() - Date.parse(windowEnd)) / (60 * 60_000);
  const recentnessFactor = clamp01(
    1 - (lastMsgAgeHours / thresholds.stalenessHours) * 0.8
  );

  // 6. translationReliabilityFactor
  const isCrossBorder = translation.crossBorderConversation === true;
  const translatedRate = typeof translation.translatedMessageRate === "number"
    ? translation.translatedMessageRate
    : 1.0;
  let translationReliabilityFactor: number;
  if (!isCrossBorder) {
    translationReliabilityFactor = 1.0; // Same language: no translation uncertainty
  } else {
    translationReliabilityFactor = clamp(
      linearNorm(translatedRate, thresholds.translationMinRate, 1.0),
      0.3,  // Even with 0% translation, some confidence remains (sender's raw text)
      1.0
    );
  }

  const factors: ConfidenceFactors = {
    messageVolumeFactor,
    partnerMessageFactor,
    sessionCountFactor,
    signalConsistencyFactor,
    recentnessFactor,
    translationReliabilityFactor,
  };

  const rawScore = weightedSum(factors as unknown as Record<string, number>, PRS_SCORING_CONFIG.confidenceWeights);
  const score = Math.round(clamp01(rawScore) * 100);

  return { score, factors };
}

// ── Low confidence state ──────────────────────────────────────────────────────

/**
 * deriveLowConfidenceState
 *
 * Determines whether the PRS should be hidden, shown with a caveat,
 * or shown normally based on confidence score and signal mix.
 */
export function deriveLowConfidenceState(
  confidenceScore: number,
  positiveCodeCount: number,
  negativeCodeCount: number
): LowConfidenceState {
  const minDisplay = PRS_SCORING_CONFIG.minDisplayConfidence;

  if (confidenceScore < minDisplay) return "not_enough_data";

  // Low confidence but above threshold — hide score, show explanation
  if (confidenceScore < minDisplay + 15) return "low_confidence_hidden_score";

  // Mixed signals (roughly equal positive and negative reason codes)
  const totalCodes = positiveCodeCount + negativeCodeCount;
  if (
    totalCodes >= 4 &&
    positiveCodeCount > 0 &&
    negativeCodeCount > 0 &&
    Math.abs(positiveCodeCount - negativeCodeCount) <= 1
  ) {
    return "mixed_signals";
  }

  return null; // Normal display
}

// ── Reason code generation ────────────────────────────────────────────────────

/** A reason code with both bilingual text and polarity. */
const INSIGHTS_CATALOG: Record<
  string,
  { textKo: string; textJa: string; polarity: "positive" | "negative" | "neutral" }
> = {
  NOT_ENOUGH_DATA: {
    textKo: "아직 대화 데이터가 충분하지 않아요. 더 대화를 나눠보세요.",
    textJa: "まだ会話データが十分ではありません。もう少し話してみましょう。",
    polarity: "neutral",
  },
  FOLLOW_UP_QUESTIONS_HIGH: {
    textKo: "상대방이 자주 질문을 이어가고 있어요",
    textJa: "相手が頻繁に質問を続けています",
    polarity: "positive",
  },
  FOLLOW_UP_QUESTIONS_LOW: {
    textKo: "상대방이 질문을 잘 하지 않아요",
    textJa: "相手があまり質問をしていません",
    polarity: "negative",
  },
  TOPIC_CONTINUITY_STRONG: {
    textKo: "상대방이 대화 맥락을 자연스럽게 이어가고 있어요",
    textJa: "相手が会話の文脈を自然に続けています",
    polarity: "positive",
  },
  REPLY_SPEED_ABOVE_BASELINE: {
    textKo: "상대방이 초반보다 더 빠르게 답장하고 있어요",
    textJa: "相手は最初より速く返信しています",
    polarity: "positive",
  },
  REPLY_SPEED_BELOW_BASELINE: {
    textKo: "상대방의 답장이 처음보다 느려졌어요",
    textJa: "相手の返信が最初より遅くなっています",
    polarity: "negative",
  },
  REPLY_PATTERN_CONSISTENT: {
    textKo: "상대방이 일정한 패턴으로 답장하고 있어요",
    textJa: "相手は一定のパターンで返信しています",
    polarity: "positive",
  },
  REPLY_PATTERN_INCONSISTENT: {
    textKo: "상대방의 답장 패턴이 불규칙해요",
    textJa: "相手の返信パターンが不規則です",
    polarity: "negative",
  },
  DISCLOSURE_IS_BALANCED: {
    textKo: "대화 참여 깊이가 양쪽 모두 비슷해요",
    textJa: "お互いの会話の深さがほぼ同じです",
    polarity: "positive",
  },
  DISCLOSURE_IMBALANCED: {
    textKo: "대화가 한쪽으로 치우쳐져 있어요",
    textJa: "会話が一方的になっています",
    polarity: "negative",
  },
  PARTNER_REINITIATES: {
    textKo: "상대방이 먼저 대화를 다시 시작한 적이 있어요",
    textJa: "相手が会話を再び始めたことがあります",
    polarity: "positive",
  },
  VALIDATION_PRESENT: {
    textKo: "상대방이 공감과 반응을 잘 표현해요",
    textJa: "相手が共感と反応をよく示しています",
    polarity: "positive",
  },
  WARMTH_HIGH: {
    textKo: "대화 전반에 따뜻한 분위기가 느껴져요",
    textJa: "会話全体に温かい雰囲気が感じられます",
    polarity: "positive",
  },
  AUTHENTICITY_HIGH: {
    textKo: "상대방의 메시지가 구체적이고 진실된 느낌이에요",
    textJa: "相手のメッセージが具体的で誠実な感じがします",
    polarity: "positive",
  },
  PROGRESSION_SIGNALS_PRESENT: {
    textKo: "앞으로의 만남에 대한 긍정적인 신호가 있어요",
    textJa: "今後の出会いに前向きなサインがあります",
    polarity: "positive",
  },
  PROGRESSION_SIGNALS_WEAK: {
    textKo: "아직 다음 단계를 위한 신호가 뚜렷하지 않아요",
    textJa: "まだ次のステップへのサインが明確ではありません",
    polarity: "neutral",
  },
  AVAILABILITY_SHARED: {
    textKo: "상대방이 구체적인 시간 가능 여부를 공유했어요",
    textJa: "相手が具体的な空き時間を共有しました",
    polarity: "positive",
  },
  CALL_DATE_SIGNAL: {
    textKo: "통화나 만남에 긍정적인 신호가 있어요",
    textJa: "通話や会いたいという前向きなサインがあります",
    polarity: "positive",
  },
  SIGNALS_MIXED: {
    textKo: "긍정적인 신호와 아닌 신호가 함께 보여요",
    textJa: "ポジティブなシグナルとそうでないシグナルが混在しています",
    polarity: "neutral",
  },
  TRANSLATION_CONTEXT_LIMITED: {
    textKo: "번역 정보가 부족해 일부 신호는 불확실해요",
    textJa: "翻訳情報が不足しているため、一部のシグナルは不確かです",
    polarity: "neutral",
  },
  TEMPLATE_REPLY_PENALTY: {
    textKo: "상대방의 메시지가 다소 형식적으로 느껴져요",
    textJa: "相手のメッセージがやや定型的に感じられます",
    polarity: "negative",
  },
  SELF_PROMOTION_PENALTY: {
    textKo: "상대방이 자기 이야기를 많이 하는 경향이 있어요",
    textJa: "相手が自分の話をしがちな傾向があります",
    polarity: "negative",
  },
  EARLY_OVERSHARE_PENALTY: {
    textKo: "초반에 개인적인 내용을 많이 공유했어요",
    textJa: "序盤に個人的な内容をたくさん共有しています",
    polarity: "negative",
  },
  SCAM_RISK_DETECTED: {
    textKo: "⚠️ 주의가 필요한 표현이 감지됐어요",
    textJa: "⚠️ 注意が必要な表現が検出されました",
    polarity: "negative",
  },
};

/**
 * generateInterestReasonCodes
 *
 * Evaluates feature scores and semantic overrides against thresholds to produce:
 *  - reasonCodes: machine-readable string array (for analytics + UI icons)
 *  - insights:    structured bilingual ConversationInsight[] for UI display
 *
 * Priority order: scam risk > progression > responsiveness > reciprocity >
 *   temporal > warmth > linguistic > penalties
 *
 * Max 6 reason codes returned (sorted: positive first, then negative).
 */
export function generateInterestReasonCodes(
  fw: Record<string, unknown>,
  groups: GroupScoreBreakdown,
  prs: number,
  confidenceScore: number,
  semanticScores: SemanticScores
): { reasonCodes: string[]; generatedInsights: ConversationInsight[] } {
  const t = PRS_SCORING_CONFIG.reasonThresholds;
  const get = (group: string, key: string): number => {
    const g = (fw as Record<string, Record<string, number>>)[group];
    return g?.[key] ?? 0;
  };

  // Low confidence override — single reason
  const partnerMsgs = typeof fw.partnerMessages === "number" ? fw.partnerMessages : 0;
  if (confidenceScore < PRS_SCORING_CONFIG.minDisplayConfidence || partnerMsgs < 3) {
    const insight = INSIGHTS_CATALOG["NOT_ENOUGH_DATA"];
    return {
      reasonCodes: ["NOT_ENOUGH_DATA"],
      generatedInsights: [{ code: "NOT_ENOUGH_DATA", ...insight }],
    };
  }

  const codes: string[] = [];

  // ── Scam risk (always first if present) ───────────────────────────────────
  if (get("penalties", "scamRiskPenalty") >= t.scamRiskPresent) {
    codes.push("SCAM_RISK_DETECTED");
  }

  // ── Responsiveness signals ─────────────────────────────────────────────────
  if (get("responsiveness", "followUpQuestionRate") >= t.followUpHigh) {
    codes.push("FOLLOW_UP_QUESTIONS_HIGH");
  } else if (get("responsiveness", "followUpQuestionRate") < t.followUpLow) {
    codes.push("FOLLOW_UP_QUESTIONS_LOW");
  }

  if (get("responsiveness", "contingentReplyScore") >= t.contingentStrong) {
    codes.push("TOPIC_CONTINUITY_STRONG");
  }

  if (get("responsiveness", "validationScore") >= t.validationPresent) {
    codes.push("VALIDATION_PRESENT");
  }

  // ── Temporal signals ───────────────────────────────────────────────────────
  if (get("temporal", "baselineAdjustedReplySpeed") >= t.replySpeedAbove) {
    codes.push("REPLY_SPEED_ABOVE_BASELINE");
  } else if (get("temporal", "baselineAdjustedReplySpeed") <= t.replySpeedBelow) {
    codes.push("REPLY_SPEED_BELOW_BASELINE");
  }

  if (get("temporal", "replyConsistency") >= t.consistencyHigh) {
    codes.push("REPLY_PATTERN_CONSISTENT");
  } else if (get("temporal", "replyConsistency") <= t.consistencyLow) {
    codes.push("REPLY_PATTERN_INCONSISTENT");
  }

  // ── Reciprocity signals ────────────────────────────────────────────────────
  if (get("reciprocity", "disclosureBalance") >= t.balanceGood) {
    codes.push("DISCLOSURE_IS_BALANCED");
  } else if (get("reciprocity", "disclosureBalance") < t.balancePoor) {
    codes.push("DISCLOSURE_IMBALANCED");
  }

  if (get("reciprocity", "partnerReinitiation") >= t.reinitiationHigh) {
    codes.push("PARTNER_REINITIATES");
  }

  // ── Warmth + authenticity (semantic) ──────────────────────────────────────
  if (semanticScores.warmth >= t.warmthHigh) {
    codes.push("WARMTH_HIGH");
  }
  if (semanticScores.authenticity >= t.authenticityHigh) {
    codes.push("AUTHENTICITY_HIGH");
  }

  // ── Progression signals ────────────────────────────────────────────────────
  if (get("progression", "callOrDateAcceptance") >= t.callDatePresent) {
    codes.push("CALL_DATE_SIGNAL");
  } else if (get("progression", "availabilitySharing") >= t.availabilityPresent) {
    codes.push("AVAILABILITY_SHARED");
  }

  const hasProgressionSignal =
    get("progression", "futureOrientation") >= t.progressionPresent ||
    get("progression", "availabilitySharing") >= t.availabilityPresent ||
    get("progression", "callOrDateAcceptance") >= t.callDatePresent;

  if (hasProgressionSignal) {
    if (!codes.includes("CALL_DATE_SIGNAL") && !codes.includes("AVAILABILITY_SHARED")) {
      codes.push("PROGRESSION_SIGNALS_PRESENT");
    }
  } else {
    codes.push("PROGRESSION_SIGNALS_WEAK");
  }

  // ── Penalty signals ────────────────────────────────────────────────────────
  if (get("penalties", "genericTemplatePenalty") >= t.templatePenaltyHigh) {
    codes.push("TEMPLATE_REPLY_PENALTY");
  }
  if (get("penalties", "selfPromotionPenalty") >= t.selfPromoPenaltyHigh) {
    codes.push("SELF_PROMOTION_PENALTY");
  }
  if (get("penalties", "earlyOversharePenalty") >= t.earlyOversharePenaltyHigh) {
    codes.push("EARLY_OVERSHARE_PENALTY");
  }

  // ── Translation reliability ────────────────────────────────────────────────
  const translation = (fw.translation ?? {}) as Record<string, unknown>;
  if (
    translation.crossBorderConversation === true &&
    typeof translation.translatedMessageRate === "number" &&
    translation.translatedMessageRate < 0.4
  ) {
    codes.push("TRANSLATION_CONTEXT_LIMITED");
  }

  // ── Dedup + sort: positive first, then neutral, then negative ─────────────
  const uniqueCodes = [...new Set(codes)];
  const priority = (code: string): number => {
    const polarity = INSIGHTS_CATALOG[code]?.polarity ?? "neutral";
    return polarity === "positive" ? 0 : polarity === "neutral" ? 1 : 2;
  };
  uniqueCodes.sort((a, b) => priority(a) - priority(b));

  // Cap at 6 reason codes for UI
  const topCodes = uniqueCodes.slice(0, 6);

  const generatedInsights: ConversationInsight[] = topCodes
    .map((code) => {
      const entry = INSIGHTS_CATALOG[code];
      if (!entry) return null;
      return { code, ...entry };
    })
    .filter((x): x is ConversationInsight => x !== null)
    .slice(0, 4); // Cap insights at 4 for UI display

  return { reasonCodes: topCodes, generatedInsights };
}

// ── Snapshot orchestrator ─────────────────────────────────────────────────────

/**
 * generateConversationInterestSnapshot
 *
 * The single public entry point for the scoring engine.
 * Called by routes/ai.ts after LLM semantic scoring is complete.
 *
 * Orchestration:
 *  1. detectConversationStageFromFeatureWindow(fw)
 *  2. computeGroupScores(fw, semanticScores)
 *  3. computePartnerReceptivityScore(groups, stage)
 *  4. computeConfidenceScore(fw)
 *  5. deriveLowConfidenceState(cs, positiveCount, negativeCount)
 *  6. generateInterestReasonCodes(fw, groups, prs, cs, semanticScores)
 *  7. Assemble ConversationInterestSnapshot
 */
export function generateConversationInterestSnapshot(
  fw: Record<string, unknown>,
  semanticScores: SemanticScores,
): ConversationInterestSnapshot {
  // Step 1: Stage
  // Use the stage field if already computed client-side, or re-derive it.
  const stage: ConversationStage =
    (fw.stage as ConversationStage | undefined) ??
    detectConversationStageFromFeatureWindow(fw);

  // Step 2: Group scores
  const groups = computeGroupScores(fw, semanticScores);

  // Step 3: PRS
  const prsScore = computePartnerReceptivityScore(groups, stage);

  // Step 4: Confidence
  const { score: confidenceScore } = computeConfidenceScore(fw);

  // Step 5: Reason codes
  const { reasonCodes, generatedInsights } = generateInterestReasonCodes(
    fw, groups, prsScore, confidenceScore, semanticScores
  );

  // Step 6: Low confidence state
  const positiveCount = generatedInsights.filter((i) => i.polarity === "positive").length;
  const negativeCount = generatedInsights.filter((i) => i.polarity === "negative").length;
  const lowConfidenceState = deriveLowConfidenceState(
    confidenceScore,
    positiveCount,
    negativeCount
  );

  return {
    conversationId: String(fw.conversationId ?? ""),
    myUserId: String(fw.myUserId ?? ""),
    partnerUserId: String(fw.partnerUserId ?? ""),
    stage,
    prsScore,
    confidenceScore,
    lowConfidenceState,
    featureBreakdown: groups,
    penaltyBreakdown: (fw.penalties ?? {}) as Record<string, number>,
    reasonCodes,
    generatedInsights,
    generatedAt: new Date().toISOString(),
    modelVersion: PRS_SCORING_CONFIG.modelVersion,
  };
}
