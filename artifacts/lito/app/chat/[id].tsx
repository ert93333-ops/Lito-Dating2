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

// ── Module-level translation cache ───────────────────────────────────────────
// Persists across remounts. Key = "<msgId>:<viewerLang>"
interface TranslationResult { translation: string; pronunciation: string; }
const translationCache = new Map<string, TranslationResult>();

// ─── MessageBubble ────────────────────────────────────────────────────────────
//
// Three-layer architecture. Each layer is an INDEPENDENT render condition.
// Layers NEVER affect each other's visibility.
//
//   Layer 1: msg.originalText       — always rendered
//   Layer 2: translatedText prop    — rendered when translation is available
//                                     (no dependency on showPronunciation)
//   Layer 3: pronunciationText prop — rendered ONLY when global showPronunciation
//                                     is ON (never hides Layer 2)
//
// Root cause of the old bug (now fixed):
//   The old code used a single shared state/render slot for translation and
//   pronunciation, so setting showPronunciation=true replaced the translation.
//   Now they are three separate JSX blocks with no shared conditions.

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
  // showPronunciation is read directly from context.
  // When the user toggles it, only this component re-renders via context subscription.
  // FlatList items never remount; no props change → translation layer is unaffected.
  const { showPronunciation } = useApp();
  const isMe = msg.senderId === CURRENT_USER_ID;

  // Whether this message warrants a translation layer at all
  const needsTranslation =
    !isMe && translationEnabled && msg.originalLanguage !== viewerLang;

  if (isMe) {
    // ── Sent message: clean, minimal ──────────────────────────────────────
    return (
      <View style={[bubble.wrap, { alignSelf: "flex-end" }]}>
        <View style={[bubble.balloonMe, { backgroundColor: colors.bubbleMe }]}>
          <Text style={[bubble.textMe, { color: colors.white }]}>
            {msg.originalText}
          </Text>
        </View>
        <Text style={[bubble.time, { color: colors.charcoalLight, alignSelf: "flex-end" }]}>
          {fmtTime(msg.createdAt)}
        </Text>
      </View>
    );
  }

  // ── Received message: 3-layer hierarchy ──────────────────────────────────
  return (
    <View style={[bubble.wrap, { alignSelf: "flex-start" }]}>
      <View
        style={[
          bubble.balloonThem,
          {
            backgroundColor: colors.bubbleThem,
            borderColor: colors.border,
            // Accent left border shows this is a translated message
            borderLeftColor: needsTranslation ? colors.roseSoft : colors.border,
            borderLeftWidth: needsTranslation ? 3 : 1,
          },
        ]}
      >
        {/* ── LAYER 1: original text — ALWAYS visible ──────────────────── */}
        <Text style={[bubble.textOriginal, { color: colors.charcoalMid }]}>
          {msg.originalText}
        </Text>

        {/* ── LAYER 2: translation — independent of pronunciation toggle ── */}
        {needsTranslation && isTranslating && (
          <>
            <View style={[bubble.divider, { backgroundColor: colors.border }]} />
            <ActivityIndicator
              size="small"
              color={colors.roseSoft}
              style={{ alignSelf: "flex-start", marginTop: 2 }}
            />
          </>
        )}

        {/* Translation: shown when available. showPronunciation has ZERO effect here. */}
        {needsTranslation && !isTranslating && !!translatedText && (
          <>
            <View style={[bubble.divider, { backgroundColor: colors.border }]} />
            <Text style={[bubble.textTranslation, { color: colors.charcoal }]}>
              {translatedText}
            </Text>
          </>
        )}

        {/* ── LAYER 3: pronunciation — ONLY shown when toggle is ON ──────
            This block is purely additive. It has its own condition.
            It does NOT affect Layer 1 or Layer 2 in any way.             */}
        {needsTranslation && !isTranslating && !!pronunciationText && showPronunciation && (
          <Text style={[bubble.textPronunciation, { color: colors.pronunciationHint }]}>
            {pronunciationText}
          </Text>
        )}
      </View>

      <Text style={[bubble.time, { color: colors.charcoalLight, alignSelf: "flex-start" }]}>
        {fmtTime(msg.createdAt)}
      </Text>
    </View>
  );
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

const bubble = StyleSheet.create({
  wrap: { maxWidth: "84%", marginBottom: 10 },
  balloonMe: {
    borderRadius: 18,
    borderBottomRightRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  balloonThem: {
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
  },
  // Layer 1 — original text
  // Slightly muted to de-emphasize; still legible, shows authentic voice
  textOriginal: {
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    lineHeight: 22,
  },
  // Layer 2 — translation
  // Primary readable content; full weight, dominant color
  textTranslation: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    lineHeight: 22,
  },
  // Layer 3 — pronunciation helper
  // Assistive reading aid; small, italic, visually distinct and subordinate
  textPronunciation: {
    fontFamily: "Inter_400Regular",
    fontSize: 11.5,
    lineHeight: 17,
    fontStyle: "italic",
    letterSpacing: 0.4,
    marginTop: 4,
  },
  textMe: {
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    lineHeight: 22,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 7,
  },
  time: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    marginTop: 4,
    opacity: 0.55,
  },
});

// ─── Enrichment map ─────────────────────────────────────────────────────────
// Stores fetched translations per msgId
interface Enrichment { translatedText?: string; pronunciationText?: string; }

// ─── ChatDetailScreen ────────────────────────────────────────────────────────

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
    showPronunciation,
    setShowPronunciation,
  } = useApp();

  const [inputText, setInputText] = useState("");
  const [aiSuggesting, setAiSuggesting] = useState(false);
  const [enrichmentMap, setEnrichmentMap] = useState<Record<string, Enrichment>>({});
  const inflight = useRef<Set<string>>(new Set());
  const flatRef = useRef<FlatList>(null);

  const conversation = conversations.find((c) => c.id === id);
  const convMessages = messages[id || "conv1"] || [];
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  if (!conversation) {
    return (
      <View style={[styles.container, { backgroundColor: colors.surface, paddingTop: topPad }]}>
        <Text style={{ color: colors.charcoal, padding: 20 }}>Conversation not found</Text>
      </View>
    );
  }

  const viewerLang: "ko" | "ja" = profile.country === "KR" ? "ko" : "ja";
  const translationEnabled = !!conversation.translationEnabled;

  // ── Enrichment effect ────────────────────────────────────────────────────
  // Fills enrichmentMap with translations for received foreign-language messages.
  // Priority: module cache → pre-set msg fields → API fetch
  // showPronunciation toggle does NOT trigger this effect.
  useEffect(() => {
    if (!translationEnabled) return;

    convMessages.forEach((msg) => {
      if (msg.senderId === CURRENT_USER_ID) return;
      if (msg.originalLanguage === viewerLang) return;

      const cacheKey = `${msg.id}:${viewerLang}`;

      // 1. Module cache hit
      const cached = translationCache.get(cacheKey);
      if (cached) {
        setEnrichmentMap((prev) => {
          if (prev[msg.id]?.translatedText) return prev;
          return { ...prev, [msg.id]: { translatedText: cached.translation, pronunciationText: cached.pronunciation } };
        });
        return;
      }

      // 2. Pre-set data in message (mock data or DB)
      if (msg.translatedText) {
        const result = { translation: msg.translatedText, pronunciation: msg.pronunciationText ?? "" };
        translationCache.set(cacheKey, result);
        setEnrichmentMap((prev) => {
          if (prev[msg.id]?.translatedText) return prev;
          return { ...prev, [msg.id]: { translatedText: msg.translatedText, pronunciationText: msg.pronunciationText } };
        });
        return;
      }

      // 3. API fetch (inflight ref prevents duplicate concurrent calls)
      if (inflight.current.has(cacheKey)) return;
      inflight.current.add(cacheKey);

      fetch(`${API_BASE}/api/ai/translate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: msg.originalText, sourceLang: msg.originalLanguage, viewerLang }),
      })
        .then((r) => r.json())
        .then((data: TranslationResult) => {
          translationCache.set(cacheKey, data);
          setEnrichmentMap((prev) => ({
            ...prev,
            [msg.id]: { translatedText: data.translation, pronunciationText: data.pronunciation },
          }));
        })
        .catch(() => {}) // silent; bubble shows without translation
        .finally(() => { inflight.current.delete(cacheKey); });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [convMessages, translationEnabled, viewerLang]);

  // ── renderItem ───────────────────────────────────────────────────────────
  // Depends on enrichmentMap so FlatList items receive updated translations.
  // Does NOT depend on showPronunciation — bubbles subscribe to that via context.
  const renderMessage = useCallback(
    ({ item }: { item: Message }) => {
      const enrichment = enrichmentMap[item.id];
      const isMe = item.senderId === CURRENT_USER_ID;
      const needsFetch = !isMe && translationEnabled && item.originalLanguage !== viewerLang && !enrichment?.translatedText;
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
    [enrichmentMap, translationEnabled, viewerLang]
  );

  // ── Handlers ─────────────────────────────────────────────────────────────
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
        text: m.originalText,
      }));
      const targetLang = conversation.user.country === "JP" ? "ja" : "ko";
      const response = await fetch(`${API_BASE}/api/ai/suggest-reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: recentMessages, targetLang }),
      });
      if (!response.ok) throw new Error(`API ${response.status}`);
      const data = (await response.json()) as { suggestion?: string; error?: string };
      if (data.suggestion) {
        setInputText(data.suggestion);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } else throw new Error(data.error ?? "No suggestion");
    } catch {
      Alert.alert(t("chat.suggestReply"), "Could not generate a reply. Please try again.");
    } finally {
      setAiSuggesting(false);
    }
  };

  const handleUnlock = () => {
    if (!id) return;
    unlockExternalContact(id);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <View
        style={[
          styles.header,
          { paddingTop: topPad + 10, borderBottomColor: colors.border, backgroundColor: colors.surface },
        ]}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
          <Feather name="chevron-left" size={24} color={colors.charcoal} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.headerUser}>
          <ProfileImage photoKey={conversation.user.photos[0]} size={36} />
          <View>
            <View style={styles.headerNameRow}>
              <Text style={[styles.headerName, { color: colors.charcoal }]}>
                {conversation.user.nickname}
              </Text>
              <CountryFlag country={conversation.user.country} size={12} />
            </View>
            <Text style={[styles.headerStatus, { color: colors.charcoalLight }]}>
              {conversation.user.lastActive}
            </Text>
          </View>
        </TouchableOpacity>

        {/* ── Toggles ─────────────────────────────────────────────────── */}
        <View style={styles.toggles}>
          {/* Pronunciation toggle — controls ONLY Layer 3 visibility */}
          <TouchableOpacity
            style={[
              styles.toggle,
              showPronunciation
                ? { backgroundColor: colors.rose, borderColor: colors.rose }
                : { backgroundColor: colors.muted, borderColor: colors.border },
            ]}
            onPress={() => setShowPronunciation(!showPronunciation)}
            activeOpacity={0.75}
          >
            <Feather
              name="volume-2"
              size={13}
              color={showPronunciation ? colors.white : colors.charcoalLight}
            />
          </TouchableOpacity>

          {/* Translation toggle */}
          <TouchableOpacity
            style={[
              styles.toggle,
              translationEnabled
                ? { backgroundColor: colors.rose, borderColor: colors.rose }
                : { backgroundColor: colors.muted, borderColor: colors.border },
            ]}
            onPress={() => id && toggleTranslation(id)}
            activeOpacity={0.75}
          >
            <Feather
              name="globe"
              size={13}
              color={translationEnabled ? colors.white : colors.charcoalLight}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Contact unlock banner ───────────────────────────────────────── */}
      {!conversation.externalUnlocked && (
        <TouchableOpacity
          style={[styles.unlockBanner, { backgroundColor: colors.roseLight, borderBottomColor: colors.roseSoft }]}
          onPress={handleUnlock}
          activeOpacity={0.8}
        >
          <Feather name="unlock" size={13} color={colors.rose} />
          <Text style={[styles.unlockText, { color: colors.rose }]}>{t("chat.unlock")}</Text>
          <Feather name="chevron-right" size={13} color={colors.roseSoft} style={{ marginLeft: "auto" }} />
        </TouchableOpacity>
      )}
      {conversation.externalUnlocked && (
        <View style={[styles.unlockBanner, { backgroundColor: colors.greenLight, borderBottomColor: "#B2F2C9" }]}>
          <Feather name="check-circle" size={13} color={colors.green} />
          <Text style={[styles.unlockText, { color: colors.green }]}>{t("chat.unlocked")}</Text>
        </View>
      )}

      {/* ── Message list ────────────────────────────────────────────────── */}
      <FlatList
        ref={flatRef}
        data={convMessages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        // extraData triggers re-render when enrichments arrive;
        // showPronunciation updates happen via context, not extraData
        extraData={enrichmentMap}
        contentContainerStyle={[styles.messageList, { paddingBottom: 16 }]}
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
              backgroundColor: colors.surface,
              borderTopColor: colors.border,
              paddingBottom: bottomPad + 10,
            },
          ]}
        >
          {/* AI suggest button */}
          <TouchableOpacity
            style={[
              styles.aiBtn,
              { backgroundColor: aiSuggesting ? colors.roseSoft : colors.roseLight },
            ]}
            onPress={handleAiSuggest}
            disabled={aiSuggesting}
            activeOpacity={0.75}
          >
            {aiSuggesting ? (
              <ActivityIndicator size="small" color={colors.rose} />
            ) : (
              <Feather name="zap" size={15} color={colors.rose} />
            )}
          </TouchableOpacity>

          {/* Text input */}
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: colors.muted,
                borderColor: colors.border,
                color: colors.charcoal,
              },
            ]}
            placeholder={t("chat.placeholder")}
            placeholderTextColor={colors.charcoalFaint}
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={500}
          />

          {/* Send button */}
          <TouchableOpacity
            style={[
              styles.sendBtn,
              { backgroundColor: inputText.trim() ? colors.rose : colors.muted },
            ]}
            onPress={handleSend}
            disabled={!inputText.trim()}
            activeOpacity={0.8}
          >
            <Feather
              name="send"
              size={17}
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

  // ── Header ──────────────────────────────────────────────────────────────
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  backBtn: { padding: 4 },
  headerUser: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10 },
  headerNameRow: { flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 1 },
  headerName: { fontFamily: "Inter_600SemiBold", fontSize: 15 },
  headerStatus: { fontFamily: "Inter_400Regular", fontSize: 11 },
  toggles: { flexDirection: "row", alignItems: "center", gap: 6 },
  toggle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },

  // ── Banners ──────────────────────────────────────────────────────────────
  unlockBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderBottomWidth: 1,
  },
  unlockText: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    flex: 1,
  },

  // ── Message list ─────────────────────────────────────────────────────────
  messageList: {
    paddingHorizontal: 16,
    paddingTop: 14,
  },

  // ── Input ────────────────────────────────────────────────────────────────
  inputArea: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 12,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  aiBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  input: {
    flex: 1,
    borderRadius: 19,
    paddingHorizontal: 14,
    paddingTop: 9,
    paddingBottom: 9,
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    maxHeight: 100,
    borderWidth: 1,
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
});
