/**
 * modules/interest/feature.extractor.ts
 *
 * Server-side feature window extraction from raw ChatMessage[].
 *
 * Design rules:
 *  - Pure function — no DB calls, no LLM calls, no side effects.
 *  - Accepts viewerUserId + partnerUserId to produce directional features.
 *  - Output shape is compatible with prsScoring.ts (Record<string, unknown>).
 *  - All features are 0–1 normalized unless stated otherwise.
 *  - Unknown / missing signals default to 0.5 (neutral), never 0.
 *
 * MVP limitation:
 *  - Operates on a windowed sample (max 50 messages).
 *  - Incremental caching not implemented — full recomputation each run.
 *  - Linguistic analysis uses heuristic keyword matching only (no embeddings).
 */

import type { ChatMessage } from "@workspace/db";

const MAX_MESSAGES = 50;

function clamp01(v: number) {
  return Math.max(0, Math.min(1, v));
}

function safeDivide(n: number, d: number, fallback = 0.5) {
  return d === 0 ? fallback : n / d;
}

const QUESTION_RE = /[?？]/;

const WARMTH_KO = /감사|고마워|좋아|행복|사랑|그리워|보고 싶|따뜻|응원|힘내|멋지|대단/;
const WARMTH_JA = /ありがとう|うれしい|たのしい|すき|愛|恋しい|ステキ|すごい|がんばって|温かい/;

const OTHER_FOCUS_KO = /너|당신|자기|오빠|언니|너무|당신이|어때|어땠|했어|했나|했니/;
const OTHER_FOCUS_JA = /あなた|君|きみ|どうでした|どうだった|どんな|たの しかった|ね？/;

const FUTURE_KO = /다음|내일|주말|이번|나중|계획|언제|또|다시|만나/;
const FUTURE_JA = /次|また|今度|来週|週末|いつか|ぜひ|会い|予定/;

const AVAILABILITY_KO = /시간|언제|일정|스케줄|가능|괜찮|되는|맞춰/;
const AVAILABILITY_JA = /時間|いつ|スケジュール|都合|できる|予定|合わせ/;

const CALL_DATE_KO = /만나|만남|데이트|전화|영상|카페|밥|같이|함께/;
const CALL_DATE_JA = /会|デート|電話|ビデオ|カフェ|ご飯|一緒|会おう/;

const SCAM_KO = /돈|계좌|송금|입금|이체|투자|코인|비트코인|달러|급하게 필요/;
const SCAM_JA = /お金|口座|送金|振込|投資|コイン|ビットコイン|ドル|緊急/;

const SELF_PROMO_KO = /내가 최고|제일 잘|나는 성공|나는 부자|내 회사|내 사업/;
const SELF_PROMO_JA = /私が一番|最高です|成功した|お金持ち|私の会社|ビジネス/;

const PERSONAL_OVERSHARE_KO = /이혼|전 남자친구|전 여자친구|빚|병원|수술|정신과|트라우마/;
const PERSONAL_OVERSHARE_JA = /離婚|元彼|元カノ|借金|病院|手術|精神科|トラウマ/;

type Role = "me" | "partner" | "unknown";

interface TaggedMessage {
  id: number;
  role: Role;
  content: string;
  translatedContent: string | null;
  originalLanguage: string | null;
  createdAt: Date;
}

function tagMessages(
  messages: ChatMessage[],
  viewerUserId: number,
  partnerUserId: number
): TaggedMessage[] {
  return messages.slice(-MAX_MESSAGES).map((m) => {
    let role: Role = "unknown";
    if (m.senderUserId === viewerUserId) role = "me";
    else if (m.senderUserId === partnerUserId) role = "partner";
    return {
      id: m.id,
      role,
      content: m.content,
      translatedContent: m.translatedContent ?? null,
      originalLanguage: m.originalLanguage ?? null,
      createdAt: new Date(m.createdAt),
    };
  });
}

function computeResponsiveness(partnerMsgs: TaggedMessage[]) {
  if (partnerMsgs.length === 0) {
    return { followUpQuestionRate: 0.5, contingentReplyScore: 0.5, validationScore: 0.5 };
  }

  const withQuestion = partnerMsgs.filter((m) => QUESTION_RE.test(m.content)).length;
  const followUpQuestionRate = clamp01(safeDivide(withQuestion, partnerMsgs.length, 0.5));

  const contingent = partnerMsgs.filter((m) => m.content.length > 15).length;
  const contingentReplyScore = clamp01(safeDivide(contingent, partnerMsgs.length, 0.5));

  const withWarmth = partnerMsgs.filter(
    (m) => WARMTH_KO.test(m.content) || WARMTH_JA.test(m.content)
  ).length;
  const validationScore = clamp01(
    0.3 + safeDivide(withWarmth, partnerMsgs.length, 0) * 0.7
  );

  return { followUpQuestionRate, contingentReplyScore, validationScore };
}

function computeReciprocity(tagged: TaggedMessage[]) {
  if (tagged.length === 0) {
    return { disclosureTurnTaking: 0.5, disclosureBalance: 0.5, partnerReinitiation: 0.5 };
  }

  const meMsgs = tagged.filter((m) => m.role === "me");
  const partnerMsgs = tagged.filter((m) => m.role === "partner");

  const balance = clamp01(
    safeDivide(partnerMsgs.length, meMsgs.length + partnerMsgs.length, 0.5)
  );
  const disclosureBalance = 1 - Math.abs(balance - 0.5) * 2;

  let alternations = 0;
  for (let i = 1; i < tagged.length; i++) {
    if (tagged[i].role !== tagged[i - 1].role) alternations++;
  }
  const disclosureTurnTaking = clamp01(
    safeDivide(alternations, tagged.length - 1, 0.5)
  );

  let reinitiations = 0;
  for (let i = 1; i < partnerMsgs.length; i++) {
    const gapMs = partnerMsgs[i].createdAt.getTime() - partnerMsgs[i - 1].createdAt.getTime();
    const gapHours = gapMs / (60 * 60_000);
    if (gapHours >= 6) reinitiations++;
  }
  const partnerReinitiation = partnerMsgs.length > 1
    ? clamp01(reinitiations / (partnerMsgs.length - 1) + 0.2)
    : 0.5;

  return { disclosureTurnTaking, disclosureBalance, partnerReinitiation };
}

function computeLinguistic(meMsgs: TaggedMessage[], partnerMsgs: TaggedMessage[]) {
  if (partnerMsgs.length === 0 || meMsgs.length === 0) {
    return { lsmProxy: 0.5, topicAlignment: 0.5, formatAccommodation: 0.5 };
  }

  const meAvgLen = meMsgs.reduce((s, m) => s + m.content.length, 0) / meMsgs.length;
  const partnerAvgLen = partnerMsgs.reduce((s, m) => s + m.content.length, 0) / partnerMsgs.length;
  const lenRatio = meAvgLen > 0
    ? Math.min(meAvgLen, partnerAvgLen) / Math.max(meAvgLen, partnerAvgLen)
    : 0.5;
  const lsmProxy = clamp01(lenRatio);

  const formatAccommodation = clamp01(0.3 + lsmProxy * 0.7);
  const topicAlignment = 0.5;

  return { lsmProxy, topicAlignment, formatAccommodation };
}

function computeTemporal(tagged: TaggedMessage[]) {
  const partnerMsgs = tagged.filter((m) => m.role === "partner");
  const meMsgs = tagged.filter((m) => m.role === "me");

  if (partnerMsgs.length < 2 || meMsgs.length === 0) {
    return { baselineAdjustedReplySpeed: 0.5, replyConsistency: 0.5 };
  }

  const replyGaps: number[] = [];
  for (const pm of partnerMsgs) {
    const prevMe = meMsgs
      .filter((m) => m.createdAt < pm.createdAt)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
    if (prevMe) {
      const gapMin = (pm.createdAt.getTime() - prevMe.createdAt.getTime()) / 60_000;
      if (gapMin < 24 * 60) replyGaps.push(gapMin);
    }
  }

  if (replyGaps.length < 2) {
    return { baselineAdjustedReplySpeed: 0.5, replyConsistency: 0.5 };
  }

  const half = Math.floor(replyGaps.length / 2);
  const earlyAvg = replyGaps.slice(0, half).reduce((s, v) => s + v, 0) / half;
  const recentAvg = replyGaps.slice(half).reduce((s, v) => s + v, 0) / (replyGaps.length - half);

  let baselineAdjustedReplySpeed: number;
  if (earlyAvg === 0) {
    baselineAdjustedReplySpeed = 0.5;
  } else {
    const ratio = recentAvg / earlyAvg;
    baselineAdjustedReplySpeed = ratio < 1 ? clamp01(0.5 + (1 - ratio) * 0.5) : clamp01(0.5 - (ratio - 1) * 0.25);
  }

  const mean = replyGaps.reduce((s, v) => s + v, 0) / replyGaps.length;
  const variance = replyGaps.reduce((s, v) => s + (v - mean) ** 2, 0) / replyGaps.length;
  const cv = mean > 0 ? Math.sqrt(variance) / mean : 1;
  const replyConsistency = clamp01(1 - Math.min(cv, 2) / 2);

  return { baselineAdjustedReplySpeed, replyConsistency };
}

function computeWarmth(partnerMsgs: TaggedMessage[]) {
  if (partnerMsgs.length === 0) {
    return { otherFocusScore: 0.5, warmthScore: 0.5, authenticityScore: 0.5 };
  }

  const withOtherFocus = partnerMsgs.filter(
    (m) => OTHER_FOCUS_KO.test(m.content) || OTHER_FOCUS_JA.test(m.content)
  ).length;
  const otherFocusScore = clamp01(0.2 + safeDivide(withOtherFocus, partnerMsgs.length, 0) * 0.8);

  const withWarmth = partnerMsgs.filter(
    (m) => WARMTH_KO.test(m.content) || WARMTH_JA.test(m.content)
  ).length;
  const warmthScore = clamp01(0.2 + safeDivide(withWarmth, partnerMsgs.length, 0) * 0.8);

  const avgLen = partnerMsgs.reduce((s, m) => s + m.content.length, 0) / partnerMsgs.length;
  const authenticityScore = clamp01(Math.min(avgLen / 80, 1));

  return { otherFocusScore, warmthScore, authenticityScore };
}

function computeProgression(partnerMsgs: TaggedMessage[], totalMsgs: number) {
  if (partnerMsgs.length === 0) {
    return { futureOrientation: 0.5, availabilitySharing: 0.5, callOrDateAcceptance: 0.5 };
  }

  const recent = partnerMsgs.slice(-10);

  const withFuture = recent.filter(
    (m) => FUTURE_KO.test(m.content) || FUTURE_JA.test(m.content)
  ).length;
  const futureOrientation = clamp01(safeDivide(withFuture, recent.length, 0) * (totalMsgs > 10 ? 1 : 0.5));

  const withAvailability = recent.filter(
    (m) => AVAILABILITY_KO.test(m.content) || AVAILABILITY_JA.test(m.content)
  ).length;
  const availabilitySharing = clamp01(safeDivide(withAvailability, recent.length, 0));

  const withCallDate = recent.filter(
    (m) => CALL_DATE_KO.test(m.content) || CALL_DATE_JA.test(m.content)
  ).length;
  const callOrDateAcceptance = clamp01(safeDivide(withCallDate, recent.length, 0));

  return { futureOrientation, availabilitySharing, callOrDateAcceptance };
}

function computePenalties(
  partnerMsgs: TaggedMessage[],
  allMsgs: TaggedMessage[],
  totalMsgs: number
) {
  const earlyMsgs = allMsgs.slice(0, Math.min(10, allMsgs.length));
  const earlyPartner = earlyMsgs.filter((m) => m.role === "partner");

  const withOvershare = earlyPartner.filter(
    (m) => PERSONAL_OVERSHARE_KO.test(m.content) || PERSONAL_OVERSHARE_JA.test(m.content)
  ).length;
  const earlyOversharePenalty = totalMsgs < 20
    ? clamp01(safeDivide(withOvershare, Math.max(earlyPartner.length, 1), 0))
    : 0;

  const withSelfPromo = partnerMsgs.filter(
    (m) => SELF_PROMO_KO.test(m.content) || SELF_PROMO_JA.test(m.content)
  ).length;
  const selfPromotionPenalty = clamp01(safeDivide(withSelfPromo, Math.max(partnerMsgs.length, 1), 0));

  const veryShortCount = partnerMsgs.filter((m) => m.content.trim().length < 5).length;
  const genericTemplatePenalty = clamp01(safeDivide(veryShortCount, Math.max(partnerMsgs.length, 1), 0) * 0.8);

  const nonContingentTopicSwitchPenalty = 0;

  const withScam = partnerMsgs.filter(
    (m) => SCAM_KO.test(m.content) || SCAM_JA.test(m.content)
  ).length;
  const scamRiskPenalty = withScam > 0 ? 1.0 : 0;

  return {
    earlyOversharePenalty,
    selfPromotionPenalty,
    genericTemplatePenalty,
    nonContingentTopicSwitchPenalty,
    scamRiskPenalty,
  };
}

function computeTranslation(tagged: TaggedMessage[]) {
  const KO_RE = /[\uAC00-\uD7A3]/;
  const JA_RE = /[\u3040-\u30FF\u31F0-\u31FF\u3400-\u4DBF\u4E00-\u9FFF]/;

  const hasKo = tagged.some((m) => KO_RE.test(m.content));
  const hasJa = tagged.some((m) => JA_RE.test(m.content));
  const crossBorderConversation = hasKo && hasJa;

  const withTranslation = tagged.filter((m) => m.translatedContent !== null).length;
  const translatedMessageRate = clamp01(safeDivide(withTranslation, tagged.length, 1));

  return { crossBorderConversation, translatedMessageRate };
}

/**
 * extractFeatureWindow
 *
 * Produces a featureWindow object compatible with prsScoring.ts
 * from raw ChatMessage[] and viewer/partner user IDs.
 *
 * @param messages - Raw chat messages (up to MAX_MESSAGES most recent)
 * @param viewerUserId - The authenticated viewer (determines "me" vs "partner")
 * @param partnerUserId - The partner in this conversation direction
 * @param conversationId - Used to populate fw.conversationId
 */
export function extractFeatureWindow(
  messages: ChatMessage[],
  viewerUserId: number,
  partnerUserId: number,
  conversationId: string
): Record<string, unknown> {
  const sample = messages.slice(-MAX_MESSAGES);
  const tagged = tagMessages(sample, viewerUserId, partnerUserId);

  const meMsgs = tagged.filter((m) => m.role === "me");
  const partnerMsgs = tagged.filter((m) => m.role === "partner");
  const knownMsgs = [...meMsgs, ...partnerMsgs];

  const timeWindowStart = sample.length > 0
    ? new Date(sample[0].createdAt).toISOString()
    : new Date().toISOString();
  const timeWindowEnd = sample.length > 0
    ? new Date(sample[sample.length - 1].createdAt).toISOString()
    : new Date().toISOString();

  const responsiveness = computeResponsiveness(partnerMsgs);
  const reciprocity = computeReciprocity(knownMsgs);
  const linguistic = computeLinguistic(meMsgs, partnerMsgs);
  const temporal = computeTemporal(knownMsgs);
  const warmth = computeWarmth(partnerMsgs);
  const progression = computeProgression(partnerMsgs, sample.length);
  const penalties = computePenalties(partnerMsgs, tagged, sample.length);
  const translation = computeTranslation(tagged);

  const recentMessages = partnerMsgs.slice(-8).map((m) => ({
    sender: "partner",
    text: m.content.slice(0, 200),
  }));

  const sourceMin = sample.length > 0 ? sample[0].id : null;
  const sourceMax = sample.length > 0 ? sample[sample.length - 1].id : null;

  return {
    conversationId,
    myUserId: String(viewerUserId),
    partnerUserId: String(partnerUserId),
    totalMessages: sample.length,
    partnerMessages: partnerMsgs.length,
    timeWindowStart,
    timeWindowEnd,
    responsiveness,
    reciprocity,
    linguistic,
    temporal,
    warmth,
    progression,
    penalties,
    translation,
    recentMessages,
    _sourceMessageIdMin: sourceMin,
    _sourceMessageIdMax: sourceMax,
  };
}
