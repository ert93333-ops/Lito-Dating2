// ─────────────────────────────────────────────────────────────────────────────
// data/prsDebugData.ts
//
// Mock PRS debug snapshots for the admin PRS Inspector page.
// Each entry represents a fully-materialised ConversationInterestSnapshot
// plus admin-only context (userId, partnerId, featureBreakdown, confidenceComponents).
//
// In production, this data would be fetched from the API or a log store.
// Shape mirrors lib/prsScoring.ts + ConversationInterestSnapshot.
// ─────────────────────────────────────────────────────────────────────────────

export type LocalePair = "KR-KR" | "KR-JP" | "JP-KR" | "JP-JP";
export type ConversationStage = "opening" | "discovery" | "escalation";

export type LowConfidenceState =
  | "not_enough_data"
  | "mixed_signals"
  | "low_confidence_hidden_score"
  | null;

export interface PrsFeatureBreakdown {
  responsiveness: number;
  reciprocity: number;
  linguisticMatching: number;
  temporalEngagement: number;
  warmth: number;
  progression: number;
}

export interface PrsPenaltyBreakdown {
  earlyOversharePenalty: number;
  selfPromotionPenalty: number;
  genericTemplatePenalty: number;
  nonContingentTopicSwitchPenalty: number;
  scamRiskPenalty: number;
}

export interface PrsRawSignals {
  followUpQuestionRate: number;
  topicContinuitySignal: number;
  disclosureBalance: number;
  partnerReinitiation: number;
  baselineAdjustedReplySpeed: number;
  availabilitySharingDetected: boolean;
  progressionTriggerDetected: boolean;
}

export interface PrsConfidenceComponents {
  messageVolumeFactor: number;
  sessionCountFactor: number;
  signalConsistencyFactor: number;
  recentnessFactor: number;
  translationReliabilityFactor: number;
}

export interface PrsGeneratedInsight {
  reasonCode: string;
  textKo: string;
  textJa: string;
  polarity: "positive" | "negative" | "neutral";
}

export interface PrsSnapshotHistory {
  snappedAt: string;
  prsScore: number;
  confidenceScore: number;
  stage: ConversationStage;
  primaryReasonCode: string;
}

export interface AdminPrsSnapshot {
  snapshotId: string;

  conversationId: string;
  userId: string;
  partnerId: string;
  localePair: LocalePair;
  createdAt: string;
  lastActiveAt: string;
  totalTurns: number;
  partnerMessageCount: number;
  stage: ConversationStage;
  modelVersion: string;
  featureVersion: string;

  prsScore: number;
  confidenceScore: number;
  lowConfidenceState: LowConfidenceState;
  publicFacingState: "strong" | "moderate" | "mixed" | "low" | "hidden" | "insufficient";

  featureBreakdown: PrsFeatureBreakdown;
  penaltyBreakdown: PrsPenaltyBreakdown;
  rawSignals: PrsRawSignals;
  confidenceComponents: PrsConfidenceComponents;
  generatedInsights: PrsGeneratedInsight[];
  reasonCodes: string[];
  snapshotHistory: PrsSnapshotHistory[];

  debugFlags: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// 8 mock snapshots covering major scenarios
// ─────────────────────────────────────────────────────────────────────────────

export const PRS_DEBUG_SNAPSHOTS: AdminPrsSnapshot[] = [
  // ── S1: 강한 진전 (에스컬레이션) ───────────────────────────────────────────
  {
    snapshotId: "snap_001",
    conversationId: "conv_4f8a2b",
    userId: "user_kr_001",
    partnerId: "user_jp_042",
    localePair: "KR-JP",
    createdAt: "2026-04-01T09:00:00Z",
    lastActiveAt: "2026-04-08T06:30:00Z",
    totalTurns: 55,
    partnerMessageCount: 25,
    stage: "escalation",
    modelVersion: "v1",
    featureVersion: "v1",
    prsScore: 65,
    confidenceScore: 94,
    lowConfidenceState: null,
    publicFacingState: "strong",
    featureBreakdown: {
      responsiveness: 0.70,
      reciprocity: 0.78,
      linguisticMatching: 0.68,
      temporalEngagement: 0.72,
      warmth: 0.73,
      progression: 0.82,
    },
    penaltyBreakdown: {
      earlyOversharePenalty: 0,
      selfPromotionPenalty: 0,
      genericTemplatePenalty: 0,
      nonContingentTopicSwitchPenalty: 0,
      scamRiskPenalty: 0,
    },
    rawSignals: {
      followUpQuestionRate: 0.70,
      topicContinuitySignal: 0.65,
      disclosureBalance: 0.75,
      partnerReinitiation: 0.60,
      baselineAdjustedReplySpeed: 0.75,
      availabilitySharingDetected: true,
      progressionTriggerDetected: true,
    },
    confidenceComponents: {
      messageVolumeFactor: 0.95,
      sessionCountFactor: 0.90,
      signalConsistencyFactor: 0.92,
      recentnessFactor: 0.97,
      translationReliabilityFactor: 0.88,
    },
    generatedInsights: [
      { reasonCode: "CALL_DATE_SIGNAL", textKo: "통화/만남 의향이 감지됐어요.", textJa: "通話・会う意欲が感じられます。", polarity: "positive" },
      { reasonCode: "FOLLOW_UP_QUESTIONS_HIGH", textKo: "상대방이 내 이야기에 계속 질문해요.", textJa: "相手が私の話に続けて質問しています。", polarity: "positive" },
      { reasonCode: "TOPIC_CONTINUITY_STRONG", textKo: "대화 주제가 자연스럽게 이어지고 있어요.", textJa: "会話のトピックが自然につながっています。", polarity: "positive" },
      { reasonCode: "AVAILABILITY_SHARED", textKo: "상대방이 시간 가능 여부를 공유했어요.", textJa: "相手が時間の都合を共有しました。", polarity: "positive" },
      { reasonCode: "REPLY_SPEED_ABOVE_BASELINE", textKo: "평소보다 빠르게 답장하고 있어요.", textJa: "普段より速く返信しています。", polarity: "positive" },
      { reasonCode: "REPLY_PATTERN_CONSISTENT", textKo: "일관된 답장 패턴을 보이고 있어요.", textJa: "一貫した返信パターンが見られます。", polarity: "positive" },
    ],
    reasonCodes: ["CALL_DATE_SIGNAL", "FOLLOW_UP_QUESTIONS_HIGH", "TOPIC_CONTINUITY_STRONG", "AVAILABILITY_SHARED", "REPLY_SPEED_ABOVE_BASELINE", "REPLY_PATTERN_CONSISTENT"],
    snapshotHistory: [
      { snappedAt: "2026-04-03T10:00:00Z", prsScore: 28, confidenceScore: 72, stage: "opening", primaryReasonCode: "FOLLOW_UP_QUESTIONS_HIGH" },
      { snappedAt: "2026-04-05T14:00:00Z", prsScore: 42, confidenceScore: 85, stage: "discovery", primaryReasonCode: "TOPIC_CONTINUITY_STRONG" },
      { snappedAt: "2026-04-06T09:30:00Z", prsScore: 55, confidenceScore: 90, stage: "discovery", primaryReasonCode: "AVAILABILITY_SHARED" },
      { snappedAt: "2026-04-07T18:00:00Z", prsScore: 61, confidenceScore: 93, stage: "escalation", primaryReasonCode: "CALL_DATE_SIGNAL" },
      { snappedAt: "2026-04-08T06:30:00Z", prsScore: 65, confidenceScore: 94, stage: "escalation", primaryReasonCode: "CALL_DATE_SIGNAL" },
    ],
    debugFlags: [],
  },

  // ── S2: 혼합 신호 (mixed_signals) ─────────────────────────────────────────
  {
    snapshotId: "snap_002",
    conversationId: "conv_7c1e9d",
    userId: "user_kr_017",
    partnerId: "user_jp_088",
    localePair: "KR-JP",
    createdAt: "2026-04-02T11:00:00Z",
    lastActiveAt: "2026-04-08T04:10:00Z",
    totalTurns: 38,
    partnerMessageCount: 17,
    stage: "discovery",
    modelVersion: "v1",
    featureVersion: "v1",
    prsScore: 34,
    confidenceScore: 77,
    lowConfidenceState: "mixed_signals",
    publicFacingState: "mixed",
    featureBreakdown: {
      responsiveness: 0.62,
      reciprocity: 0.60,
      linguisticMatching: 0.61,
      temporalEngagement: 0.22,
      warmth: 0.58,
      progression: 0.08,
    },
    penaltyBreakdown: {
      earlyOversharePenalty: 0,
      selfPromotionPenalty: 0,
      genericTemplatePenalty: 0,
      nonContingentTopicSwitchPenalty: 0,
      scamRiskPenalty: 0,
    },
    rawSignals: {
      followUpQuestionRate: 0.55,
      topicContinuitySignal: 0.65,
      disclosureBalance: 0.60,
      partnerReinitiation: 0,
      baselineAdjustedReplySpeed: 0.20,
      availabilitySharingDetected: false,
      progressionTriggerDetected: false,
    },
    confidenceComponents: {
      messageVolumeFactor: 0.80,
      sessionCountFactor: 0.70,
      signalConsistencyFactor: 0.55,
      recentnessFactor: 0.85,
      translationReliabilityFactor: 0.82,
    },
    generatedInsights: [
      { reasonCode: "FOLLOW_UP_QUESTIONS_HIGH", textKo: "상대방이 내 이야기에 계속 질문해요.", textJa: "相手が私の話に続けて質問しています。", polarity: "positive" },
      { reasonCode: "TOPIC_CONTINUITY_STRONG", textKo: "대화 주제가 자연스럽게 이어지고 있어요.", textJa: "会話のトピックが自然につながっています。", polarity: "positive" },
      { reasonCode: "VALIDATION_PRESENT", textKo: "상대방이 내 말에 공감하고 있어요.", textJa: "相手が私の言葉に共感しています。", polarity: "positive" },
      { reasonCode: "PROGRESSION_SIGNALS_WEAK", textKo: "아직 만남이나 통화 진전 신호가 없어요.", textJa: "まだ会いたい・電話したいという進展シグナルがありません。", polarity: "negative" },
      { reasonCode: "REPLY_SPEED_BELOW_BASELINE", textKo: "평소보다 답장이 늦어지고 있어요.", textJa: "普段より返信が遅くなっています。", polarity: "negative" },
      { reasonCode: "REPLY_PATTERN_INCONSISTENT", textKo: "답장 패턴이 불규칙해요.", textJa: "返信パターンが不規則です。", polarity: "negative" },
    ],
    reasonCodes: ["FOLLOW_UP_QUESTIONS_HIGH", "TOPIC_CONTINUITY_STRONG", "VALIDATION_PRESENT", "PROGRESSION_SIGNALS_WEAK", "REPLY_SPEED_BELOW_BASELINE", "REPLY_PATTERN_INCONSISTENT"],
    snapshotHistory: [
      { snappedAt: "2026-04-04T08:00:00Z", prsScore: 38, confidenceScore: 65, stage: "opening", primaryReasonCode: "FOLLOW_UP_QUESTIONS_HIGH" },
      { snappedAt: "2026-04-06T10:00:00Z", prsScore: 36, confidenceScore: 72, stage: "discovery", primaryReasonCode: "REPLY_SPEED_BELOW_BASELINE" },
      { snappedAt: "2026-04-08T04:10:00Z", prsScore: 34, confidenceScore: 77, stage: "discovery", primaryReasonCode: "REPLY_SPEED_BELOW_BASELINE" },
    ],
    debugFlags: ["mixed_signals_drift"],
  },

  // ── S3: 스캠 리스크 (low_confidence_hidden_score) ──────────────────────────
  {
    snapshotId: "snap_003",
    conversationId: "conv_2a9f1e",
    userId: "user_kr_005",
    partnerId: "user_jp_013",
    localePair: "KR-JP",
    createdAt: "2026-04-03T07:00:00Z",
    lastActiveAt: "2026-04-08T07:00:00Z",
    totalTurns: 35,
    partnerMessageCount: 16,
    stage: "discovery",
    modelVersion: "v1",
    featureVersion: "v1",
    prsScore: 41,
    confidenceScore: 45,
    lowConfidenceState: "low_confidence_hidden_score",
    publicFacingState: "hidden",
    featureBreakdown: {
      responsiveness: 0.68,
      reciprocity: 0.65,
      linguisticMatching: 0.63,
      temporalEngagement: 0.73,
      warmth: 0.63,
      progression: 0.10,
    },
    penaltyBreakdown: {
      earlyOversharePenalty: 0,
      selfPromotionPenalty: 0,
      genericTemplatePenalty: 0,
      nonContingentTopicSwitchPenalty: 0,
      scamRiskPenalty: 0.80,
    },
    rawSignals: {
      followUpQuestionRate: 0.70,
      topicContinuitySignal: 0.60,
      disclosureBalance: 0.60,
      partnerReinitiation: 0.30,
      baselineAdjustedReplySpeed: 0.75,
      availabilitySharingDetected: false,
      progressionTriggerDetected: false,
    },
    confidenceComponents: {
      messageVolumeFactor: 0.75,
      sessionCountFactor: 0.60,
      signalConsistencyFactor: 0.40,
      recentnessFactor: 0.92,
      translationReliabilityFactor: 0.80,
    },
    generatedInsights: [
      { reasonCode: "FOLLOW_UP_QUESTIONS_HIGH", textKo: "상대방이 내 이야기에 계속 질문해요.", textJa: "相手が私の話に続けて質問しています。", polarity: "positive" },
      { reasonCode: "TOPIC_CONTINUITY_STRONG", textKo: "대화 주제가 자연스럽게 이어지고 있어요.", textJa: "会話のトピックが자然につながっています。", polarity: "positive" },
      { reasonCode: "VALIDATION_PRESENT", textKo: "상대방이 내 말에 공감하고 있어요.", textJa: "相手が私の言葉に共感しています。", polarity: "positive" },
      { reasonCode: "REPLY_SPEED_ABOVE_BASELINE", textKo: "평소보다 빠르게 답장하고 있어요.", textJa: "普段より速く返信しています。", polarity: "positive" },
      { reasonCode: "REPLY_PATTERN_CONSISTENT", textKo: "일관된 답장 패턴을 보이고 있어요.", textJa: "一貫した返信パターンが見られます。", polarity: "positive" },
      { reasonCode: "SCAM_RISK_DETECTED", textKo: "이 대화에서 주의가 필요한 신호가 감지됐어요.", textJa: "この会話で注意が必要なシグナルが検出されました。", polarity: "negative" },
    ],
    reasonCodes: ["FOLLOW_UP_QUESTIONS_HIGH", "TOPIC_CONTINUITY_STRONG", "VALIDATION_PRESENT", "REPLY_SPEED_ABOVE_BASELINE", "REPLY_PATTERN_CONSISTENT", "SCAM_RISK_DETECTED"],
    snapshotHistory: [
      { snappedAt: "2026-04-04T12:00:00Z", prsScore: 44, confidenceScore: 62, stage: "opening", primaryReasonCode: "FOLLOW_UP_QUESTIONS_HIGH" },
      { snappedAt: "2026-04-06T09:00:00Z", prsScore: 42, confidenceScore: 50, stage: "discovery", primaryReasonCode: "SCAM_RISK_DETECTED" },
      { snappedAt: "2026-04-08T07:00:00Z", prsScore: 41, confidenceScore: 45, stage: "discovery", primaryReasonCode: "SCAM_RISK_DETECTED" },
    ],
    debugFlags: ["scam_risk_high", "cs_capped_at_45"],
  },

  // ── S4: 데이터 부족 (not_enough_data) ─────────────────────────────────────
  {
    snapshotId: "snap_004",
    conversationId: "conv_9b3c7a",
    userId: "user_jp_029",
    partnerId: "user_kr_061",
    localePair: "JP-KR",
    createdAt: "2026-04-08T05:00:00Z",
    lastActiveAt: "2026-04-08T06:00:00Z",
    totalTurns: 4,
    partnerMessageCount: 2,
    stage: "opening",
    modelVersion: "v1",
    featureVersion: "v1",
    prsScore: 31,
    confidenceScore: 18,
    lowConfidenceState: "not_enough_data",
    publicFacingState: "insufficient",
    featureBreakdown: {
      responsiveness: 0.45,
      reciprocity: 0.40,
      linguisticMatching: 0.50,
      temporalEngagement: 0.55,
      warmth: 0.50,
      progression: 0.05,
    },
    penaltyBreakdown: {
      earlyOversharePenalty: 0,
      selfPromotionPenalty: 0,
      genericTemplatePenalty: 0,
      nonContingentTopicSwitchPenalty: 0,
      scamRiskPenalty: 0,
    },
    rawSignals: {
      followUpQuestionRate: 0.30,
      topicContinuitySignal: 0.40,
      disclosureBalance: 0.50,
      partnerReinitiation: 0,
      baselineAdjustedReplySpeed: 0.55,
      availabilitySharingDetected: false,
      progressionTriggerDetected: false,
    },
    confidenceComponents: {
      messageVolumeFactor: 0.15,
      sessionCountFactor: 0.20,
      signalConsistencyFactor: 0.40,
      recentnessFactor: 0.90,
      translationReliabilityFactor: 0.85,
    },
    generatedInsights: [],
    reasonCodes: [],
    snapshotHistory: [
      { snappedAt: "2026-04-08T06:00:00Z", prsScore: 31, confidenceScore: 18, stage: "opening", primaryReasonCode: "(none)" },
    ],
    debugFlags: ["too_few_messages"],
  },

  // ── S5: 과도한 자기 공개 + 자기 홍보 ────────────────────────────────────────
  {
    snapshotId: "snap_005",
    conversationId: "conv_3d5f8c",
    userId: "user_kr_033",
    partnerId: "user_jp_007",
    localePair: "KR-JP",
    createdAt: "2026-04-04T14:00:00Z",
    lastActiveAt: "2026-04-07T22:00:00Z",
    totalTurns: 42,
    partnerMessageCount: 18,
    stage: "discovery",
    modelVersion: "v1",
    featureVersion: "v1",
    prsScore: 15,
    confidenceScore: 81,
    lowConfidenceState: null,
    publicFacingState: "low",
    featureBreakdown: {
      responsiveness: 0.45,
      reciprocity: 0.35,
      linguisticMatching: 0.40,
      temporalEngagement: 0.50,
      warmth: 0.30,
      progression: 0.05,
    },
    penaltyBreakdown: {
      earlyOversharePenalty: 0.80,
      selfPromotionPenalty: 0.70,
      genericTemplatePenalty: 0.10,
      nonContingentTopicSwitchPenalty: 0.20,
      scamRiskPenalty: 0,
    },
    rawSignals: {
      followUpQuestionRate: 0.15,
      topicContinuitySignal: 0.30,
      disclosureBalance: 0.20,
      partnerReinitiation: 0,
      baselineAdjustedReplySpeed: 0.50,
      availabilitySharingDetected: false,
      progressionTriggerDetected: false,
    },
    confidenceComponents: {
      messageVolumeFactor: 0.85,
      sessionCountFactor: 0.75,
      signalConsistencyFactor: 0.80,
      recentnessFactor: 0.82,
      translationReliabilityFactor: 0.83,
    },
    generatedInsights: [
      { reasonCode: "EARLY_OVERSHARE", textKo: "초반에 너무 많은 개인 정보를 공유했어요.", textJa: "序盤に個人情報を共有しすぎています。", polarity: "negative" },
      { reasonCode: "SELF_PROMOTION", textKo: "상대방 중심이 아닌 자기 이야기가 많아요.", textJa: "相手中心ではなく自分の話が多いです。", polarity: "negative" },
      { reasonCode: "TOPIC_CONTINUITY_WEAK", textKo: "주제 연속성이 낮아요.", textJa: "話題の継続性が低いです。", polarity: "negative" },
    ],
    reasonCodes: ["EARLY_OVERSHARE", "SELF_PROMOTION", "TOPIC_CONTINUITY_WEAK"],
    snapshotHistory: [
      { snappedAt: "2026-04-04T18:00:00Z", prsScore: 22, confidenceScore: 68, stage: "opening", primaryReasonCode: "EARLY_OVERSHARE" },
      { snappedAt: "2026-04-06T12:00:00Z", prsScore: 17, confidenceScore: 77, stage: "discovery", primaryReasonCode: "SELF_PROMOTION" },
      { snappedAt: "2026-04-07T22:00:00Z", prsScore: 15, confidenceScore: 81, stage: "discovery", primaryReasonCode: "SELF_PROMOTION" },
    ],
    debugFlags: ["penalty_overfiring_check", "reciprocity_low"],
  },

  // ── S6: 형식적 답장 패턴 ───────────────────────────────────────────────────
  {
    snapshotId: "snap_006",
    conversationId: "conv_6e2a4b",
    userId: "user_kr_058",
    partnerId: "user_jp_031",
    localePair: "KR-JP",
    createdAt: "2026-04-03T10:00:00Z",
    lastActiveAt: "2026-04-07T20:00:00Z",
    totalTurns: 30,
    partnerMessageCount: 14,
    stage: "discovery",
    modelVersion: "v1",
    featureVersion: "v1",
    prsScore: 19,
    confidenceScore: 79,
    lowConfidenceState: null,
    publicFacingState: "low",
    featureBreakdown: {
      responsiveness: 0.30,
      reciprocity: 0.40,
      linguisticMatching: 0.30,
      temporalEngagement: 0.45,
      warmth: 0.35,
      progression: 0.05,
    },
    penaltyBreakdown: {
      earlyOversharePenalty: 0,
      selfPromotionPenalty: 0,
      genericTemplatePenalty: 0.90,
      nonContingentTopicSwitchPenalty: 0.40,
      scamRiskPenalty: 0,
    },
    rawSignals: {
      followUpQuestionRate: 0.10,
      topicContinuitySignal: 0.25,
      disclosureBalance: 0.50,
      partnerReinitiation: 0.10,
      baselineAdjustedReplySpeed: 0.45,
      availabilitySharingDetected: false,
      progressionTriggerDetected: false,
    },
    confidenceComponents: {
      messageVolumeFactor: 0.72,
      sessionCountFactor: 0.65,
      signalConsistencyFactor: 0.78,
      recentnessFactor: 0.83,
      translationReliabilityFactor: 0.79,
    },
    generatedInsights: [
      { reasonCode: "TEMPLATE_REPLY_PENALTY", textKo: "상대방 답장이 형식적으로 느껴져요.", textJa: "相手の返信が形式的に感じられます。", polarity: "negative" },
      { reasonCode: "TOPIC_CONTINUITY_WEAK", textKo: "주제 연속성이 낮아요.", textJa: "話題の継続性が低いです。", polarity: "negative" },
      { reasonCode: "NON_CONTINGENT_SWITCH", textKo: "대화가 갑자기 다른 주제로 넘어가요.", textJa: "会話が急に別のトピックに移ります。", polarity: "negative" },
    ],
    reasonCodes: ["TEMPLATE_REPLY_PENALTY", "TOPIC_CONTINUITY_WEAK", "NON_CONTINGENT_SWITCH"],
    snapshotHistory: [
      { snappedAt: "2026-04-04T10:00:00Z", prsScore: 23, confidenceScore: 62, stage: "opening", primaryReasonCode: "TEMPLATE_REPLY_PENALTY" },
      { snappedAt: "2026-04-07T20:00:00Z", prsScore: 19, confidenceScore: 79, stage: "discovery", primaryReasonCode: "TEMPLATE_REPLY_PENALTY" },
    ],
    debugFlags: ["template_penalty_high"],
  },

  // ── S7: 번역 신뢰도 낮음 (KR-JP, 낮은 번역율) ────────────────────────────
  {
    snapshotId: "snap_007",
    conversationId: "conv_8f4d2c",
    userId: "user_kr_044",
    partnerId: "user_jp_019",
    localePair: "KR-JP",
    createdAt: "2026-04-05T08:00:00Z",
    lastActiveAt: "2026-04-08T03:00:00Z",
    totalTurns: 40,
    partnerMessageCount: 18,
    stage: "discovery",
    modelVersion: "v1",
    featureVersion: "v1",
    prsScore: 34,
    confidenceScore: 58,
    lowConfidenceState: null,
    publicFacingState: "moderate",
    featureBreakdown: {
      responsiveness: 0.60,
      reciprocity: 0.55,
      linguisticMatching: 0.42,
      temporalEngagement: 0.58,
      warmth: 0.55,
      progression: 0.10,
    },
    penaltyBreakdown: {
      earlyOversharePenalty: 0,
      selfPromotionPenalty: 0,
      genericTemplatePenalty: 0.10,
      nonContingentTopicSwitchPenalty: 0,
      scamRiskPenalty: 0,
    },
    rawSignals: {
      followUpQuestionRate: 0.50,
      topicContinuitySignal: 0.55,
      disclosureBalance: 0.60,
      partnerReinitiation: 0.20,
      baselineAdjustedReplySpeed: 0.58,
      availabilitySharingDetected: false,
      progressionTriggerDetected: false,
    },
    confidenceComponents: {
      messageVolumeFactor: 0.82,
      sessionCountFactor: 0.70,
      signalConsistencyFactor: 0.68,
      recentnessFactor: 0.88,
      translationReliabilityFactor: 0.28,
    },
    generatedInsights: [
      { reasonCode: "TRANSLATION_CONTEXT_LIMITED", textKo: "번역 맥락이 제한적이어서 신호가 불명확해요.", textJa: "翻訳コンテキストが限られているためシグナルが不明確です。", polarity: "neutral" },
      { reasonCode: "FOLLOW_UP_QUESTIONS_HIGH", textKo: "상대방이 내 이야기에 계속 질문해요.", textJa: "相手が私の話に続けて質問しています。", polarity: "positive" },
    ],
    reasonCodes: ["TRANSLATION_CONTEXT_LIMITED", "FOLLOW_UP_QUESTIONS_HIGH"],
    snapshotHistory: [
      { snappedAt: "2026-04-06T10:00:00Z", prsScore: 36, confidenceScore: 55, stage: "discovery", primaryReasonCode: "TRANSLATION_CONTEXT_LIMITED" },
      { snappedAt: "2026-04-08T03:00:00Z", prsScore: 34, confidenceScore: 58, stage: "discovery", primaryReasonCode: "TRANSLATION_CONTEXT_LIMITED" },
    ],
    debugFlags: ["translation_reliability_low"],
  },

  // ── S8: 상대방 재개 신호 ───────────────────────────────────────────────────
  {
    snapshotId: "snap_008",
    conversationId: "conv_1c7b3f",
    userId: "user_jp_055",
    partnerId: "user_kr_022",
    localePair: "JP-KR",
    createdAt: "2026-04-01T12:00:00Z",
    lastActiveAt: "2026-04-08T05:30:00Z",
    totalTurns: 48,
    partnerMessageCount: 22,
    stage: "discovery",
    modelVersion: "v1",
    featureVersion: "v1",
    prsScore: 42,
    confidenceScore: 87,
    lowConfidenceState: null,
    publicFacingState: "moderate",
    featureBreakdown: {
      responsiveness: 0.62,
      reciprocity: 0.68,
      linguisticMatching: 0.65,
      temporalEngagement: 0.45,
      warmth: 0.65,
      progression: 0.20,
    },
    penaltyBreakdown: {
      earlyOversharePenalty: 0,
      selfPromotionPenalty: 0,
      genericTemplatePenalty: 0,
      nonContingentTopicSwitchPenalty: 0,
      scamRiskPenalty: 0,
    },
    rawSignals: {
      followUpQuestionRate: 0.55,
      topicContinuitySignal: 0.60,
      disclosureBalance: 0.70,
      partnerReinitiation: 0.60,
      baselineAdjustedReplySpeed: 0.45,
      availabilitySharingDetected: false,
      progressionTriggerDetected: false,
    },
    confidenceComponents: {
      messageVolumeFactor: 0.90,
      sessionCountFactor: 0.85,
      signalConsistencyFactor: 0.82,
      recentnessFactor: 0.90,
      translationReliabilityFactor: 0.88,
    },
    generatedInsights: [
      { reasonCode: "PARTNER_REINITIATES", textKo: "상대방이 먼저 대화를 다시 시작하고 있어요.", textJa: "相手が会話を再開しています。", polarity: "positive" },
      { reasonCode: "FOLLOW_UP_QUESTIONS_HIGH", textKo: "상대방이 내 이야기에 계속 질문해요.", textJa: "相手が私の話に続けて質問しています。", polarity: "positive" },
      { reasonCode: "REPLY_SPEED_BELOW_BASELINE", textKo: "평소보다 답장이 늦어지고 있어요.", textJa: "普段より返信が遅くなっています。", polarity: "negative" },
    ],
    reasonCodes: ["PARTNER_REINITIATES", "FOLLOW_UP_QUESTIONS_HIGH", "REPLY_SPEED_BELOW_BASELINE"],
    snapshotHistory: [
      { snappedAt: "2026-04-03T14:00:00Z", prsScore: 35, confidenceScore: 72, stage: "opening", primaryReasonCode: "FOLLOW_UP_QUESTIONS_HIGH" },
      { snappedAt: "2026-04-05T11:00:00Z", prsScore: 38, confidenceScore: 80, stage: "discovery", primaryReasonCode: "PARTNER_REINITIATES" },
      { snappedAt: "2026-04-08T05:30:00Z", prsScore: 42, confidenceScore: 87, stage: "discovery", primaryReasonCode: "PARTNER_REINITIATES" },
    ],
    debugFlags: [],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Pre-computed aggregate stats (mock — in production fetched from /api/admin/prs/aggregates)
// ─────────────────────────────────────────────────────────────────────────────

export interface PrsMockAggregates {
  totalSnapshots: number;
  avgPrs: number;
  avgCs: number;
  prsBuckets: Record<string, number>;
  csBuckets: Record<string, number>;
  stageDistribution: Record<string, number>;
  localePairDistribution: Record<string, number>;
  pctHiddenScore: number;
  pctMixedSignals: number;
  pctProgressionSignal: number;
  pctScamPenalty: number;
  pctTranslationLow: number;
}

export const PRS_MOCK_AGGREGATES: PrsMockAggregates = {
  totalSnapshots: 1243,
  avgPrs: 38,
  avgCs: 72,
  prsBuckets: { "0-19": 142, "20-39": 398, "40-59": 503, "60-79": 185, "80-100": 15 },
  csBuckets:  { "0-34": 98, "35-49": 122, "50-74": 387, "75-100": 636 },
  stageDistribution: { opening: 321, discovery: 798, escalation: 124 },
  localePairDistribution: { "KR-JP": 681, "JP-KR": 312, "KR-KR": 187, "JP-JP": 63 },
  pctHiddenScore: 8,
  pctMixedSignals: 14,
  pctProgressionSignal: 10,
  pctScamPenalty: 3,
  pctTranslationLow: 11,
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

export function fmtDateShort(iso: string): string {
  return new Date(iso).toLocaleDateString("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export const STAGE_LABELS: Record<ConversationStage, string> = {
  opening: "도입",
  discovery: "탐색",
  escalation: "진전",
};

export const LOW_CONF_LABELS: Record<string, string> = {
  not_enough_data: "데이터 부족",
  mixed_signals: "혼합 신호",
  low_confidence_hidden_score: "점수 숨김",
};

export const POLARITY_COLOR: Record<string, string> = {
  positive: "text-emerald-700 bg-emerald-50 border-emerald-200",
  negative: "text-rose-700 bg-rose-50 border-rose-200",
  neutral:  "text-slate-600 bg-slate-50 border-slate-200",
};

export const DEBUG_FLAG_COLOR: Record<string, string> = {
  scam_risk_high: "bg-red-100 text-red-700",
  cs_capped_at_45: "bg-orange-100 text-orange-700",
  mixed_signals_drift: "bg-amber-100 text-amber-700",
  penalty_overfiring_check: "bg-purple-100 text-purple-700",
  template_penalty_high: "bg-purple-100 text-purple-700",
  too_few_messages: "bg-slate-100 text-slate-500",
  translation_reliability_low: "bg-blue-100 text-blue-700",
  reciprocity_low: "bg-rose-100 text-rose-700",
};
