// ── Trust layer types ─────────────────────────────────────────────────────────
// Four distinct verification layers — never collapsed into one "isVerified" flag.
//
// TrustStatus lifecycle:
//   not_verified → pending_review → verified
//                                 ↓
//                              rejected → (retry) → pending_review
//   Any layer: verified → reverify_required → pending_review → verified
//
// reverify_required is triggered by:
//   - faceMatched: profile photos changed after face was verified
//   - idVerified: document expired (expiresAt reached)
//   - humanVerified: suspicious activity detected

export type TrustStatus =
  | "not_verified"      // Default — user has not started this layer
  | "pending_review"    // User submitted; awaiting backend/human review
  | "verified"          // Confirmed by system — badge is shown
  | "rejected"          // Submission was rejected (bad photo, mismatch, etc.)
  | "reverify_required"; // Previously verified, but re-verification is now needed

export interface TrustLayer {
  status: TrustStatus;
  verifiedAt?: string;    // ISO date when last successfully verified
  expiresAt?: string;     // ISO date for layers that expire (e.g., ID after 2 yrs)
  rejectionReason?: string; // Short reason shown to user if rejected
  submittedAt?: string;   // ISO date when pending submission was made
}

export interface TrustProfile {
  // Layer 1 — Human: phone OTP + liveness check
  humanVerified: TrustLayer;
  // Layer 2 — Face: selfie compared against profile photos
  faceMatched: TrustLayer;
  // Layer 3 — Identity: passport / government ID document
  idVerified: TrustLayer;
  // Layer 4 — Institution: work email or student ID (optional)
  institutionVerified?: TrustLayer;
  // Fingerprint of photo array when face was verified.
  // If photos change, faceMatched transitions to "reverify_required".
  photoFingerprintAtVerification?: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Compute a 0-100 trust score — only "verified" layers count toward score. */
export function computeTrustScore(tp: TrustProfile): number {
  let score = 0;
  if (tp.humanVerified.status === "verified") score += 25;
  if (tp.faceMatched.status === "verified")   score += 30;
  if (tp.idVerified.status === "verified")    score += 35;
  if (tp.institutionVerified?.status === "verified") score += 10;
  return Math.min(100, score);
}

/** Returns the highest completed trust label for a user's profile card. */
export function highestTrustLabel(tp: TrustProfile, lang: "ko" | "ja"): string | null {
  if (tp.idVerified.status === "verified")
    return lang === "ko" ? "신분증 인증" : "本人確認済み";
  if (tp.faceMatched.status === "verified")
    return lang === "ko" ? "얼굴 인증" : "顔認証済み";
  if (tp.humanVerified.status === "verified")
    return lang === "ko" ? "본인 인증" : "本人確認";
  return null;
}

/** Whether the ID layer has any actionable state (needs user attention). */
export function idNeedsAction(tp: TrustProfile): boolean {
  const s = tp.idVerified.status;
  return s === "not_verified" || s === "rejected" || s === "reverify_required";
}

// ── Anti-scam / Trust Safety types ───────────────────────────────────────────
//
// MVP ARCHITECTURE NOTES:
//   Phase 1 (now)    — Client-side report flow + data structures
//   Phase 2 (soon)   — API endpoint to receive reports, persist to DB
//   Phase 3 (later)  — Automated risk scoring + moderation queue UI
//   Phase 4 (scale)  — ML image detection, device fingerprinting, real-time monitoring
//
// ADMIN DASHBOARD REQUIREMENTS (not yet built):
//   - Report queue with filter by category / severity / date
//   - Risk score distribution chart
//   - One-click account actions (warn / restrict / suspend / ban)
//   - Appeal review UI
//   - False-positive rate tracking per flag kind
//   - Export for law enforcement (GDPR-compliant data request format)

// ── 7 Detection categories (maps to required detection categories) ─────────────

export type RiskFlagKind =
  | "ai_generated_image"       // Cat 1: Synthetic/AI profile photo (GAN detector, perceptual hash)
  | "identity_mismatch"        // Cat 2: Face vs ID document discrepancy
  | "bulk_repetitive_message"  // Cat 3: Same message sent to many users (text similarity hash)
  | "off_platform_lure"        // Cat 4: Requesting KakaoTalk / LINE / WhatsApp / Telegram
  | "financial_solicitation"   // Cat 5: Investment / crypto / money transfer language
  | "multi_account_device"     // Cat 6: Same device fingerprint / IP across accounts
  | "repeated_reports";        // Cat 7: Threshold of unique reporter count reached

// ── Automation decision matrix ────────────────────────────────────────────────
//
//  FLAG KIND                | Auto-detect?       | Auto-action?       | Manual required?
//  -------------------------|--------------------|--------------------|------------------
//  ai_generated_image       | YES (hash + API)   | NO — flag only     | YES — severity review
//  identity_mismatch        | YES (face compare) | NO — flag only     | YES — ID check
//  bulk_repetitive_message  | YES (hash)         | YES ≥10 in 1h      | YES if borderline
//  off_platform_lure        | YES (keyword regex)| YES — warn         | YES if appealing
//  financial_solicitation   | YES (NLP keywords) | YES — restrict     | YES — pattern analysis
//  multi_account_device     | YES (fingerprint)  | NO — flag only     | YES — verify ID chain
//  repeated_reports         | YES (≥5 reports)   | YES — restrict     | YES — review reports

export type RiskFlagSeverity = "low" | "medium" | "high" | "critical";
export type RiskFlagSource = "automated" | "user_report" | "manual_review";

export interface RiskFlag {
  kind: RiskFlagKind;
  severity: RiskFlagSeverity;
  source: RiskFlagSource;
  detectedAt: string;         // ISO date
  details?: string;           // Human-readable context for moderators
  evidenceIds?: string[];     // Message IDs, photo hashes, etc.
  resolvedAt?: string;        // Set when moderator clears the flag
  resolvedBy?: string;        // Moderator ID who cleared it
}

// ── Account action statuses ────────────────────────────────────────────────────
//
//  Transition diagram:
//    active → warned → restricted → shadow_banned → suspended → permanently_banned
//    (Any state can jump directly to permanently_banned for critical violations)
//    suspended → active (after suspendedUntil passes + appeal review)

export type AccountActionStatus =
  | "active"              // Normal — no restrictions
  | "warned"              // Soft warning issued, DM notification sent
  | "restricted"          // Cannot initiate new matches; existing chats continue
  | "shadow_banned"       // Visible only to themselves; matchmaking excluded
  | "suspended"           // Full access removed until suspendedUntil date
  | "permanently_banned"; // Irreversible — account deactivated

// ── Moderation review statuses ────────────────────────────────────────────────

export type ModerationStatus =
  | "clear"           // Reviewed by moderator — no action needed
  | "pending_review"  // Flagged, waiting for moderator assignment
  | "under_review"    // Assigned to a moderator, being investigated
  | "action_taken"    // Moderation action applied (see accountStatus)
  | "appealing";      // User submitted appeal, pauses further automatic action

export interface RiskProfile {
  riskScore: number;                // 0–100 (≥60 = high risk; ≥80 = critical)
                                    // NOT the trust score. Inverted scale to trust.
  flags: RiskFlag[];
  accountStatus: AccountActionStatus;
  moderationStatus: ModerationStatus;
  reportCount: number;              // Total unique reporters (deduplicated by user ID)
  lastReviewedAt?: string;
  suspendedUntil?: string;          // ISO date — only set when accountStatus = "suspended"
  appealSubmittedAt?: string;
  appealReason?: string;
}

// ── User report submitted by another user ─────────────────────────────────────
//
//  Report categories map 1:1 to the 7 detection flag kinds, plus additional
//  social categories (harassment, underage) that have no automated equivalent.

export type UserReportCategory =
  | "fake_profile"          // Believes profile is fake, bot, or stolen photos
  | "ai_generated_photos"   // Suspects AI/GAN-generated profile photos
  | "impersonation"         // Pretending to be a specific real person
  | "romance_scam"          // Love-bombing pattern leading toward money request
  | "financial_scam"        // Investment / crypto / money transfer solicitation
  | "off_platform_contact"  // Pressuring to move to external app (LINE/Kakao/Telegram)
  | "spam_messages"         // Receiving identical or bulk messages
  | "harassment"            // Threatening, abusive, or deeply inappropriate behavior
  | "underage"              // Believes user is under 18
  | "other";                // Free text, reviewed by moderator

export interface UserReport {
  id: string;
  reporterId: string;
  reportedUserId: string;
  reportedNickname?: string;
  category: UserReportCategory;
  details?: string;            // Optional free text from reporter
  evidenceMessageIds?: string[]; // Message IDs as evidence (future feature)
  submittedAt: string;
  // Backend-assigned after submission:
  status: "pending" | "reviewed" | "dismissed" | "actioned";
  // Risk contribution: each report increments the reported user's riskScore
}

// ── Risk score helpers ─────────────────────────────────────────────────────────

export function getRiskLevel(score: number): "safe" | "low" | "medium" | "high" | "critical" {
  if (score < 20)  return "safe";
  if (score < 40)  return "low";
  if (score < 60)  return "medium";
  if (score < 80)  return "high";
  return "critical";
}

export function isAccountRestricted(rp: RiskProfile): boolean {
  return (
    rp.accountStatus === "restricted" ||
    rp.accountStatus === "shadow_banned" ||
    rp.accountStatus === "suspended" ||
    rp.accountStatus === "permanently_banned"
  );
}

// ── Core domain types ─────────────────────────────────────────────────────────

export type SmokingHabit = "never" | "socially" | "regularly" | "prefer_not_to_say";
export type DrinkingHabit = "never" | "socially" | "regularly" | "prefer_not_to_say";

export interface User {
  id: string;
  nickname: string;
  age: number;
  gender?: "male" | "female" | "other";
  country: "KR" | "JP";
  language: "ko" | "ja";
  city?: string;
  bio: string;
  instagramHandle?: string;
  photos: string[];
  compatibilityScore: number;
  compatibilityReasons: string[];
  trustProfile: TrustProfile;
  riskProfile?: RiskProfile;   // Optional — populated by backend; absent = assumed safe
  lastActive: string;
  isOnline?: boolean;          // true = currently online / active within ~5 min
  studyingLanguage?: boolean;  // true = actively studying the other language (KR↔JP)
  languageLevel?: "beginner" | "intermediate" | "advanced";
  interests?: string[];        // Hobbies/interests for cultural matching
  smoking?: SmokingHabit;
  drinking?: DrinkingHabit;
  isAI?: boolean;              // TEST ONLY — AI-powered persona, delete before launch
  personaId?: string;          // TEST ONLY — identifier for persona system prompt
}

export interface Match {
  id: string;
  userId: string;
  matchedAt: string;
  isNew: boolean;
  user: User;
  iceBreaker?: string;     // AI-suggested opening line (Korean)
  iceBreakerJa?: string;   // AI-suggested opening line (Japanese)
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  originalText: string;
  originalLanguage: "ko" | "ja";
  translatedText?: string;
  translatedLanguage?: "ko" | "ja";
  createdAt: string;
  isRead: boolean;
}

export interface Conversation {
  id: string;
  matchId: string;
  user: User;
  lastMessage?: Message;
  unreadCount: number;
  externalUnlocked: boolean;
  /** "sent" = 내가 요청 보냄, "received" = 상대방이 요청 보냄 */
  unlockRequestState?: "sent" | "received";
  translationEnabled: boolean;
}

export interface MyProfile {
  id: string;
  nickname: string;
  age: number;
  gender?: "male" | "female" | "other";
  country: "KR" | "JP";
  language: "ko" | "ja";
  intro?: string;
  introI18n?: { ko?: string; ja?: string };
  bio: string;
  interests?: string[];
  instagramHandle?: string;
  photos: string[];
  aiStyleSummary?: { ko: string; ja: string };
  trustProfile: TrustProfile;
  languageLevel?: "beginner" | "intermediate" | "advanced";
  smoking?: SmokingHabit;
  drinking?: DrinkingHabit;
}

// ── PRS (Partner Receptivity Score) types ─────────────────────────────────────
//
// The PRS system estimates how positively a conversation partner is engaging,
// based on observable conversation signals — NOT as a "love detector" or
// certainty engine, but as a probabilistic, explanation-first insight system.
//
// Architecture:
//   Message[] → prsSignals.ts (heuristic extraction) → InterestFeatureWindow
//   InterestFeatureWindow → POST /api/ai/prs (LLM semantic features)
//   → PRSResult (prs, confidence, stage, reasons)

/** Supported locale pairs for cross-cultural calibration. */
export type LocalePair = "KR-KR" | "KR-JP" | "JP-KR" | "JP-JP";

/** Conversation phase — drives stage-specific scoring weights. */
export type ConversationStage = "opening" | "discovery" | "escalation";

// ── Per-group feature interfaces (all values normalized 0–1) ─────────────────

export interface ResponsivenessFeatures {
  /** HEURISTIC — fraction of partner messages that contain a question mark or known question words */
  followUpQuestionRate: number;
  /** HEURISTIC — fraction of partner messages that share a keyword with the immediately preceding message */
  contingentReplyScore: number;
  /** HEURISTIC — fraction of partner messages that contain known acknowledgment/validation cues */
  validationScore: number;
}

export interface ReciprocityFeatures {
  /** HEURISTIC — how evenly turns alternate between partners (1 = perfect, 0 = fully one-sided) */
  disclosureTurnTaking: number;
  /** HEURISTIC — ratio of average partner message length to average my message length, clamped 0–1 */
  disclosureBalance: number;
  /** HEURISTIC — fraction of "sessions" (gaps > threshold) where partner sent the first new message */
  partnerReinitiation: number;
}

export interface LinguisticMatchingFeatures {
  /** HEURISTIC — proxy: do both sides use similar message length brackets (short/medium/long)? */
  lsmProxy: number;
  /** HEURISTIC — keyword overlap between adjacent message turns */
  topicAlignment: number;
  /** HEURISTIC — emoji and punctuation mirroring between partners */
  formatAccommodation: number;
}

export interface TemporalFeatures {
  /** HEURISTIC — partner's recent reply gaps vs their own early baseline (faster = higher score) */
  baselineAdjustedReplySpeed: number;
  /** HEURISTIC — how consistent partner reply gaps are (low variance = higher score) */
  replyConsistency: number;
}

export interface WarmthFeatures {
  /** HEURISTIC — fraction of partner messages referencing the other person by name or "you" words */
  otherFocusScore: number;
  /** HEURISTIC/SEMANTIC — presence of warm, kind, validating language cues */
  warmthScore: number;
  /** HEURISTIC/SEMANTIC — specificity vs generic/template-like content */
  authenticityScore: number;
}

export interface ProgressionFeatures {
  /** HEURISTIC — presence of future-orientation words (다음에, 언제, 今度, いつか, etc.) */
  futureOrientation: number;
  /** HEURISTIC — explicit availability sharing (주말, 내일, 週末, etc.) */
  availabilitySharing: number;
  /** HEURISTIC — call/meeting acceptance cues (전화, 만나다, 電話, 会いたい, etc.) */
  callOrDateAcceptance: number;
}

export interface PenaltyFeatures {
  /** HEURISTIC — heavy personal disclosure in the first 5 messages */
  earlyOversharePenalty: number;
  /** HEURISTIC — excessive self-centered language (I/me/나/私 ratio) */
  selfPromotionPenalty: number;
  /** HEURISTIC — low-specificity or repeated-pattern replies */
  genericTemplatePenalty: number;
  /** HEURISTIC — abrupt topic changes with no shared context to prior message */
  nonContingentTopicSwitchPenalty: number;
  /** HEURISTIC — URL, money, overseas emergency, or urgent-transfer keywords */
  scamRiskPenalty: number;
}

export interface TranslationReliabilityMetrics {
  /** Fraction of all messages that have a translatedText field */
  translatedMessageRate: number;
  /** Locale pair derived from sender/partner country fields */
  localePair: LocalePair;
  /** Whether the two sides write in different languages */
  crossBorderConversation: boolean;
}

/**
 * A feature snapshot for a single conversation window.
 * Computed client-side from Message[] and then sent to /api/ai/prs
 * for the LLM semantic feature pass.
 */
export interface InterestFeatureWindow {
  conversationId: string;
  myUserId: string;
  partnerUserId: string;
  /** ISO timestamp of the earliest message in this window */
  timeWindowStart: string;
  /** ISO timestamp of the latest message in this window */
  timeWindowEnd: string;
  totalMessages: number;
  partnerMessages: number;
  myMessages: number;
  /** Recent messages (last 10) sent to LLM for semantic scoring */
  recentMessages: Array<{ sender: "me" | "them"; text: string; createdAt: string }>;
  responsiveness: ResponsivenessFeatures;
  reciprocity: ReciprocityFeatures;
  linguistic: LinguisticMatchingFeatures;
  temporal: TemporalFeatures;
  warmth: WarmthFeatures;
  progression: ProgressionFeatures;
  penalties: PenaltyFeatures;
  translation: TranslationReliabilityMetrics;
  stage: ConversationStage;
  /** Semver-style version string for reproducibility */
  featureVersion: string;
  computedAt: string;
}

/**
 * Calibration constants per locale pair.
 * Allows adjusting thresholds for cultural communication norms
 * without hardcoding stereotypes — these are PRODUCT PRIORS, not assertions.
 */
export interface CalibrationProfile {
  localePair: LocalePair;
  /** Reply gap below which partner is considered "fast" (ms) */
  fastReplyThresholdMs: number;
  /** Reply gap above which partner is considered "slow" (ms) */
  slowReplyThresholdMs: number;
  /** Gap (ms) between messages that defines a new "session" */
  sessionGapMs: number;
  /** Stage detection thresholds */
  openingMaxTurns: number;
  openingMaxHours: number;
  discoveryMaxTurns: number;
  scoringWeightsVersion: string;
}

/** Final output returned by /api/ai/prs. */
export interface PRSResult {
  /** Partner Receptivity Score — 0 to 100 */
  prs: number;
  /** Confidence Score — 0 to 100. If below ~35, score should be hidden. */
  confidence: number;
  stage: ConversationStage;
  /** Localized explanation codes shown to user */
  reasons: string[];
  /** Human-readable low-confidence explanation if confidence < 40 */
  lowConfidenceReason?: string;
  /** The feature window that generated this result (for debugging/logging) */
  featureWindow?: InterestFeatureWindow;
  computedAt: string;
}

// ── Scoring engine types ───────────────────────────────────────────────────────
//
// These types model the output of the scoring engine (prsScoring service).
// They are more structured than PRSResult and are the canonical internal
// representation before being serialized for the API response.

/**
 * Machine-readable reason codes.
 * These drive both the UI (icon + label) and can be used for analytics.
 */
export type ReasonCode =
  // Positive signals
  | "FOLLOW_UP_QUESTIONS_HIGH"      // Partner frequently asks follow-up questions
  | "TOPIC_CONTINUITY_STRONG"       // Partner continues conversation topics naturally
  | "REPLY_SPEED_ABOVE_BASELINE"    // Partner replies faster than their own baseline
  | "REPLY_PATTERN_CONSISTENT"      // Partner's reply timing is predictable
  | "DISCLOSURE_IS_BALANCED"        // Both sides share at similar depth
  | "PARTNER_REINITIATES"           // Partner re-opens conversation after gaps
  | "VALIDATION_PRESENT"            // Partner acknowledges and validates regularly
  | "WARMTH_HIGH"                   // Warm, kind, emotionally supportive language
  | "AUTHENTICITY_HIGH"             // Specific, genuine content (not template-like)
  | "PROGRESSION_SIGNALS_PRESENT"   // Future plans or meeting signals detected
  | "AVAILABILITY_SHARED"           // Partner explicitly shared timing availability
  | "CALL_DATE_SIGNAL"              // Call or date acceptance signals found
  // Neutral / mixed
  | "SIGNALS_MIXED"                 // Positive and negative signals coexist
  | "NOT_ENOUGH_DATA"               // Insufficient message volume for reliable estimate
  | "TRANSLATION_CONTEXT_LIMITED"   // Cross-border conversation with low translation coverage
  // Negative / penalty signals
  | "FOLLOW_UP_QUESTIONS_LOW"       // Partner rarely asks follow-up questions
  | "REPLY_SPEED_BELOW_BASELINE"    // Partner is replying slower than their baseline
  | "REPLY_PATTERN_INCONSISTENT"    // High variance in partner reply timing
  | "DISCLOSURE_IMBALANCED"         // One side dominates the conversation length
  | "PROGRESSION_SIGNALS_WEAK"      // No forward-looking signals detected
  | "TEMPLATE_REPLY_PENALTY"        // Partner messages appear generic or low-effort
  | "SELF_PROMOTION_PENALTY"        // Partner focuses heavily on themselves
  | "EARLY_OVERSHARE_PENALTY"       // Heavy personal disclosure in first few messages
  | "SCAM_RISK_DETECTED";           // Red-flag keywords present — review recommended

/** Sentiment polarity of a reason code for UI color coding. */
export type ReasonPolarity = "positive" | "negative" | "neutral";

/**
 * A structured conversational insight:
 * machine-readable code + bilingual human-readable text + polarity.
 */
export interface ConversationInsight {
  code: ReasonCode;
  textKo: string;
  textJa: string;
  polarity: ReasonPolarity;
}

/**
 * Low-confidence state — determines how the UI should render the score.
 * null = normal display; non-null = hide score / show explanation instead.
 */
export type LowConfidenceState =
  | "not_enough_data"          // Too few partner messages or total turns
  | "mixed_signals"            // Score exists but direction is unclear
  | "low_confidence_hidden_score" // Score computed but below display threshold
  | null;                      // Confident enough — display normally

/** Per-group 0–1 scores after injecting semantic (LLM) overrides. */
export interface GroupScoreBreakdown {
  responsiveness: number;
  reciprocity: number;
  linguistic: number;
  temporal: number;
  warmth: number;
  progression: number;
  /** Weighted total of all penalty signals (0–1) */
  penaltyTotal: number;
}

/** Six-factor confidence score breakdown for transparency / debugging. */
export interface ConfidenceFactors {
  /** 0–1: based on total message count */
  messageVolumeFactor: number;
  /** 0–1: based on partner-only message count */
  partnerMessageFactor: number;
  /** 0–1: based on number of detected "sessions" */
  sessionCountFactor: number;
  /** 0–1: signal direction consistency (positive vs negative reason ratio) */
  signalConsistencyFactor: number;
  /** 0–1: how recent the last message is */
  recentnessFactor: number;
  /** 0–1: translation reliability in cross-border conversations */
  translationReliabilityFactor: number;
}

/**
 * Full conversation interest snapshot — the canonical output of the scoring engine.
 * This is what gets returned to the client and optionally cached.
 */
export interface ConversationInterestSnapshot {
  conversationId: string;
  myUserId: string;
  partnerUserId: string;
  /** Conversation phase at time of computation */
  stage: ConversationStage;
  /** Partner Receptivity Score 0–100 */
  prsScore: number;
  /** Confidence Score 0–100 */
  confidenceScore: number;
  /** Non-null when score should be hidden or modified in UI */
  lowConfidenceState: LowConfidenceState;
  /** Per-group scoring breakdown for transparency */
  featureBreakdown: GroupScoreBreakdown;
  /** Raw penalty signal values */
  penaltyBreakdown: PenaltyFeatures;
  /** Machine-readable reason codes (max 6) */
  reasonCodes: ReasonCode[];
  /** Structured bilingual insights (max 4 for UI) */
  generatedInsights: ConversationInsight[];
  /** ISO timestamp of when this snapshot was generated */
  generatedAt: string;
  /** Semver scoring engine version for reproducibility */
  modelVersion: string;
}
