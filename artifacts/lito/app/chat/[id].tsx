import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CountryFlag } from "@/components/CountryFlag";
import { ProfileImage } from "@/components/ProfileImage";
import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import { useLocale } from "@/hooks/useLocale";
import { Message } from "@/types";

const CURRENT_USER_ID = "me";

const API_BASE = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}`
  : "http://localhost:8080";

// ── Per-session module-level translation cache ────────────────────────────────
// Key: "<msgId>:<viewerLang>"
// Value: { translation, pronunciation }
// Stored here (not in React state) so it survives any remount.
interface TranslationResult { translation: string; pronunciation: string; }
const translationCache = new Map<string, TranslationResult>();

// ─── MessageBubble ────────────────────────────────────────────────────────────
//
// Renders three INDEPENDENT layers. Layers never replace each other.
//
//   Layer 1: msg.originalText         — always visible
//   Layer 2: translatedText prop      — visible when translation is enabled
//                                       and the message has been translated
//   Layer 3: pronunciationText prop   — visible ONLY when showPronunciation
//                                       toggle is ON  (never hides Layer 2)
//
// showPronunciation is read from context, NOT passed as a prop.
// This means the toggle never causes FlatList items to remount.

interface BubbleProps {
  msg: Message;
  translatedText: string | undefined;
  pronunciationText: string | undefined;
  isTranslating: boolean;
  translationEnabled: boolean;
  viewerLang: "ko" | "ja";
}

function MessageBubble({
  msg,
  translatedText,
  pronunciationText,
  isTranslating,
  translationEnabled,
  viewerLang,
}: BubbleProps) {
  const colors = useColors();
  // showPronunciation from context — toggling it only re-renders this component,
  // does NOT change any props → FlatList items never remount.
  const { showPronunciation } = useApp();
  const isMe = msg.senderId === CURRENT_USER_ID;

  // Whether this message needs a translation layer
  const needsTranslation =
    !isMe && translationEnabled && msg.originalLanguage !== viewerLang;

  // ── colour tokens ────────────────────────────────────────────────────────
  const originalColor  = isMe ? "rgba(255,255,255,0.85)" : colors.charcoalMid;
  const translColor    = isMe ? colors.white              : colors.charcoal;
  const pronunciColor  = isMe ? "rgba(255,255,255,0.45)" : "#ABABAB";
  const sepColor       = isMe ? "rgba(255,255,255,0.22)" : colors.border;

  const Separator = () => (
    <View style={[bubbleStyles.separator, { backgroundColor: sepColor }]} />
  );

  return (
    <View style={[styles.bubbleWrap, { alignSelf: isMe ? "flex-end" : "flex-start" }]}>
      <View
        style={[
          styles.bubble,
          {
            backgroundColor: isMe ? colors.rose : colors.white,
            borderColor:     isMe ? colors.rose : colors.border,
          },
        ]}
      >
        {/* ── LAYER 1: original text — ALWAYS rendered ──────────────── */}
        <Text style={[styles.bubbleText, { color: originalColor }]}>
          {msg.originalText}
        </Text>

        {/* ── LAYER 2: translation — shown whenever available ─────────
            Translation is NEVER removed by the pronunciation toggle.    */}
        {needsTranslation && isTranslating && (
          <>
            <Separator />
            <ActivityIndicator
              size="small"
              color={isMe ? "rgba(255,255,255,0.6)" : colors.charcoalLight}
              style={{ marginTop: 2, alignSelf: "flex-start" }}
            />
          </>
        )}
        {needsTranslation && !isTranslating && translatedText && (
          <>
            <Separator />
            <Text style={[bubbleStyles.translText, { color: translColor }]}>
              {translatedText}
            </Text>
          </>
        )}

        {/* ── LAYER 3: pronunciation — ONLY added when toggle is ON ────
            This layer is additive. It never removes or replaces Layer 2. */}
        {needsTranslation && !isTranslating && pronunciationText &&
          showPronunciation && (
            <Text style={[bubbleStyles.pronText, { color: pronunciColor }]}>
              {pronunciationText}
            </Text>
          )}
      </View>

      <Text
        style={[
          styles.timestamp,
          { color: colors.charcoalLight, alignSelf: isMe ? "flex-end" : "flex-start" },
        ]}
      >
        {new Date(msg.createdAt).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })}
      </Text>
    </View>
  );
}

const bubbleStyles = StyleSheet.create({
  separator: {
    height: 1,
    marginVertical: 6,
    borderRadius: 1,
  },
  translText: {
    fontFamily: "Inter_500Medium",
    fontSize: 15,
    lineHeight: 22,
  },
  originalText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    lineHeight: 19,
  },
  pronText: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    lineHeight: 16,
    letterSpacing: 0.3,
    marginTop: 4,
  },
});

// ─── Chat Detail Screen ────────────────────────────────────────────────────────

// Enrichment map: per-session cache of translated/pronunciation data per msgId
interface Enrichment { translatedText?: string; pronunciationText?: string; }

export default function ChatDetailScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { t } = useLocale();
  const { id } = useLocalSearchParams<{ id: string }>();
  const {
    conversations,
    messages,
    profile,
    sendMessage,
    toggleTranslation,
    unlockExternalContact,
  } = useApp();

  const [inputText, setInputText] = useState("");
  const [aiSuggesting, setAiSuggesting] = useState(false);
  // enrichmentMap: msgId → { translatedText, pronunciationText }
  const [enrichmentMap, setEnrichmentMap] = useState<Record<string, Enrichment>>({});
  const inflight = useRef<Set<string>>(new Set()); // tracks in-progress API calls
  const flatRef = useRef<FlatList>(null);

  const conversation = conversations.find((c) => c.id === id);
  const convMessages = messages[id || "conv1"] || [];
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  if (!conversation) {
    return (
      <View style={[styles.container, { backgroundColor: colors.white, paddingTop: topPad }]}>
        <Text style={{ color: colors.charcoal }}>Conversation not found</Text>
      </View>
    );
  }

  // Viewer's primary language (determined by country)
  const viewerLang: "ko" | "ja" = profile.country === "KR" ? "ko" : "ja";
  const translationEnabled = !!conversation.translationEnabled;

  // ── Enrich messages with translations ──────────────────────────────────────
  // Runs whenever messages change, translation is toggled, or viewer language
  // changes. Writes results to enrichmentMap (state) and translationCache (module).
  // Uses `inflight` ref to prevent duplicate concurrent API calls.
  useEffect(() => {
    if (!translationEnabled) return;

    convMessages.forEach((msg) => {
      const isMe = msg.senderId === CURRENT_USER_ID;
      if (isMe) return;
      if (msg.originalLanguage === viewerLang) return; // same language, skip

      const cacheKey = `${msg.id}:${viewerLang}`;

      // 1. Module-level cache hit → populate enrichmentMap immediately
      const cached = translationCache.get(cacheKey);
      if (cached) {
        setEnrichmentMap((prev) => {
          if (prev[msg.id]?.translatedText) return prev; // already there
          return {
            ...prev,
            [msg.id]: { translatedText: cached.translation, pronunciationText: cached.pronunciation },
          };
        });
        return;
      }

      // 2. Pre-set data in mock/DB message → store in cache + enrichmentMap
      if (msg.translatedText) {
        const result = { translation: msg.translatedText, pronunciation: msg.pronunciationText ?? "" };
        translationCache.set(cacheKey, result);
        setEnrichmentMap((prev) => {
          if (prev[msg.id]?.translatedText) return prev;
          return {
            ...prev,
            [msg.id]: { translatedText: msg.translatedText, pronunciationText: msg.pronunciationText },
          };
        });
        return;
      }

      // 3. API fetch (avoid duplicate calls with inflight ref)
      if (inflight.current.has(cacheKey)) return;
      inflight.current.add(cacheKey);

      fetch(`${API_BASE}/api/ai/translate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: msg.originalText,
          sourceLang: msg.originalLanguage,
          viewerLang,
        }),
      })
        .then((r) => r.json())
        .then((data: TranslationResult) => {
          translationCache.set(cacheKey, data);
          setEnrichmentMap((prev) => ({
            ...prev,
            [msg.id]: { translatedText: data.translation, pronunciationText: data.pronunciation },
          }));
        })
        .catch(() => { /* silent: message will show without translation */ })
        .finally(() => { inflight.current.delete(cacheKey); });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [convMessages, translationEnabled, viewerLang]);

  // ── renderItem — depends on enrichmentMap so bubbles get fresh data ─────────
  const renderMessage = useCallback(
    ({ item }: { item: Message }) => {
      const enrichment = enrichmentMap[item.id];
      const isMe = item.senderId === CURRENT_USER_ID;
      const needsFetch =
        !isMe &&
        translationEnabled &&
        item.originalLanguage !== viewerLang &&
        !enrichment?.translatedText;

      return (
        <MessageBubble
          msg={item}
          translatedText={enrichment?.translatedText}
          pronunciationText={enrichment?.pronunciationText}
          isTranslating={needsFetch}
          translationEnabled={translationEnabled}
          viewerLang={viewerLang}
        />
      );
    },
    // showPronunciation is read inside MessageBubble via useApp() context,
    // so it is NOT listed here — pronunciation toggle never remounts bubbles.
    [enrichmentMap, translationEnabled, viewerLang]
  );

  const handleSend = () => {
    if (!inputText.trim() || !id) return;
    sendMessage(id, inputText.trim());
    setInputText("");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleAiSuggest = async () => {
    if (aiSuggesting) return;
    setAiSuggesting(true);
    try {
      const recentMessages = convMessages.slice(-10).map((m) => ({
        sender: m.senderId === CURRENT_USER_ID ? "me" : "them",
        text: m.originalText, // ← correct field
      }));

      const targetLang = conversation.user.country === "JP" ? "ja" : "ko";

      const response = await fetch(`${API_BASE}/api/ai/suggest-reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: recentMessages, targetLang }),
      });

      if (!response.ok) throw new Error(`API error: ${response.status}`);
      const data = (await response.json()) as { suggestion?: string; error?: string };

      if (data.suggestion) {
        setInputText(data.suggestion);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } else {
        throw new Error(data.error ?? "No suggestion returned");
      }
    } catch {
      Alert.alert("AI Suggestion", "Could not generate a reply. Please try again.");
    } finally {
      setAiSuggesting(false);
    }
  };

  const handleUnlock = () => {
    if (!id) return;
    unlockExternalContact(id);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <View style={[styles.header, { paddingTop: topPad + 12, borderBottomColor: colors.border, backgroundColor: colors.white }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="chevron-left" size={24} color={colors.charcoal} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.headerUser}>
          <ProfileImage photoKey={conversation.user.photos[0]} size={38} />
          <View style={styles.headerInfo}>
            <View style={styles.headerNameRow}>
              <Text style={[styles.headerName, { color: colors.charcoal }]}>
                {conversation.user.nickname}
              </Text>
              <CountryFlag country={conversation.user.country} size={13} />
            </View>
            <Text style={[styles.headerStatus, { color: colors.charcoalLight }]}>
              {conversation.user.lastActive}
            </Text>
          </View>
        </TouchableOpacity>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[
              styles.translateToggle,
              {
                backgroundColor: conversation.translationEnabled ? colors.rose : colors.muted,
                borderColor: conversation.translationEnabled ? colors.rose : colors.border,
              },
            ]}
            onPress={() => id && toggleTranslation(id)}
          >
            <Feather
              name="globe"
              size={14}
              color={conversation.translationEnabled ? colors.white : colors.charcoalLight}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Contact unlock banners ──────────────────────────────────────── */}
      {!conversation.externalUnlocked && (
        <TouchableOpacity
          style={[styles.unlockBanner, { backgroundColor: colors.roseLight, borderColor: colors.roseSoft }]}
          onPress={handleUnlock}
        >
          <Feather name="unlock" size={14} color={colors.rose} />
          <Text style={[styles.unlockText, { color: colors.rose }]}>
            {t("chat.unlock")}
          </Text>
        </TouchableOpacity>
      )}
      {conversation.externalUnlocked && (
        <View style={[styles.unlockedBanner, { backgroundColor: "#D9FFE6" }]}>
          <Feather name="check-circle" size={14} color="#34C759" />
          <Text style={[styles.unlockText, { color: "#1D8A3A" }]}>
            {t("chat.unlocked")}
          </Text>
        </View>
      )}

      {/* ── Message list ────────────────────────────────────────────────── */}
      <FlatList
        ref={flatRef}
        data={convMessages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        // extraData ensures FlatList re-renders visible items when enrichmentMap
        // updates (e.g. when a translation arrives)
        extraData={enrichmentMap}
        contentContainerStyle={[styles.messageList, { paddingBottom: 12 }]}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => flatRef.current?.scrollToEnd({ animated: true })}
      />

      {/* ── Input area ──────────────────────────────────────────────────── */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={0}
      >
        <View
          style={[
            styles.inputArea,
            {
              backgroundColor: colors.white,
              borderTopColor: colors.border,
              paddingBottom: bottomPad + 8,
            },
          ]}
        >
          <TouchableOpacity
            style={[
              styles.aiBtn,
              {
                backgroundColor: aiSuggesting ? colors.roseSoft : colors.roseLight,
                opacity: aiSuggesting ? 0.8 : 1,
              },
            ]}
            onPress={handleAiSuggest}
            disabled={aiSuggesting}
          >
            {aiSuggesting ? (
              <ActivityIndicator size="small" color={colors.rose} />
            ) : (
              <Feather name="zap" size={16} color={colors.rose} />
            )}
          </TouchableOpacity>

          <TextInput
            style={[
              styles.input,
              { backgroundColor: colors.muted, borderColor: colors.border, color: colors.charcoal },
            ]}
            // Single-language placeholder — no mixed languages
            placeholder={t("chat.placeholder")}
            placeholderTextColor={colors.charcoalLight}
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={500}
          />

          <TouchableOpacity
            style={[styles.sendBtn, { backgroundColor: inputText.trim() ? colors.rose : colors.muted }]}
            onPress={handleSend}
            disabled={!inputText.trim()}
          >
            <Feather
              name="send"
              size={18}
              color={inputText.trim() ? colors.white : colors.charcoalLight}
            />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  backBtn: { padding: 4, marginRight: 8 },
  headerUser: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10 },
  headerInfo: {},
  headerNameRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  headerName: { fontFamily: "Inter_600SemiBold", fontSize: 16 },
  headerStatus: { fontFamily: "Inter_400Regular", fontSize: 12 },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  translateToggle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  unlockBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  unlockedBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  unlockText: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    flex: 1,
  },
  messageList: {
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 4,
  },
  bubbleWrap: {
    maxWidth: "82%",
    marginBottom: 8,
  },
  bubble: {
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
  },
  bubbleText: {
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    lineHeight: 22,
  },
  timestamp: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    marginTop: 4,
    opacity: 0.6,
  },
  inputArea: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    gap: 8,
  },
  aiBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  input: {
    flex: 1,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    maxHeight: 100,
    borderWidth: 1,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
});
