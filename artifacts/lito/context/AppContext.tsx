import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

import {
  mockConversations,
  mockMatches,
  mockMessages,
  mockMessagesAiJia,
  mockMessagesAiMio,
  mockMessagesConv3,
  myProfile,
} from "@/data/mockData";
import { Conversation, Match, Message, MyProfile, TrustProfile, User } from "@/types";

const API_BASE = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}`
  : "http://localhost:8080";

// ── ServerUser → app User conversion ─────────────────────────────────────────

interface ServerUser {
  id: string;
  nickname: string;
  age: number;
  country: "KR" | "JP";
  language: "ko" | "ja";
  city: string;
  bio: string;
  photos: string[];
  compatibilityScore: number;
  compatibilityReasons: string[];
  lastActive: string;
  isOnline?: boolean;
  studyingLanguage?: boolean;
  languageLevel?: "beginner" | "intermediate" | "advanced";
  interests: string[];
  trustScore: number;
  trustLayers: {
    humanVerified: boolean;
    faceMatched: boolean;
    idVerified: boolean;
    institutionVerified: boolean;
  };
  instagramHandle?: string;
  isAI?: boolean;
  personaId?: string;
}

function serverUserToAppUser(u: ServerUser): User {
  const tp: TrustProfile = {
    humanVerified: u.trustLayers.humanVerified
      ? { status: "verified", verifiedAt: "2025-01-01T00:00:00Z" }
      : { status: "not_verified" },
    faceMatched: u.trustLayers.faceMatched
      ? { status: "verified", verifiedAt: "2025-01-01T00:00:00Z" }
      : { status: "not_verified" },
    idVerified: u.trustLayers.idVerified
      ? { status: "verified", verifiedAt: "2025-01-01T00:00:00Z", expiresAt: "2027-01-01T00:00:00Z" }
      : { status: "not_verified" },
    ...(u.trustLayers.institutionVerified
      ? { institutionVerified: { status: "verified" as const, verifiedAt: "2025-01-01T00:00:00Z" } }
      : {}),
  };

  return {
    id: u.id,
    nickname: u.nickname,
    age: u.age,
    country: u.country,
    language: u.language,
    city: u.city,
    bio: u.bio,
    photos: u.photos,
    compatibilityScore: u.compatibilityScore,
    compatibilityReasons: u.compatibilityReasons,
    lastActive: u.lastActive,
    isOnline: u.isOnline,
    studyingLanguage: u.studyingLanguage,
    languageLevel: u.languageLevel,
    interests: u.interests,
    trustProfile: tp,
    instagramHandle: u.instagramHandle,
    isAI: u.isAI,
    personaId: u.personaId,
  };
}

// ── Context type ──────────────────────────────────────────────────────────────

export type DiagnosisStatus = "not_started" | "completed" | "skipped";

export interface DatingStyleAnswers {
  pace: string | null;
  reply_style: string | null;
  expression: string | null;
  dating_style: string | null;
  relationship_goal: string | null;
  privacy: string | null;
}

interface AppContextType {
  hasCompletedOnboarding: boolean;
  hasCompletedProfileSetup: boolean;
  isLoggedIn: boolean;
  profile: MyProfile;
  discoverUsers: User[];
  discoverLoading: boolean;
  newMatch: User | null;
  dismissMatch: () => void;
  refetchDiscover: () => void;
  matches: Match[];
  conversations: Conversation[];
  messages: Record<string, Message[]>;
  activeConversationId: string | null;
  token: string | null;
  completeOnboarding: () => void;
  completeProfileSetup: () => void;
  login: (token: string) => void;
  logout: () => void;
  likeUser: (userId: string) => void;
  passUser: (userId: string) => void;
  blockUser: (userId: string) => void;
  sendMessage: (conversationId: string, text: string) => void;
  toggleTranslation: (conversationId: string) => void;
  unlockExternalContact: (conversationId: string) => void;
  requestUnlock: (conversationId: string) => void;
  respondToUnlock: (conversationId: string, accept: boolean) => void;
  clearNewMatches: () => void;
  setActiveConversation: (id: string | null) => void;
  updateProfile: (updates: Partial<MyProfile>) => void;
  loadConversationMessages: (conversationId: string) => Promise<void>;
  diagnosisStatus: DiagnosisStatus;
  datingStyleAnswers: DatingStyleAnswers;
  diagnosisRewardClaimed: boolean;
  aiCoachingTickets: number;
  hasSeenDiagnosisPrompt: boolean;
  completeDiagnosis: (answers: DatingStyleAnswers) => void;
  skipDiagnosis: () => void;
  resetDiagnosis: () => void;
  markDiagnosisSeen: () => void;
}

const AppContext = createContext<AppContextType | null>(null);

const INITIAL_MESSAGES = {
  conv1: mockMessages,
  conv2: [],
  conv3: mockMessagesConv3,
  conv_ai_mio: mockMessagesAiMio,
  conv_ai_jia: mockMessagesAiJia,
};

const INITIAL_MATCHES = mockMatches;

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);
  const [hasCompletedProfileSetup, setHasCompletedProfileSetupState] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [profile, setProfile] = useState<MyProfile>(myProfile);
  const [discoverUsers, setDiscoverUsers] = useState<User[]>([]);
  const [discoverLoading, setDiscoverLoading] = useState(false);
  const [newMatch, setNewMatch] = useState<User | null>(null);
  const [matches, setMatches] = useState<Match[]>(INITIAL_MATCHES);
  const [conversations, setConversations] = useState<Conversation[]>(mockConversations);
  const [messages, setMessages] = useState<Record<string, Message[]>>(INITIAL_MESSAGES);
  const [activeConversationId, setActiveConversation] = useState<string | null>(null);

  const EMPTY_ANSWERS: DatingStyleAnswers = {
    pace: null, reply_style: null, expression: null,
    dating_style: null, relationship_goal: null, privacy: null,
  };
  const [diagnosisStatus, setDiagnosisStatus] = useState<DiagnosisStatus>("not_started");
  const [datingStyleAnswers, setDatingStyleAnswers] = useState<DatingStyleAnswers>(EMPTY_ANSWERS);
  const [diagnosisRewardClaimed, setDiagnosisRewardClaimed] = useState(false);
  const [aiCoachingTickets, setAiCoachingTickets] = useState(0);
  const [hasSeenDiagnosisPrompt, setHasSeenDiagnosisPrompt] = useState(false);

  const profileRef = useRef(profile);
  useEffect(() => { profileRef.current = profile; }, [profile]);

  const tokenRef = useRef(token);
  useEffect(() => { tokenRef.current = token; }, [token]);

  const messagesRef = useRef(messages);
  useEffect(() => { messagesRef.current = messages; }, [messages]);

  const conversationsRef = useRef(conversations);
  useEffect(() => { conversationsRef.current = conversations; }, [conversations]);

  // ── Fetch discover users from API ─────────────────────────────────────────
  const fetchDiscover = useCallback(async () => {
    setDiscoverLoading(true);
    try {
      const headers: Record<string, string> = {};
      if (tokenRef.current) headers["Authorization"] = `Bearer ${tokenRef.current}`;
      const res = await fetch(`${API_BASE}/api/users/discover?viewerId=me&limit=20`, { headers });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json() as { users: ServerUser[] };
      setDiscoverUsers(data.users.map(serverUserToAppUser));
    } catch (err) {
      console.warn("[AppContext] fetchDiscover failed, using empty list:", err);
      setDiscoverUsers([]);
    } finally {
      setDiscoverLoading(false);
    }
  }, []);

  const refetchDiscover = useCallback(() => {
    fetchDiscover();
  }, [fetchDiscover]);

  // ── Initial load ──────────────────────────────────────────────────────────
  useEffect(() => {
    AsyncStorage.multiGet([
      "lito_onboarding",
      "lito_profile_setup",
      "lito_logged_in",
      "lito_jwt",
      "lito_diagnosis_status",
      "lito_diagnosis_answers",
      "lito_diagnosis_reward",
      "lito_ai_tickets",
      "lito_diagnosis_seen",
    ]).then((pairs) => {
      const map = Object.fromEntries(pairs.map(([k, v]) => [k, v]));
      if (map["lito_onboarding"] === "done") setHasCompletedOnboarding(true);
      if (map["lito_profile_setup"] === "done") setHasCompletedProfileSetupState(true);
      if (map["lito_logged_in"] === "true") setIsLoggedIn(true);
      if (map["lito_jwt"]) setToken(map["lito_jwt"]);
      if (map["lito_diagnosis_status"]) {
        setDiagnosisStatus(map["lito_diagnosis_status"] as DiagnosisStatus);
      }
      if (map["lito_diagnosis_answers"]) {
        try { setDatingStyleAnswers(JSON.parse(map["lito_diagnosis_answers"]!)); } catch {}
      }
      if (map["lito_diagnosis_reward"] === "true") setDiagnosisRewardClaimed(true);
      if (map["lito_ai_tickets"]) setAiCoachingTickets(Number(map["lito_ai_tickets"]) || 0);
      // 이미 프로필 설정을 마친 기존 사용자는 진단 프롬프트를 다시 보지 않음
      if (map["lito_diagnosis_seen"] === "true" || map["lito_profile_setup"] === "done") {
        setHasSeenDiagnosisPrompt(true);
      }
    });
    fetchDiscover();
  }, [fetchDiscover]);

  const completeOnboarding = useCallback(() => {
    setHasCompletedOnboarding(true);
    AsyncStorage.setItem("lito_onboarding", "done");
  }, []);

  const completeProfileSetup = useCallback(() => {
    setHasCompletedProfileSetupState(true);
    AsyncStorage.setItem("lito_profile_setup", "done");
  }, []);

  const completeDiagnosis = useCallback((answers: DatingStyleAnswers) => {
    setDiagnosisStatus("completed");
    setDatingStyleAnswers(answers);
    AsyncStorage.setItem("lito_diagnosis_status", "completed");
    AsyncStorage.setItem("lito_diagnosis_answers", JSON.stringify(answers));
    setDiagnosisRewardClaimed((prev) => {
      if (!prev) {
        setAiCoachingTickets((t) => {
          const next = t + 1;
          AsyncStorage.setItem("lito_ai_tickets", String(next));
          return next;
        });
        AsyncStorage.setItem("lito_diagnosis_reward", "true");
        return true;
      }
      return prev;
    });
  }, []);

  const skipDiagnosis = useCallback(() => {
    setDiagnosisStatus("skipped");
    AsyncStorage.setItem("lito_diagnosis_status", "skipped");
  }, []);

  const resetDiagnosis = useCallback(() => {
    const empty: DatingStyleAnswers = {
      pace: null, reply_style: null, expression: null,
      dating_style: null, relationship_goal: null, privacy: null,
    };
    setDiagnosisStatus("not_started");
    setDatingStyleAnswers(empty);
    AsyncStorage.multiRemove(["lito_diagnosis_status", "lito_diagnosis_answers"]);
  }, []);

  const markDiagnosisSeen = useCallback(() => {
    setHasSeenDiagnosisPrompt(true);
    AsyncStorage.setItem("lito_diagnosis_seen", "true");
  }, []);

  const login = useCallback((jwt: string) => {
    setIsLoggedIn(true);
    setToken(jwt);
    AsyncStorage.setItem("lito_logged_in", "true");
    AsyncStorage.setItem("lito_jwt", jwt);
  }, []);

  const logout = useCallback(() => {
    setIsLoggedIn(false);
    setToken(null);
    setHasCompletedOnboarding(false);
    setHasCompletedProfileSetupState(false);
    setProfile(myProfile);
    setDiscoverUsers([]);
    setNewMatch(null);
    setMatches(INITIAL_MATCHES);
    setConversations(mockConversations);
    setMessages(INITIAL_MESSAGES);
    setHasSeenDiagnosisPrompt(false);
    setDiagnosisStatus("not_started");
    setDiagnosisRewardClaimed(false);
    setAiCoachingTickets(0);
    AsyncStorage.multiRemove([
      "lito_logged_in",
      "lito_jwt",
      "lito_onboarding",
      "lito_profile_setup",
      "lito_diagnosis_status",
      "lito_diagnosis_answers",
      "lito_diagnosis_reward",
      "lito_ai_tickets",
      "lito_diagnosis_seen",
    ]);
    // Reset server-side likes/passes so the deck resets too
    fetch(`${API_BASE}/api/users/reset`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ viewerId: "me" }),
    }).catch(() => {});
    setTimeout(() => fetchDiscover(), 300);
  }, [fetchDiscover]);

  const dismissMatch = useCallback(() => setNewMatch(null), []);

  const clearNewMatches = useCallback(() => {
    setMatches((prev) => prev.map((m) => ({ ...m, isNew: false })));
  }, []);

  // ── Like user — calls API, handles match ─────────────────────────────────
  const likeUser = useCallback(async (userId: string) => {
    // Optimistic: remove from deck immediately
    setDiscoverUsers((prev) => prev.filter((u) => u.id !== userId));

    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (tokenRef.current) headers["Authorization"] = `Bearer ${tokenRef.current}`;
      const res = await fetch(`${API_BASE}/api/users/${userId}/like`, {
        method: "POST",
        headers,
        body: JSON.stringify({ viewerId: "me" }),
      });
      if (!res.ok) return;
      const data = await res.json() as {
        liked: boolean;
        matched: boolean;
        matchId: string | null;
        matchedUser: ServerUser | null;
      };

      if (data.matched && data.matchedUser) {
        const matchedAppUser = serverUserToAppUser(data.matchedUser);
        // Show match popup
        setNewMatch(matchedAppUser);

        // Add to matches list
        const newMatchEntry: Match = {
          id: data.matchId ?? `match_${userId}_${Date.now()}`,
          userId: matchedAppUser.id,
          user: matchedAppUser,
          matchedAt: new Date().toISOString(),
          isNew: true,
        };
        setMatches((prev) => [newMatchEntry, ...prev]);

        // Create a new conversation if one doesn't exist
        const convId = `conv_${userId}`;
        setConversations((prev) => {
          if (prev.some((c) => c.user.id === userId)) return prev;
          const newConv: Conversation = {
            id: convId,
            matchId: newMatchEntry.id,
            user: matchedAppUser,
            lastMessage: undefined,
            unreadCount: 0,
            translationEnabled: true,
            externalUnlocked: matchedAppUser.isAI ?? false,
          };
          return [newConv, ...prev];
        });
        setMessages((prev) => ({ ...prev, [convId]: [] }));
      }
    } catch (err) {
      console.warn("[AppContext] likeUser API error:", err);
    }
  }, []);

  // ── Pass user — calls API ─────────────────────────────────────────────────
  const passUser = useCallback(async (userId: string) => {
    setDiscoverUsers((prev) => prev.filter((u) => u.id !== userId));

    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (tokenRef.current) headers["Authorization"] = `Bearer ${tokenRef.current}`;
      await fetch(`${API_BASE}/api/users/${userId}/pass`, {
        method: "POST",
        headers,
        body: JSON.stringify({ viewerId: "me" }),
      });
    } catch (err) {
      console.warn("[AppContext] passUser API error:", err);
    }
  }, []);

  const blockUser = useCallback((userId: string) => {
    setDiscoverUsers((prev) => prev.filter((u) => u.id !== userId));
    setMatches((prev) => prev.filter((m) => m.userId !== userId));
    setConversations((prev) => prev.filter((c) => c.user.id !== userId));
  }, []);

  // ── AI Persona auto-reply ─────────────────────────────────────────────────
  const triggerAiReply = useCallback(async (conversationId: string, personaId: string) => {
    await new Promise((r) => setTimeout(r, 1200 + Math.random() * 800));

    const currentMsgs = messagesRef.current[conversationId] || [];
    const history = currentMsgs.slice(-10).map((m) => ({
      role: (m.senderId === "me" ? "user" : "assistant") as "user" | "assistant",
      text: m.originalText,
    }));

    try {
      const res = await fetch(`${API_BASE}/api/ai/persona`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          personaId,
          history,
          myLanguage: profileRef.current.language,
        }),
      });
      if (!res.ok) return;
      const data = await res.json();
      const replyText: string = data.reply ?? "";
      if (!replyText) return;

      const conv = conversationsRef.current.find((c) => c.id === conversationId);
      const partnerLang = conv?.user.language ?? "ja";

      const aiMsg: Message = {
        id: `ai_${Date.now()}`,
        conversationId,
        senderId: personaId,
        originalText: replyText,
        originalLanguage: partnerLang,
        createdAt: new Date().toISOString(),
        isRead: false,
      };

      setMessages((prev) => ({
        ...prev,
        [conversationId]: [...(prev[conversationId] || []), aiMsg],
      }));
      setConversations((prev) =>
        prev.map((c) =>
          c.id === conversationId
            ? { ...c, lastMessage: aiMsg, unreadCount: (c.unreadCount || 0) + 1 }
            : c
        )
      );
    } catch {
      // silently ignore network errors
    }
  }, []);

  const sendMessage = useCallback((conversationId: string, text: string) => {
    const lang = profileRef.current.language as "ko" | "ja";
    const newMsg: Message = {
      id: `msg_${Date.now()}`,
      conversationId,
      senderId: "me",
      originalText: text,
      originalLanguage: lang,
      createdAt: new Date().toISOString(),
      isRead: true,
    };
    setMessages((prev) => ({
      ...prev,
      [conversationId]: [...(prev[conversationId] || []), newMsg],
    }));
    setConversations((prev) =>
      prev.map((c) =>
        c.id === conversationId ? { ...c, lastMessage: newMsg } : c
      )
    );

    // 실서버에 메시지 저장 (토큰 있을 때만)
    if (tokenRef.current) {
      fetch(`${API_BASE}/api/chat/${encodeURIComponent(conversationId)}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokenRef.current}`,
        },
        body: JSON.stringify({
          senderId: "me",
          content: text,
          originalLanguage: lang,
        }),
      }).catch(() => {});
    }

    const conv = conversationsRef.current.find((c) => c.id === conversationId);
    if (conv?.user.isAI && conv.user.personaId) {
      triggerAiReply(conversationId, conv.user.personaId);
    }
  }, [triggerAiReply]);

  // ── 서버에서 대화 메시지 로드 ──────────────────────────────────────────────
  const loadConversationMessages = useCallback(async (conversationId: string) => {
    if (!tokenRef.current) return;
    try {
      const res = await fetch(
        `${API_BASE}/api/chat/${encodeURIComponent(conversationId)}/messages`,
        { headers: { Authorization: `Bearer ${tokenRef.current}` } }
      );
      if (!res.ok) return;
      const data = await res.json() as {
        messages: Array<{
          id: number;
          conversationId: string;
          senderUserId: number | null;
          senderId: string;
          content: string;
          translatedContent: string | null;
          originalLanguage: string | null;
          createdAt: string;
        }>;
      };
      if (!data.messages.length) return;

      const serverMsgs: Message[] = data.messages.map((m) => ({
        id: `srv_${m.id}`,
        conversationId: m.conversationId,
        senderId: m.senderId,
        originalText: m.content,
        originalLanguage: (m.originalLanguage as "ko" | "ja") ?? "ko",
        translatedText: m.translatedContent ?? undefined,
        createdAt: m.createdAt,
        isRead: true,
      }));

      setMessages((prev) => {
        const existing = prev[conversationId] ?? [];
        const existingIds = new Set(existing.map((m) => m.id));
        const newOnes = serverMsgs.filter((m) => !existingIds.has(m.id));
        if (!newOnes.length) return prev;
        return {
          ...prev,
          [conversationId]: [...existing, ...newOnes].sort(
            (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          ),
        };
      });
    } catch {
      // silent — local messages are still shown
    }
  }, []);

  const toggleTranslation = useCallback((conversationId: string) => {
    setConversations((prev) =>
      prev.map((c) =>
        c.id === conversationId
          ? { ...c, translationEnabled: !c.translationEnabled }
          : c
      )
    );
  }, []);

  const unlockExternalContact = useCallback((conversationId: string) => {
    setConversations((prev) =>
      prev.map((c) =>
        c.id === conversationId ? { ...c, externalUnlocked: true } : c
      )
    );
  }, []);

  const requestUnlock = useCallback((conversationId: string) => {
    setConversations((prev) =>
      prev.map((c) =>
        c.id === conversationId ? { ...c, unlockRequestState: "sent" } : c
      )
    );
    // AI 페르소나 대화: 1.8초 후 자동 수락 (상대방 수락 시뮬레이션)
    const conv = conversationsRef.current.find((c) => c.id === conversationId);
    if (conv?.user.isAI) {
      setTimeout(() => {
        setConversations((prev) =>
          prev.map((c) =>
            c.id === conversationId
              ? { ...c, externalUnlocked: true, unlockRequestState: undefined }
              : c
          )
        );
      }, 1800);
    }
  }, []);

  const respondToUnlock = useCallback((conversationId: string, accept: boolean) => {
    setConversations((prev) =>
      prev.map((c) =>
        c.id === conversationId
          ? accept
            ? { ...c, externalUnlocked: true, unlockRequestState: undefined }
            : { ...c, unlockRequestState: undefined }
          : c
      )
    );
  }, []);

  const updateProfile = useCallback((updates: Partial<MyProfile>) => {
    setProfile((prev) => {
      const next = { ...prev, ...updates };
      if (updates.country !== undefined) {
        next.language = updates.country === "KR" ? "ko" : "ja";
      }
      return next;
    });
  }, []);

  return (
    <AppContext.Provider
      value={{
        hasCompletedOnboarding,
        hasCompletedProfileSetup,
        isLoggedIn,
        token,
        profile,
        discoverUsers,
        discoverLoading,
        newMatch,
        dismissMatch,
        refetchDiscover,
        matches,
        conversations,
        messages,
        activeConversationId,
        completeOnboarding,
        completeProfileSetup,
        login,
        logout,
        likeUser,
        passUser,
        blockUser,
        sendMessage,
        toggleTranslation,
        unlockExternalContact,
        requestUnlock,
        respondToUnlock,
        clearNewMatches,
        setActiveConversation,
        updateProfile,
        loadConversationMessages,
        diagnosisStatus,
        datingStyleAnswers,
        diagnosisRewardClaimed,
        aiCoachingTickets,
        hasSeenDiagnosisPrompt,
        completeDiagnosis,
        skipDiagnosis,
        resetDiagnosis,
        markDiagnosisSeen,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
