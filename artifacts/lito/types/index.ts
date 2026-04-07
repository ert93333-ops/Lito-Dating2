// ── Trust layer types ─────────────────────────────────────────────────────────
// Four distinct verification layers — never collapsed into one "isVerified" flag.

export type TrustStatus = "none" | "pending" | "verified" | "failed";

export interface TrustLayer {
  status: TrustStatus;
  verifiedAt?: string;   // ISO date when last successfully verified
  expiresAt?: string;    // ISO date for layers that expire (e.g., ID after 2 yrs)
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
  // If photos change, faceMatched is reset to "none" and re-verification is required.
  photoFingerprintAtVerification?: string;
}

// ── Helper — compute a 0-100 trust score from layers ─────────────────────────
export function computeTrustScore(tp: TrustProfile): number {
  let score = 0;
  if (tp.humanVerified.status === "verified") score += 25;
  if (tp.faceMatched.status === "verified") score += 30;
  if (tp.idVerified.status === "verified") score += 35;
  if (tp.institutionVerified?.status === "verified") score += 10;
  return Math.min(100, score);
}

// ── Helper — highest trust label to show ─────────────────────────────────────
export function highestTrustLabel(tp: TrustProfile, lang: "ko" | "ja"): string | null {
  if (tp.idVerified.status === "verified") {
    return lang === "ko" ? "신분증 인증" : "本人確認済み";
  }
  if (tp.faceMatched.status === "verified") {
    return lang === "ko" ? "얼굴 인증" : "顔認証済み";
  }
  if (tp.humanVerified.status === "verified") {
    return lang === "ko" ? "본인 인증" : "本人確認";
  }
  return null;
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
  trustProfile: TrustProfile;   // replaces single isVerified: boolean
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
  trustProfile: TrustProfile;   // my own verification status
}
