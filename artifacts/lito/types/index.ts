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

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  text: string;
  textTranslated?: string;
  timestamp: string;
  isRead: boolean;
  language: "ko" | "ja" | "en";
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
  bio: string;
  instagramHandle?: string;
  photos: string[];
  aiStyleSummary: string;
}
