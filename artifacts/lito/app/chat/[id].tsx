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
interface TranslationResult { translation: string; }
const translationCache = new Map<string, TranslationResult>();

// ─── MessageBubble ────────────────────────────────────────────────────────────
//
// Two-layer architecture:
//   Layer 1: msg.originalText  — always rendered
//   Layer 2: translatedText    — rendered when translation is available
//
// Translation is always stable and independent of any other toggle.

interface BubbleProps {
  msg: Message;
  translatedText: string | undefined;
  isTranslating: boolean;
  translationEnabled: boolean;
  viewerLang: "ko" | "ja";
}

function MessageBubble({
  msg,
  translatedText,
  isTranslating,
  translationEnabled,
  viewerLang,
}: BubbleProps) {
  const colors = useColors();
  const isMe = msg.senderId === CURRENT_USER_ID;

  // Whether this message warrants a translation layer at all
  const needsTranslation =
    !isMe && translationEnabled && msg.originalLanguage !== viewerLang;

  // Language label shown on the translation chip: the viewer's language
  const translationLangLabel = viewerLang === "ja" ? "JA" : "KO";

  if (isMe) {
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

  // ── Received message ──────────────────────────────────────────────────────
  return (
    <View style={[bubble.wrap, { alignSelf: "flex-start" }]}>
      <View
        style={[
          bubble.balloonThem,
          {
            backgroundColor: colors.bubbleThem,
            borderColor: colors.border,
            borderLeftColor: needsTranslation ? colors.roseSoft : colors.border,
            borderLeftWidth: needsTranslation ? 3 : StyleSheet.hairlineWidth,
          },
        ]}
      >
        {/* Layer 1 — original text: authentic voice, muted */}
        <Text style={[bubble.textOriginal, { color: colors.charcoalMid }]}>
          {msg.originalText}
        </Text>

        {/* Translation loading state */}
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

        {/* Layer 2 — translated text: primary reading content */}
        {needsTranslation && !isTranslating && !!translatedText && (
          <>
            <View style={[bubble.divider, { backgroundColor: colors.border }]} />
            <View style={bubble.translationRow}>
              <View style={[bubble.langChip, { backgroundColor: colors.roseLight }]}>
                <Text style={[bubble.langChipText, { color: colors.rose }]}>
                  {translationLangLabel}
                </Text>
              </View>
              <Text style={[bubble.textTranslation, { color: colors.charcoal }]}>
                {translatedText}
              </Text>
            </View>
          </>
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
  wrap: { maxWidth: "80%", marginBottom: 14 },

  balloonMe: {
    borderRadius: 20,
    borderBottomRightRadius: 5,
    paddingHorizontal: 15,
    paddingVertical: 11,
  },

  balloonThem: {
    borderRadius: 20,
    borderBottomLeftRadius: 5,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderWidth: StyleSheet.hairlineWidth,
  },

  // Layer 1 — original: the raw authentic voice
  textOriginal: {
    fontFamily: "Inter_400Regular",
    fontSize: 14.5,
    lineHeight: 21,
    letterSpacing: 0.1,
  },

  // Layer 2 — translation row wraps chip + text
  translationRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 7,
    flexWrap: "wrap",
  },

  // Small language label chip
  langChip: {
    borderRadius: 5,
    paddingHorizontal: 5,
    paddingVertical: 2,
    marginTop: 2,
    alignSelf: "flex-start",
  },
  langChipText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 9,
    letterSpacing: 0.8,
  },

  // Layer 2 — translated text: primary readable content
  textTranslation: {
    fontFamily: "Inter_500Medium",
    fontSize: 15.5,
    lineHeight: 23,
    flex: 1,
    flexShrink: 1,
  },

  textMe: {
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    lineHeight: 22,
  },

  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 9,
  },

  time: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    marginTop: 5,
    opacity: 0.5,
  },
});

// ─── Enrichment map ─────────────────────────────────────────────────────────
// Stores fetched translations per msgId
interface Enrichment { translatedText?: string; }

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
          return { ...prev, [msg.id]: { translatedText: cached.translation } };
        });
        return;
      }

      // 2. Pre-set data in message (mock data or DB)
      if (msg.translatedText) {
        const result = { translation: msg.translatedText };
        translationCache.set(cacheKey, result);
        setEnrichmentMap((prev) => {
          if (prev[msg.id]?.translatedText) return prev;
          return { ...prev, [msg.id]: { translatedText: msg.translatedText } };
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
            [msg.id]: { translatedText: data.translation },
          }));
        })
        .catch(() => {}) // silent; bubble shows without translation
        .finally(() => { inflight.current.delete(cacheKey); });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [convMessages, translationEnabled, viewerLang]);

  // ── renderItem ───────────────────────────────────────────────────────────
  // Depends on enrichmentMap so FlatList items receive updated translations.
  const renderMessage = useCallback(
    ({ item }: { item: Message }) => {
      const enrichment = enrichmentMap[item.id];
      const isMe = item.senderId === CURRENT_USER_ID;
      const needsFetch = !isMe && translationEnabled && item.originalLanguage !== viewerLang && !enrichment?.translatedText;
      return (
        <MessageBubble
          msg={item}
          translatedText={enrichment?.translatedText}
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
          {
            paddingTop: topPad + 8,
            borderBottomColor: colors.border,
            backgroundColor: colors.surface,
          },
        ]}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Feather name="arrow-left" size={22} color={colors.charcoal} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.headerUser} activeOpacity={0.7}>
          <View style={styles.avatarWrap}>
            <ProfileImage photoKey={conversation.user.photos[0]} size={40} />
            <View
              style={[
                styles.onlineDot,
                { backgroundColor: colors.green, borderColor: colors.surface },
              ]}
            />
          </View>
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

        {/* Translation toggle pill */}
        <TouchableOpacity
          style={[
            styles.translationToggle,
            translationEnabled
              ? { backgroundColor: colors.rose, borderColor: colors.rose }
              : { backgroundColor: colors.muted, borderColor: colors.border },
          ]}
          onPress={() => id && toggleTranslation(id)}
          activeOpacity={0.75}
        >
          <Feather
            name="globe"
            size={12}
            color={translationEnabled ? colors.white : colors.charcoalLight}
          />
          <Text
            style={[
              styles.translationToggleLabel,
              { color: translationEnabled ? colors.white : colors.charcoalLight },
            ]}
          >
            {translationEnabled ? "ON" : "OFF"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── Contact unlock banner ───────────────────────────────────────── */}
      {!conversation.externalUnlocked && (
        <TouchableOpacity
          style={[
            styles.unlockBanner,
            { backgroundColor: colors.roseLight, borderBottomColor: colors.roseSoft },
          ]}
          onPress={handleUnlock}
          activeOpacity={0.8}
        >
          <View style={[styles.unlockIconWrap, { backgroundColor: colors.roseSoft }]}>
            <Feather name="unlock" size={11} color={colors.rose} />
          </View>
          <Text style={[styles.unlockText, { color: colors.rose }]}>{t("chat.unlock")}</Text>
          <Feather name="chevron-right" size={13} color={colors.roseMid} style={{ marginLeft: "auto" }} />
        </TouchableOpacity>
      )}
      {conversation.externalUnlocked && (
        <View
          style={[
            styles.unlockBanner,
            { backgroundColor: colors.greenLight, borderBottomColor: "#B2F2C9" },
          ]}
        >
          <View style={[styles.unlockIconWrap, { backgroundColor: "#B2F2C9" }]}>
            <Feather name="check-circle" size={11} color={colors.green} />
          </View>
          <Text style={[styles.unlockText, { color: colors.green }]}>{t("chat.unlocked")}</Text>
        </View>
      )}

      {/* ── Message list ────────────────────────────────────────────────── */}
      <FlatList
        ref={flatRef}
        data={convMessages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        extraData={enrichmentMap}
        contentContainerStyle={[styles.messageList, { paddingBottom: 20 }]}
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
              paddingBottom: bottomPad + 12,
            },
          ]}
        >
          {/* AI suggest button */}
          <TouchableOpacity
            style={[
              styles.aiBtn,
              {
                backgroundColor: aiSuggesting ? colors.roseSoft : colors.roseLight,
                borderColor: colors.roseSoft,
              },
            ]}
            onPress={handleAiSuggest}
            disabled={aiSuggesting}
            activeOpacity={0.75}
          >
            {aiSuggesting ? (
              <ActivityIndicator size="small" color={colors.rose} />
            ) : (
              <>
                <Feather name="zap" size={13} color={colors.rose} />
                <Text style={[styles.aiBtnLabel, { color: colors.rose }]}>AI</Text>
              </>
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
              {
                backgroundColor: inputText.trim() ? colors.rose : colors.muted,
                borderColor: inputText.trim() ? colors.rose : colors.border,
              },
            ]}
            onPress={handleSend}
            disabled={!inputText.trim()}
            activeOpacity={0.8}
          >
            <Feather
              name="send"
              size={16}
              color={inputText.trim() ? colors.white : colors.charcoalFaint}
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
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarWrap: {
    position: "relative",
  },
  onlineDot: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
  },
  headerUser: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  headerInfo: {
    flex: 1,
  },
  headerNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 2,
  },
  headerName: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
  },
  headerStatus: {
    fontFamily: "Inter_400Regular",
    fontSize: 11.5,
  },

  // Translation toggle — wider pill with label
  translationToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
  },
  translationToggleLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 10,
    letterSpacing: 0.5,
  },

  // ── Banners ──────────────────────────────────────────────────────────────
  unlockBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  unlockIconWrap: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  unlockText: {
    fontFamily: "Inter_500Medium",
    fontSize: 12.5,
    flex: 1,
  },

  // ── Message list ─────────────────────────────────────────────────────────
  messageList: {
    paddingHorizontal: 16,
    paddingTop: 18,
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
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderRadius: 19,
    borderWidth: 1,
    minHeight: 38,
  },
  aiBtnLabel: {
    fontFamily: "Inter_700Bold",
    fontSize: 10,
    letterSpacing: 0.3,
  },
  input: {
    flex: 1,
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingTop: 10,
    paddingBottom: 10,
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    lineHeight: 21,
    maxHeight: 120,
    borderWidth: StyleSheet.hairlineWidth,
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
});
