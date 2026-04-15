import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { AppState, AppStateStatus } from "react-native";

import {
  AI_INITIAL_CONVERSATIONS,
  AI_INITIAL_MESSAGES,
} from "@/data/aiPersonas";
import { Conversation, Match, Message, MyProfile, TrustProfile, User } from "@/types";

const API_BASE = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}`
  : "http://localhost:8080";

// Feature Flag: AI 페르소나 대화방 활성화 여부
// 프로덕션에서는 EXPO_PUBLIC_ENABLE_AI_PERSONAS=false로 설정
const ENABLE_AI_PERSONAS = (process.env.EXPO_PUBLIC_ENABLE_AI_PERSONAS ?? "true").toLowerCase() === "true";

const WS_URL = process.env.EXPO_PUBLIC_DOMAIN
  ? `wss://${process.env.EXPO_PUBLIC_DOMAIN}/ws`
  : "ws://localhost:8080/ws";

// ── 빈 프로필 초기값 (로그인 전 상태) ──────────────────────────────────────────
const EMPTY_PROFILE: MyProfile = {
  id: "",
  nickname: "",
  age: 0,
  country: "KR",
  language: "ko",
  intro: "",
  introI18n: {},
  bio: "",
  languageLevel: "beginner",
  interests: [],
  instagramHandle: "",
  photos: [],
  aiStyleSummary: undefined,
  trustProfile: {
    humanVerified: { status: "not_verified" },
    faceMatched: { status: "not_verified" },
    idVerified: { status: "not_verified" },
  },
};

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

// ── Server profile → MyProfile conversion ──────────────────────────────────────
interface ServerAuthUser {
  id: number;
  email: string;
  country: string;
  language: string;
  plan: string;
}
interface ServerProfile {
  id: number;
  userId: number;
  nickname: string | null;
  age: number | null;
  bio: string | null;
  intro: string | null;
  interests: string[] | null;
  photos: string[] | null;
  instagramHandle: string | null;
  languageLevel: string | null;
  updatedAt: string | null;
}

function serverToMyProfile(user: ServerAuthUser, profile: ServerProfile | null): MyProfile {
  return {
    id: String(user.id),
    nickname: profile?.nickname ?? "",
    age: profile?.age ?? 0,
    country: (user.country as "KR" | "JP") ?? "KR",
    language: (user.language as "ko" | "ja") ?? "ko",
    intro: profile?.intro ?? "",
    introI18n: {},
    bio: profile?.bio ?? "",
    languageLevel: (profile?.languageLevel as "beginner" | "intermediate" | "advanced") ?? "beginner",
    interests: profile?.interests ?? [],
    instagramHandle: profile?.instagramHandle ?? "",
    photos: profile?.photos ?? [],
    aiStyleSummary: undefined,
    trustProfile: {
      humanVerified: { status: "not_verified" },
      faceMatched: { status: "not_verified" },
      idVerified: { status: "not_verified" },
    },
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

export interface DiscoverFilters {
  country: "all" | "KR" | "JP";
  langLevel: "all" | "beginner" | "intermediate" | "advanced";
  ageMin: number;
  ageMax: number;
  interests: string[];
}

interface AppContextType {
  hasCompletedOnboarding: boolean;
  hasCompletedProfileSetup: boolean;
  isLoggedIn: boolean;
  profileLoading: boolean;
  profile: MyProfile;
  discoverUsers: User[];
  discoverLoading: boolean;
  discoverError: string | null;
  newMatch: User | null;
  dismissMatch: () => void;
  refetchDiscover: (filters?: DiscoverFilters) => void;
  matches: Match[];
  matchesLoading: boolean;
  conversations: Conversation[];
  conversationsLoading: boolean;
  messages: Record<string, Message[]>;
  activeConversationId: string | null;
  token: string | null;
  completeOnboarding: () => void;
  completeProfileSetup: () => void;
  login: (token: string) => void;
  logout: () => void;
  likeUser: (userId: string, isSuper?: boolean) => void;
  superLikeUser: (userId: string) => void;
  superLikeStatus: { used: number; limit: number; remaining: number } | null;
  fetchSuperLikeStatus: () => Promise<void>;
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
  fetchConversations: () => Promise<void>;
  loadConversationMessages: (conversationId: string) => Promise<void>;
  joinConversation: (conversationId: string) => void;
  leaveConversation: (conversationId: string) => void;
  wsConnected: boolean;
  toast: { id: string; title: string; body: string; type: "match" | "message" } | null;
  dismissToast: () => void;
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

const INITIAL_MATCHES: Match[] = [];

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);
  const [hasCompletedProfileSetup, setHasCompletedProfileSetupState] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profile, setProfile] = useState<MyProfile>(EMPTY_PROFILE);
  const [discoverUsers, setDiscoverUsers] = useState<User[]>([]);
  const [discoverLoading, setDiscoverLoading] = useState(false);
  const [discoverError, setDiscoverError] = useState<string | null>(null);
  const [newMatch, setNewMatch] = useState<User | null>(null);
  const [matches, setMatches] = useState<Match[]>(INITIAL_MATCHES);
  const [matchesLoading, setMatchesLoading] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>(
    ENABLE_AI_PERSONAS ? AI_INITIAL_CONVERSATIONS : []
  );
  const [conversationsLoading, setConversationsLoading] = useState(false);
  const [messages, setMessages] = useState<Record<string, Message[]>>(
    ENABLE_AI_PERSONAS ? { ...AI_INITIAL_MESSAGES } : {}
  );
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
  const [wsConnected, setWsConnected] = useState(false);
  const [toast, setToast] = useState<{ id: string; title: string; body: string; type: "match" | "message" } | null>(null);
  const dismissToast = () => setToast(null);

  const profileRef = useRef(profile);
  useEffect(() => { profileRef.current = profile; }, [profile]);

  const tokenRef = useRef(token);
  useEffect(() => { tokenRef.current = token; }, [token]);

  const messagesRef = useRef(messages);
  useEffect(() => { messagesRef.current = messages; }, [messages]);

  const conversationsRef = useRef(conversations);
  useEffect(() => { conversationsRef.current = conversations; }, [conversations]);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptRef = useRef(0);
  const activeConvRef = useRef<string | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const toastSetterRef = useRef(setToast);
  useEffect(() => { toastSetterRef.current = setToast; }, [setToast]);

  // ── Fetch current user profile from API ──────────────────────────────────────
  const fetchMyProfile = useCallback(async (jwtToken?: string) => {
    const t = jwtToken ?? tokenRef.current;
    if (!t) return;
    setProfileLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/me`, {
        headers: { Authorization: `Bearer ${t}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json() as { user: ServerAuthUser; profile: ServerProfile | null };
      const hydrated = serverToMyProfile(data.user, data.profile);
      setProfile(hydrated);
      // 프로필이 설정되어 있으면 자동으로 프로필 설정 완료 처리
      if (data.profile?.nickname && data.profile.nickname.length > 0) {
        setHasCompletedProfileSetupState(true);
        AsyncStorage.setItem("lito_profile_setup", "done");
      }
    } catch (err) {
      console.warn("[AppContext] fetchMyProfile failed:", err);
    } finally {
      setProfileLoading(false);
    }
  }, []);

  // ── Fetch discover users from API ─────────────────────────────────────────
  const discoverFiltersRef = useRef<DiscoverFilters>({
    country: "all", langLevel: "all", ageMin: 20, ageMax: 35, interests: [],
  });

  const fetchDiscover = useCallback(async (filters?: DiscoverFilters) => {
    const f = filters ?? discoverFiltersRef.current;
    setDiscoverLoading(true);
    setDiscoverError(null);
    try {
      const headers: Record<string, string> = {};
      if (tokenRef.current) headers["Authorization"] = `Bearer ${tokenRef.current}`;
      const params = new URLSearchParams({
        viewerId: profileRef.current.id || "me",
        limit: "20",
        country: f.country,
        langLevel: f.langLevel,
        minAge: String(f.ageMin),
        maxAge: String(f.ageMax),
      });
      if (f.interests.length > 0) params.set("interests", f.interests.join(","));
      const res = await fetch(`${API_BASE}/api/users/discover?${params.toString()}`, { headers });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json() as { users: ServerUser[] };
      setDiscoverUsers(data.users.map(serverUserToAppUser));
    } catch (err) {
      console.warn("[AppContext] fetchDiscover failed:", err);
      setDiscoverError("프로필을 불러올 수 없습니다. 네트워크를 확인해주세요.");
      setDiscoverUsers([]);
    } finally {
      setDiscoverLoading(false);
    }
  }, []);

  const refetchDiscover = useCallback((filters?: DiscoverFilters) => {
    if (filters) discoverFiltersRef.current = filters;
    fetchDiscover(filters ?? discoverFiltersRef.current);
  }, [fetchDiscover]);

  // ── Fetch conversations from DB ───────────────────────────────────────────
  const fetchConversations = useCallback(async () => {
    if (!tokenRef.current) return;
    setConversationsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/chat/conversations`, {
        headers: { Authorization: `Bearer ${tokenRef.current}` },
      });
      if (!res.ok) return;
      const data = await res.json() as {
        conversations: Array<{
          id: string;
          matchId: string;
          matchedAt: string;
          user: {
            id: string;
            nickname: string;
            age: number;
            country: string;
            language: string;
            photos: string[];
            bio: string;
            isOnline: boolean;
          };
          lastMessage?: {
            id: string;
            senderId: string;
            originalText: string;
            translatedText?: string;
            createdAt: string;
          };
          unreadCount: number;
          translationEnabled: boolean;
          externalUnlocked: boolean;
        }>;
      };

      const dbConversations: Conversation[] = data.conversations.map((c) => ({
        id: c.id,
        matchId: c.matchId,
        user: {
          id: c.user.id,
          nickname: c.user.nickname,
          age: c.user.age,
          country: c.user.country as "KR" | "JP",
          language: c.user.language as "ko" | "ja",
          city: "",
          bio: c.user.bio,
          photos: c.user.photos,
          compatibilityScore: 0,
          compatibilityReasons: [],
          lastActive: c.matchedAt,
          isOnline: c.user.isOnline,
          interests: [],
          trustProfile: {
            humanVerified: { status: "not_verified" },
            faceMatched: { status: "not_verified" },
            idVerified: { status: "not_verified" },
          },
          isAI: false,
        },
        lastMessage: c.lastMessage
          ? {
              id: c.lastMessage.id,
              conversationId: c.id,
              senderId: c.lastMessage.senderId,
              originalText: c.lastMessage.originalText,
              translatedText: c.lastMessage.translatedText,
              originalLanguage: "ko" as "ko" | "ja",
              createdAt: c.lastMessage.createdAt,
              isRead: true,
            }
          : undefined,
        unreadCount: c.unreadCount,
        translationEnabled: c.translationEnabled,
        externalUnlocked: c.externalUnlocked,
      }));

      // DB 대화방 + AI 페르소나 대화방 합치기 (AI 대화방은 항상 유지)
      setConversations((prev) => {
        const aiConvs = prev.filter((c) => c.user.isAI === true);
        const merged = [...dbConversations];
        aiConvs.forEach((ai) => {
          if (!merged.some((c) => c.id === ai.id)) merged.push(ai);
        });
        return merged;
      });

      // 매칭 목록도 DB에서 업데이트
      const dbMatches: Match[] = data.conversations.map((c) => ({
        id: c.matchId,
        userId: c.user.id,
        user: {
          id: c.user.id,
          nickname: c.user.nickname,
          age: c.user.age,
          country: c.user.country as "KR" | "JP",
          language: c.user.language as "ko" | "ja",
          city: "",
          bio: c.user.bio,
          photos: c.user.photos,
          compatibilityScore: 0,
          compatibilityReasons: [],
          lastActive: c.matchedAt,
          interests: [],
          trustProfile: {
            humanVerified: { status: "not_verified" },
            faceMatched: { status: "not_verified" },
            idVerified: { status: "not_verified" },
          },
          isAI: false,
        },
        matchedAt: c.matchedAt,
        isNew: false,
      }));
      setMatches((prev) => {
        const newOnes = prev.filter((m) => m.isNew);
        const merged = [...dbMatches];
        newOnes.forEach((n) => {
          if (!merged.some((m) => m.id === n.id)) merged.unshift(n);
        });
        return merged;
      });
      setMatchesLoading(false);
    } catch (err) {
      console.warn("[AppContext] fetchConversations failed:", err);
    } finally {
      setConversationsLoading(false);
    }
  }, []);

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
      if (map["lito_jwt"]) {
        setToken(map["lito_jwt"]);
        tokenRef.current = map["lito_jwt"]!;
        connectWS(map["lito_jwt"]!);
        // 앱 재시작 시 서버에서 프로필 + 대화방 목록 로드
        fetchMyProfile(map["lito_jwt"]!);
        fetchConversations();
      }
      if (map["lito_diagnosis_status"]) {
        setDiagnosisStatus(map["lito_diagnosis_status"] as DiagnosisStatus);
      }
      if (map["lito_diagnosis_answers"]) {
        try { setDatingStyleAnswers(JSON.parse(map["lito_diagnosis_answers"]!)); } catch {}
      }
      if (map["lito_diagnosis_reward"] === "true") setDiagnosisRewardClaimed(true);
      if (map["lito_ai_tickets"]) setAiCoachingTickets(Number(map["lito_ai_tickets"]) || 0);
      if (map["lito_diagnosis_seen"] === "true" || map["lito_profile_setup"] === "done") {
        setHasSeenDiagnosisPrompt(true);
      }
    });
    fetchDiscover();

    // ── AppState 리스너: 백그라운드 복귀 시 WebSocket 재연결 + 데이터 새로고침 ──
    const handleAppStateChange = (nextState: AppStateStatus) => {
      const prev = appStateRef.current;
      appStateRef.current = nextState;

      // background/inactive → active 전환 시
      if (prev.match(/inactive|background/) && nextState === "active") {
        const t = tokenRef.current;
        if (t) {
          // WebSocket이 끊어져 있으면 재연결
          if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
            reconnectAttemptRef.current = 0; // 백그라운드 복귀는 즉시 재연결
            connectWS(t);
          }
          // 대화방 목록 새로고침
          fetchConversations();
        }
      }
    };

    const subscription = AppState.addEventListener("change", handleAppStateChange);
    return () => subscription.remove();
  }, [fetchDiscover, fetchMyProfile, fetchConversations, connectWS]);

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

  // ── WebSocket 연결 관리 ────────────────────────────────────────────────────
  const connectWS = useCallback((jwtToken: string) => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.onclose = null;
      wsRef.current.close();
      wsRef.current = null;
    }

    const ws = new WebSocket(`${WS_URL}?token=${encodeURIComponent(jwtToken)}`);
    wsRef.current = ws;

    ws.onmessage = (event: MessageEvent<string>) => {
      try {
        const msg = JSON.parse(event.data) as {
          type: string;
          conversationId?: string;
          message?: {
            id: number;
            conversationId: string;
            senderId: string;
            content: string;
            originalLanguage: string | null;
            translatedContent: string | null;
            createdAt: string;
          };
        };

        // ── 읽음 표시 실시간 업데이트 ─────────────────────────────────────
        if (msg.type === "read_receipt" && msg.conversationId) {
          const { conversationId, readAt } = msg as { conversationId: string; readAt: string; messageIds?: number[] };
          setMessages((prev) => {
            const existing = prev[conversationId];
            if (!existing) return prev;
            return {
              ...prev,
              [conversationId]: existing.map((m) =>
                !m.isRead ? { ...m, isRead: true, readAt } : m
              ),
            };
          });
          setConversations((prev) =>
            prev.map((c) =>
              c.id === conversationId ? { ...c, unreadCount: 0 } : c
            )
          );
          return;
        }

        if (msg.type === "message" && msg.conversationId && msg.message) {
          const { conversationId, message: m } = msg;
          const myId = profileRef.current.id;

          // 내가 보낸 메시지는 optimistic update로 이미 추가됨 → 스킵
          if (m.senderId === myId || m.senderId === "me") return;

          const incomingMsg: Message = {
            id: `srv_${m.id}`,
            conversationId: m.conversationId,
            senderId: m.senderId,
            originalText: m.content,
            originalLanguage: (m.originalLanguage as "ko" | "ja") ?? "ko",
            translatedText: m.translatedContent ?? undefined,
            createdAt: m.createdAt,
            isRead: false,
          };

          setMessages((prev) => {
            const existing = prev[conversationId] ?? [];
            if (existing.some((x) => x.id === incomingMsg.id)) return prev;
            return {
              ...prev,
              [conversationId]: [...existing, incomingMsg].sort(
                (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
              ),
            };
          });

          setConversations((prev) =>
            prev.map((c) =>
              c.id === conversationId ? { ...c, lastMessage: incomingMsg } : c
            )
          );

          if (activeConvRef.current !== conversationId) {
            const conv = conversationsRef.current.find((c) => c.id === conversationId);
            const senderName = conv?.user.nickname ?? "새 메시지";
            toastSetterRef.current({
              id: `msg_${incomingMsg.id}`,
              title: senderName,
              body: incomingMsg.originalText,
              type: "message",
            });
          }
        }
      } catch {
        // ignore parse errors
      }
    };

    ws.onopen = () => {
      setWsConnected(true);
      reconnectAttemptRef.current = 0; // 연결 성공 시 재시도 카운터 초기화
      if (activeConvRef.current) {
        ws.send(JSON.stringify({ type: "join", conversationId: activeConvRef.current }));
      }
    };

    ws.onclose = () => {
      setWsConnected(false);
      wsRef.current = null;
      if (tokenRef.current) {
        // 지수 백오프: 1s → 2s → 4s → 8s → 16s → 최대 30s
        const attempt = reconnectAttemptRef.current;
        const delayMs = Math.min(1000 * Math.pow(2, attempt), 30000);
        reconnectAttemptRef.current = attempt + 1;
        reconnectTimerRef.current = setTimeout(() => {
          if (tokenRef.current) connectWS(tokenRef.current);
        }, delayMs);
      }
    };

    ws.onerror = () => {
      // onclose가 이어서 호출되므로 여기서는 별도 처리 불필요
    };
  }, []);

  const disconnectWS = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.onclose = null;
      wsRef.current.close();
      wsRef.current = null;
    }
    setWsConnected(false);
  }, []);

  const joinConversation = useCallback((conversationId: string) => {
    activeConvRef.current = conversationId;
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "join", conversationId }));
      wsRef.current.send(JSON.stringify({ type: "read", conversationId }));
    }
    if (tokenRef.current) {
      fetch(`${API_BASE}/api/chat/${conversationId}/read`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${tokenRef.current}` },
      }).catch(() => {});
    }
    setConversations((prev) =>
      prev.map((c) =>
        c.id === conversationId ? { ...c, unreadCount: 0 } : c
      )
    );
  }, []);

  const leaveConversation = useCallback((conversationId: string) => {
    if (activeConvRef.current === conversationId) activeConvRef.current = null;
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "leave", conversationId }));
    }
  }, []);

  const login = useCallback((jwtToken: string) => {
    setIsLoggedIn(true);
    setToken(jwtToken);
    tokenRef.current = jwtToken;
    AsyncStorage.setItem("lito_logged_in", "true");
    AsyncStorage.setItem("lito_jwt", jwtToken);
    connectWS(jwtToken);
    // 로그인 직후 서버에서 프로필 + 대화방 목록 로드
    fetchMyProfile(jwtToken);
    fetchConversations();
  }, [connectWS, fetchConversations, fetchMyProfile]);

  const logout = useCallback(() => {
    setIsLoggedIn(false);
    setToken(null);
    tokenRef.current = null;
    setHasCompletedOnboarding(false);
    setHasCompletedProfileSetupState(false);
    setProfile(EMPTY_PROFILE);
    setDiscoverUsers([]);
    setDiscoverError(null);
    setNewMatch(null);
    setMatches(INITIAL_MATCHES);
    setConversations(ENABLE_AI_PERSONAS ? [...AI_INITIAL_CONVERSATIONS] : []);
    setMessages(ENABLE_AI_PERSONAS ? { ...AI_INITIAL_MESSAGES } : {});
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
    disconnectWS();
    setTimeout(() => fetchDiscover(), 300);
  }, [fetchDiscover, disconnectWS]);

  const dismissMatch = useCallback(() => setNewMatch(null), []);

  const clearNewMatches = useCallback(() => {
    setMatches((prev) => prev.map((m) => ({ ...m, isNew: false })));
  }, []);

  // ── Like user — calls API, handles match ─────────────────────────────────
  const [superLikeStatus, setSuperLikeStatus] = useState<{ used: number; limit: number; remaining: number } | null>(null);

  const fetchSuperLikeStatus = useCallback(async () => {
    if (!tokenRef.current) return;
    try {
      const res = await fetch(`${API_BASE}/api/users/super-like-status`, {
        headers: { Authorization: `Bearer ${tokenRef.current}` },
      });
      if (res.ok) {
        const data = await res.json();
        setSuperLikeStatus({ used: data.used, limit: data.limit, remaining: data.remaining });
      }
    } catch (err) {
      console.warn("[AppContext] fetchSuperLikeStatus error:", err);
    }
  }, []);

  const likeUser = useCallback(async (userId: string, isSuper?: boolean) => {
    setDiscoverUsers((prev) => prev.filter((u) => u.id !== userId));

    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (tokenRef.current) headers["Authorization"] = `Bearer ${tokenRef.current}`;
      const myId = profileRef.current.id || "me";
      const res = await fetch(`${API_BASE}/api/users/${userId}/like`, {
        method: "POST",
        headers,
        body: JSON.stringify({ viewerId: myId, isSuper: isSuper === true }),
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
        setNewMatch(matchedAppUser);
        setToast({
          id: `match_${matchedAppUser.id}_${Date.now()}`,
          title: "새로운 매치!",
          body: `${matchedAppUser.nickname}님과 매칭되었어요`,
          type: "match",
        });

        const newMatchEntry: Match = {
          id: data.matchId ?? `match_${userId}_${Date.now()}`,
          userId: matchedAppUser.id,
          user: matchedAppUser,
          matchedAt: new Date().toISOString(),
          isNew: true,
        };
        setMatches((prev) => [newMatchEntry, ...prev]);

        const myId = profileRef.current.id;
        const numericUserId = parseInt(userId, 10);
        const numericMyId = parseInt(myId, 10);
        const convId = !isNaN(numericUserId) && !isNaN(numericMyId)
          ? `conv_${Math.min(numericMyId, numericUserId)}_${Math.max(numericMyId, numericUserId)}`
          : `conv_${userId}`;
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
      if (isSuper) {
        fetchSuperLikeStatus();
      }
    } catch (err) {
      console.warn("[AppContext] likeUser API error:", err);
    }
  }, [fetchSuperLikeStatus]);

  const superLikeUser = useCallback((userId: string) => {
    likeUser(userId, true);
  }, [likeUser]);

  // ── Pass user — calls API ─────────────────────────────────────────────────
  const passUser = useCallback(async (userId: string) => {
    setDiscoverUsers((prev) => prev.filter((u) => u.id !== userId));

    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (tokenRef.current) headers["Authorization"] = `Bearer ${tokenRef.current}`;
      const myId = profileRef.current.id || "me";
      await fetch(`${API_BASE}/api/users/${userId}/pass`, {
        method: "POST",
        headers,
        body: JSON.stringify({ viewerId: myId }),
      });
    } catch (err) {
      console.warn("[AppContext] passUser API error:", err);
    }
  }, []);

  const blockUser = useCallback((userId: string) => {
    setDiscoverUsers((prev) => prev.filter((u) => u.id !== userId));
    setMatches((prev) => prev.filter((m) => m.userId !== userId));
    setConversations((prev) => prev.filter((c) => c.user.id !== userId));
    const t = tokenRef.current;
    if (t && !userId.startsWith("ai_")) {
      fetch(`${API_BASE}/api/blocks`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${t}` },
        body: JSON.stringify({ blockedUserId: Number(userId) }),
      }).catch(() => {});
    }
  }, []);

  // ── AI Persona auto-reply ─────────────────────────────────────────────────
  const triggerAiReply = useCallback(async (conversationId: string, personaId: string) => {
    await new Promise((r) => setTimeout(r, 1200 + Math.random() * 800));

    const currentMsgs = messagesRef.current[conversationId] || [];
    const myId = profileRef.current.id || "me";
    const history = currentMsgs.slice(-10).map((m) => ({
      role: (m.senderId === myId || m.senderId === "me" ? "user" : "assistant") as "user" | "assistant",
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
    const myId = profileRef.current.id || "me";
    const newMsg: Message = {
      id: `msg_${Date.now()}`,
      conversationId,
      senderId: myId,
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

    // WS 연결된 경우 실시간 전송, 아니면 HTTP 폴백
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: "message",
        conversationId,
        content: text,
        senderId: myId,
        originalLanguage: lang,
      }));
    } else if (tokenRef.current) {
      fetch(`${API_BASE}/api/chat/${encodeURIComponent(conversationId)}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokenRef.current}`,
        },
        body: JSON.stringify({
          senderId: myId,
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
          readAt: string | null;
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
        isRead: !!m.readAt,
        readAt: m.readAt ?? undefined,
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
        profileLoading,
        token,
        profile,
        discoverUsers,
        discoverLoading,
        discoverError,
        newMatch,
        dismissMatch,
        refetchDiscover,
        matches,
        matchesLoading,
        conversations,
        conversationsLoading,
        messages,
        activeConversationId,
        completeOnboarding,
        completeProfileSetup,
        login,
        logout,
        likeUser,
        superLikeUser,
        superLikeStatus,
        fetchSuperLikeStatus,
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
        fetchConversations,
        loadConversationMessages,
        joinConversation,
        leaveConversation,
        wsConnected,
        toast,
        dismissToast,
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
