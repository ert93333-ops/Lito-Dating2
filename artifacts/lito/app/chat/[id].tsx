import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import React, { useEffect, useRef, useState } from "react";
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
import { Message } from "@/types";

const CURRENT_USER_ID = "me";

// Build the API base URL from the injected domain env var
const API_BASE = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}`
  : "http://localhost:8080";

interface TranslationResult {
  translation: string;
  pronunciation: string;
}

// Per-session in-memory cache keyed by "<msgId>:<viewerLang>"
const translationCache = new Map<string, TranslationResult>();

async function fetchTranslation(
  msgId: string,
  text: string,
  sourceLang: "ko" | "ja",
  viewerLang: "ko" | "ja"
): Promise<TranslationResult> {
  const cacheKey = `${msgId}:${viewerLang}`;
  const cached = translationCache.get(cacheKey);
  if (cached) return cached;

  const response = await fetch(`${API_BASE}/api/ai/translate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, sourceLang, viewerLang }),
  });

  if (!response.ok) throw new Error(`API error: ${response.status}`);
  const data = (await response.json()) as TranslationResult;
  translationCache.set(cacheKey, data);
  return data;
}

// ─── Message Bubble ───────────────────────────────────────────────────────────
//
// Layout rules (only applies to received messages when translationEnabled):
//
//  KR viewer reading JP message:
//    ① original Japanese   (msg.text — normal weight)
//    ── separator ──
//    ② Korean translation  (medium, clearest)
//    ③ Korean pronunciation (small, gray — only if showPronunciation)
//
//  JP viewer reading KR message:
//    ① Japanese translation (medium, clearest — shown FIRST)
//    ── separator ──
//    ② original Korean     (msg.text — dimmer)
//    ③ Katakana pronunciation (small, gray — only if showPronunciation)
//
//  Own messages / translation off: just msg.text, no layers.

function MessageBubble({
  msg,
  translationEnabled,
  showPronunciation,
  viewerLang,
  senderLang,
}: {
  msg: Message;
  translationEnabled: boolean;
  showPronunciation: boolean;
  viewerLang: "ko" | "ja";
  senderLang: "ko" | "ja";
}) {
  const colors = useColors();
  const isMe = msg.senderId === CURRENT_USER_ID;

  const shouldTranslate = translationEnabled && !isMe && senderLang !== viewerLang;

  const [result, setResult] = useState<TranslationResult | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!shouldTranslate) return;

    const cacheKey = `${msg.id}:${viewerLang}`;
    const cached = translationCache.get(cacheKey);
    if (cached) { setResult(cached); return; }

    let cancelled = false;
    setLoading(true);

    fetchTranslation(msg.id, msg.text, senderLang, viewerLang)
      .then((data) => { if (!cancelled) setResult(data); })
      .catch(() => { /* TODO: show subtle inline retry indicator */ })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [msg.id, msg.text, shouldTranslate, senderLang, viewerLang]);

  // ── colour tokens ──────────────────────────────────────────────────────────
  const originalColor  = isMe ? "rgba(255,255,255,0.90)" : colors.charcoal;
  const translColor    = isMe ? colors.white             : colors.charcoal;
  const dimColor       = isMe ? "rgba(255,255,255,0.55)" : colors.charcoalLight;
  const pronunciColor  = isMe ? "rgba(255,255,255,0.42)" : "#ABABAB";
  const sepColor       = isMe ? "rgba(255,255,255,0.20)" : colors.border;

  // ── separator helper ───────────────────────────────────────────────────────
  const Separator = () => (
    <View style={[bubbleStyles.separator, { backgroundColor: sepColor }]} />
  );

  // ── render ─────────────────────────────────────────────────────────────────
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
        {/* ── NO translation: just the message ─────────────────────────── */}
        {!shouldTranslate && (
          <Text style={[styles.bubbleText, { color: originalColor }]}>
            {msg.text}
          </Text>
        )}

        {/* ── Loading spinner ───────────────────────────────────────────── */}
        {shouldTranslate && loading && (
          <>
            <Text style={[styles.bubbleText, { color: originalColor }]}>
              {msg.text}
            </Text>
            <Separator />
            <ActivityIndicator
              size="small"
              color={isMe ? "rgba(255,255,255,0.6)" : colors.charcoalLight}
              style={{ marginTop: 2, alignSelf: "flex-start" }}
            />
          </>
        )}

        {/* ── KR viewer reading JP:  original → translation → pronunciation */}
        {shouldTranslate && !loading && result && viewerLang === "ko" && (
          <>
            {/* ① original Japanese */}
            <Text style={[styles.bubbleText, { color: originalColor }]}>
              {msg.text}
            </Text>
            <Separator />
            {/* ② Korean translation — primary */}
            <Text style={[bubbleStyles.translText, { color: translColor }]}>
              {result.translation}
            </Text>
            {/* ③ Korean pronunciation — last, smallest */}
            {showPronunciation && !!result.pronunciation && (
              <Text style={[bubbleStyles.pronText, { color: pronunciColor }]}>
                {result.pronunciation}
              </Text>
            )}
          </>
        )}

        {/* ── JP viewer reading KR:  translation → original → pronunciation */}
        {shouldTranslate && !loading && result && viewerLang === "ja" && (
          <>
            {/* ① Japanese translation — primary (shown FIRST) */}
            <Text style={[bubbleStyles.translText, { color: translColor }]}>
              {result.translation}
            </Text>
            <Separator />
            {/* ② original Korean — dimmed */}
            <Text style={[bubbleStyles.originalText, { color: dimColor }]}>
              {msg.text}
            </Text>
            {/* ③ Katakana pronunciation — last, smallest */}
            {showPronunciation && !!result.pronunciation && (
              <Text style={[bubbleStyles.pronText, { color: pronunciColor }]}>
                {result.pronunciation}
              </Text>
            )}
          </>
        )}
      </View>

      <Text style={[styles.timestamp, { color: colors.charcoalLight, alignSelf: isMe ? "flex-end" : "flex-start" }]}>
        {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
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
    marginTop: 2,
  },
});

// ─── Chat Detail Screen ────────────────────────────────────────────────────────

export default function ChatDetailScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const {
    conversations,
    messages,
    profile,
    sendMessage,
    toggleTranslation,
    unlockExternalContact,
    showPronunciation,
  } = useApp();
  const [inputText, setInputText] = useState("");
  const [aiSuggesting, setAiSuggesting] = useState(false);
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

  // My language and the other user's language
  const viewerLang = profile.language;
  const senderLang = conversation.user.language;

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
        text: m.text,
      }));

      // TODO: expose language preference per-conversation for finer control
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
      // TODO: Show a more specific error (e.g. network vs. server vs. quota)
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
      <View style={[styles.header, { paddingTop: topPad + 12, borderBottomColor: colors.border, backgroundColor: colors.white }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="chevron-left" size={24} color={colors.charcoal} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.headerUser}>
          <ProfileImage photoKey={conversation.user.photos[0]} size={38} />
          <View style={styles.headerInfo}>
            <View style={styles.headerNameRow}>
              <Text style={[styles.headerName, { color: colors.charcoal }]}>{conversation.user.nickname}</Text>
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
            <Feather name="globe" size={14} color={conversation.translationEnabled ? colors.white : colors.charcoalLight} />
          </TouchableOpacity>
        </View>
      </View>

      {!conversation.externalUnlocked && (
        <TouchableOpacity
          style={[styles.unlockBanner, { backgroundColor: colors.roseLight, borderColor: colors.roseSoft }]}
          onPress={handleUnlock}
        >
          <Feather name="unlock" size={14} color={colors.rose} />
          <Text style={[styles.unlockText, { color: colors.rose }]}>
            Request external contact unlock · 외부 연락처 잠금 해제
          </Text>
        </TouchableOpacity>
      )}

      {conversation.externalUnlocked && (
        <View style={[styles.unlockedBanner, { backgroundColor: "#D9FFE6" }]}>
          <Feather name="check-circle" size={14} color="#34C759" />
          <Text style={[styles.unlockText, { color: "#1D8A3A" }]}>
            External contact unlocked! 인스타그램을 공유해보세요 ✨
          </Text>
        </View>
      )}

      <FlatList
        ref={flatRef}
        data={convMessages}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <MessageBubble
            msg={item}
            translationEnabled={!!conversation.translationEnabled}
            showPronunciation={showPronunciation}
            viewerLang={viewerLang}
            senderLang={senderLang}
          />
        )}
        contentContainerStyle={[styles.messageList, { paddingBottom: 12 }]}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => flatRef.current?.scrollToEnd({ animated: true })}
      />

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
            style={[styles.input, { backgroundColor: colors.muted, borderColor: colors.border, color: colors.charcoal }]}
            placeholder="Message... 메시지... メッセージ..."
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
            <Feather name="send" size={18} color={inputText.trim() ? colors.white : colors.charcoalLight} />
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
  headerName: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
  },
  headerStatus: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
  },
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
