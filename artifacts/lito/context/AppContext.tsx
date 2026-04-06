import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

import { mockConversations, mockMatches, mockMessages, mockUsers, myProfile } from "@/data/mockData";
import { Conversation, Match, Message, MyProfile, User } from "@/types";

interface AppContextType {
  hasCompletedOnboarding: boolean;
  isLoggedIn: boolean;
  profile: MyProfile;
  discoverUsers: User[];
  matches: Match[];
  conversations: Conversation[];
  messages: Record<string, Message[]>;
  activeConversationId: string | null;
  showPronunciation: boolean;
  completeOnboarding: () => void;
  login: () => void;
  logout: () => void;
  likeUser: (userId: string) => void;
  passUser: (userId: string) => void;
  sendMessage: (conversationId: string, text: string) => void;
  toggleTranslation: (conversationId: string) => void;
  unlockExternalContact: (conversationId: string) => void;
  setActiveConversation: (id: string | null) => void;
  updateProfile: (updates: Partial<MyProfile>) => void;
  setShowPronunciation: (val: boolean) => void;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [profile, setProfile] = useState<MyProfile>(myProfile);
  const [discoverUsers, setDiscoverUsers] = useState<User[]>(mockUsers);
  const [matches, setMatches] = useState<Match[]>(mockMatches);
  const [conversations, setConversations] = useState<Conversation[]>(mockConversations);
  const [messages, setMessages] = useState<Record<string, Message[]>>({
    conv1: mockMessages,
    conv2: [],
    conv3: [],
  });
  const [activeConversationId, setActiveConversation] = useState<string | null>(null);
  const [showPronunciation, setShowPronunciationState] = useState(false);

  // Keep a ref to profile so callbacks don't go stale
  const profileRef = useRef(profile);
  useEffect(() => { profileRef.current = profile; }, [profile]);

  useEffect(() => {
    AsyncStorage.getItem("lito_onboarding").then((val) => {
      if (val === "done") setHasCompletedOnboarding(true);
    });
    AsyncStorage.getItem("lito_logged_in").then((val) => {
      if (val === "true") setIsLoggedIn(true);
    });
    AsyncStorage.getItem("lito_pronunciation").then((val) => {
      if (val === "true") setShowPronunciationState(true);
    });
  }, []);

  const setShowPronunciation = useCallback((val: boolean) => {
    setShowPronunciationState(val);
    AsyncStorage.setItem("lito_pronunciation", val ? "true" : "false");
  }, []);

  const completeOnboarding = useCallback(() => {
    setHasCompletedOnboarding(true);
    AsyncStorage.setItem("lito_onboarding", "done");
  }, []);

  const login = useCallback(() => {
    setIsLoggedIn(true);
    AsyncStorage.setItem("lito_logged_in", "true");
  }, []);

  const logout = useCallback(() => {
    setIsLoggedIn(false);
    setHasCompletedOnboarding(false);
    AsyncStorage.removeItem("lito_logged_in");
    AsyncStorage.removeItem("lito_onboarding");
  }, []);

  const likeUser = useCallback((userId: string) => {
    setDiscoverUsers((prev) => prev.filter((u) => u.id !== userId));
    // TODO: In production, call Supabase to record the like and check for mutual match
  }, []);

  const passUser = useCallback((userId: string) => {
    setDiscoverUsers((prev) => prev.filter((u) => u.id !== userId));
    // TODO: In production, call Supabase to record the pass
  }, []);

  const sendMessage = useCallback((conversationId: string, text: string) => {
    const newMsg: Message = {
      id: `msg_${Date.now()}`,
      conversationId,
      senderId: "me",
      text,
      timestamp: new Date().toISOString(),
      isRead: true,
      language: profileRef.current.language,
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
    // TODO: In production, send to Supabase and trigger OpenAI translation
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
    // TODO: In production, check safety criteria and record unlock in Supabase
  }, []);

  const updateProfile = useCallback((updates: Partial<MyProfile>) => {
    setProfile((prev) => {
      const next = { ...prev, ...updates };
      // Auto-derive language from country when country changes
      if (updates.country !== undefined) {
        next.language = updates.country === "KR" ? "ko" : "ja";
      }
      return next;
    });
    // TODO: In production, save to Supabase
  }, []);

  return (
    <AppContext.Provider
      value={{
        hasCompletedOnboarding,
        isLoggedIn,
        profile,
        discoverUsers,
        matches,
        conversations,
        messages,
        activeConversationId,
        showPronunciation,
        completeOnboarding,
        login,
        logout,
        likeUser,
        passUser,
        sendMessage,
        toggleTranslation,
        unlockExternalContact,
        setActiveConversation,
        updateProfile,
        setShowPronunciation,
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
