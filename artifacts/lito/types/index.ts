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
  isVerified: boolean;
  lastActive: string;
}

export interface Match {
  id: string;
  userId: string;
  matchedAt: string;
  isNew: boolean;
  user: User;
}

/**
 * Three-layer message model.
 *
 * Layer 1 – original:    always exists (originalText + originalLanguage)
 * Layer 2 – translated:  present when viewer language differs from original
 * Layer 3 – pronunciation: pre-fetched alongside translation; shown only
 *                           when the global showPronunciation toggle is ON
 *
 * Layers are INDEPENDENT. Translation must never be hidden by pronunciation.
 */
export interface Message {
  id: string;
  conversationId: string;
  senderId: string;

  originalText: string;
  originalLanguage: "ko" | "ja";

  translatedText?: string;
  translatedLanguage?: "ko" | "ja";

  pronunciationText?: string;
  pronunciationLanguage?: "ko" | "ja";

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
}
