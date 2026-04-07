import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

import { mockConversations, mockMatches, mockMessages, mockUsers, myProfile } from "@/data/mockData";
import { Conversation, Match, Message, MyProfile, User } from "@/types";

interface AppContextType {
  hasCompletedOnboarding: boolean;
  hasCompletedProfileSetup: boolean;
  isLoggedIn: boolean;
  profile: MyProfile;
  discoverUsers: User[];
  matches: Match[];
  conversations: Conversation[];
  messages: Record<string, Message[]>;
  activeConversationId: string | null;
  showPronunciation: boolean;
  completeOnboarding: () => void;
  completeProfileSetup: () => void;
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
  const [hasCompletedProfileSetup, setHasCompletedProfileSetupState] = useState(false);
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
    AsyncStorage.multiGet([
      "lito_onboarding",
      "lito_profile_setup",
      "lito_logged_in",
      "lito_pronunciation",
    ]).then((pairs) => {
      const map = Object.fromEntries(pairs.map(([k, v]) => [k, v]));
      if (map["lito_onboarding"] === "done") setHasCompletedOnboarding(true);
      if (map["lito_profile_setup"] === "done") setHasCompletedProfileSetupState(true);
      if (map["lito_logged_in"] === "true") setIsLoggedIn(true);
      if (map["lito_pronunciation"] === "true") setShowPronunciationState(true);
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

  const completeProfileSetup = useCallback(() => {
    setHasCompletedProfileSetupState(true);
    AsyncStorage.setItem("lito_profile_setup", "done");
  }, []);

  const login = useCallback(() => {
    setIsLoggedIn(true);
    AsyncStorage.setItem("lito_logged_in", "true");
  }, []);

  const logout = useCallback(() => {
    setIsLoggedIn(false);
    setHasCompletedOnboarding(false);
    setHasCompletedProfileSetupState(false);
    AsyncStorage.multiRemove([
      "lito_logged_in",
      "lito_onboarding",
      "lito_profile_setup",
    ]);
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
      originalText: text,
      originalLanguage: profileRef.current.language as "ko" | "ja",
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
        hasCompletedProfileSetup,
        isLoggedIn,
        profile,
        discoverUsers,
        matches,
        conversations,
        messages,
        activeConversationId,
        showPronunciation,
        completeOnboarding,
        completeProfileSetup,
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
