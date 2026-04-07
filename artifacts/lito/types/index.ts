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

// ── Core domain types ─────────────────────────────────────────────────────────

export interface User {
  id: string;
  nickname: string;
  age: number;
  country: "KR" | "JP";
  language: "ko" | "ja";
  bio: string;
  instagramHandle?: string;
  photos: string[];
  compatibilityScore: number;
  compatibilityReasons: string[];
  trustProfile: TrustProfile;
  lastActive: string;
}

export interface Match {
  id: string;
  userId: string;
  matchedAt: string;
  isNew: boolean;
  user: User;
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
  translationEnabled: boolean;
}

export interface MyProfile {
  id: string;
  nickname: string;
  age: number;
  country: "KR" | "JP";
  language: "ko" | "ja";
  intro?: string;
  bio: string;
  interests?: string[];
  instagramHandle?: string;
  photos: string[];
  aiStyleSummary: string;
  trustProfile: TrustProfile;
}
