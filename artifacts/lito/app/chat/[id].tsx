import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  Modal,
  Platform,
  Pressable,
  ScrollView,
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
import { useGrowth } from "@/context/GrowthContext";
import { useColors } from "@/hooks/useColors";
import { useLocale } from "@/hooks/useLocale";
import { AI_COACH_PACKS } from "@/services/monetization";
import { Message } from "@/types";

const CURRENT_USER_ID = "me";

const API_BASE = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}`
  : "http://localhost:8080";

// ── Module-level translation cache ───────────────────────────────────────────
// Persists across remounts. Key = "<msgId>:<targetLang>"
interface TranslationResult { translation: string; }
const translationCache = new Map<string, TranslationResult>();

// ── Per-message enrichment ────────────────────────────────────────────────────
// Each entry is keyed by message ID and stores the state for that individual message.
interface Enrichment {
  translatedText?: string;
  isLoading?: boolean;
  failed?: boolean;
}

// ── AI Coach structured response ─────────────────────────────────────────────
interface CoachResult {
  summary: string;
  directions: string[];
  examples: string[];
  tips: string[];
}

// ─── MessageBubble ────────────────────────────────────────────────────────────
//
// Two-layer architecture:
//   Layer 1: msg.originalText  — always rendered
//   Layer 2: translatedText    — rendered when translation is available
//
// Per-message translate button triggers translation for just that message.

interface BubbleProps {
  msg: Message;
  enrichment: Enrichment | undefined;
  viewerLang: "ko" | "ja";
  /** Called when the user taps the translate button on this specific message. */
  onTranslate: () => void;
}

function MessageBubble({ msg, enrichment, viewerLang, onTranslate }: BubbleProps) {
  const colors = useColors();
  const isMe = msg.senderId === CURRENT_USER_ID;

  // Translate button press scale — physical tactile feedback
  const translateScale = useRef(new Animated.Value(1)).current;

  const handleTranslatePressIn = () => {
    Animated.spring(translateScale, {
      toValue: 0.9,
      useNativeDriver: true,
      speed: 30,
      bounciness: 0,
    }).start();
  };

  const handleTranslatePressOut = () => {
    Animated.spring(translateScale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 18,
      bounciness: 4,
    }).start();
  };

  const handleTranslatePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onTranslate();
  };

  const hasTranslation = !!enrichment?.translatedText;
  const isTranslating = !!enrichment?.isLoading;
  const hasFailed = !!enrichment?.failed;

  // What language the translation IS IN — always the opposite of the source message.
  // Korean message → "JA" chip.  Japanese message → "KO" chip.
  const translationLangLabel = msg.originalLanguage === "ko" ? "JA" : "KO";

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
            borderLeftColor: hasTranslation ? colors.roseSoft : colors.border,
            borderLeftWidth: hasTranslation ? 3 : StyleSheet.hairlineWidth,
          },
        ]}
      >
        {/* Layer 1 — original text: authentic voice */}
        <Text style={[bubble.textOriginal, { color: colors.charcoalMid }]}>
          {msg.originalText}
        </Text>

        {/* Translation loading spinner */}
        {isTranslating && (
          <>
            <View style={[bubble.divider, { backgroundColor: colors.border }]} />
            <ActivityIndicator
              size="small"
              color={colors.rose}
              style={{ alignSelf: "flex-start", marginTop: 2 }}
            />
          </>
        )}

        {/* Layer 2 — translated text: primary reading content */}
        {hasTranslation && !isTranslating && (
          <>
            <View style={[bubble.divider, { backgroundColor: colors.border }]} />
            <View style={bubble.translationRow}>
              <View style={[bubble.langChip, { backgroundColor: colors.roseLight }]}>
                <Text style={[bubble.langChipText, { color: colors.rose }]}>
                  {translationLangLabel}
                </Text>
              </View>
              <Text style={[bubble.textTranslation, { color: colors.charcoal }]}>
                {enrichment!.translatedText}
              </Text>
            </View>
          </>
        )}

        {/* Translate button — shown when there is no translation yet and not loading.
            Label is determined by the MESSAGE language, never the viewer language.
            Korean message → "日本語に翻訳" (translate to Japanese)
            Japanese message → "한국어로 번역" (translate to Korean) */}
        {!hasTranslation && !isTranslating && !hasFailed && (
          <Animated.View style={{ transform: [{ scale: translateScale }], alignSelf: "flex-start" }}>
            <Pressable
              style={[bubble.translateBtn, { borderColor: colors.roseSoft }]}
              onPress={handleTranslatePress}
              onPressIn={handleTranslatePressIn}
              onPressOut={handleTranslatePressOut}
            >
              <Feather name="globe" size={11} color={colors.rose} />
              <Text style={[bubble.translateBtnText, { color: colors.rose }]}>
                {msg.originalLanguage === "ko" ? "日本語に翻訳" : "한국어로 번역"}
              </Text>
            </Pressable>
          </Animated.View>
        )}

        {/* Error / retry state */}
        {hasFailed && !hasTranslation && !isTranslating && (
          <Animated.View style={{ transform: [{ scale: translateScale }], alignSelf: "flex-start" }}>
            <Pressable
              style={[bubble.translateBtn, { borderColor: colors.border }]}
              onPress={handleTranslatePress}
              onPressIn={handleTranslatePressIn}
              onPressOut={handleTranslatePressOut}
            >
              <Feather name="refresh-cw" size={11} color={colors.charcoalLight} />
              <Text style={[bubble.translateBtnText, { color: colors.charcoalLight }]}>
                {msg.originalLanguage === "ko" ? "再試行" : "다시 시도"}
              </Text>
            </Pressable>
          </Animated.View>
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

  // Per-message translate button
  translateBtn: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 5,
    marginTop: 8,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
  },
  translateBtnText: {
    fontFamily: "Inter_500Medium",
    fontSize: 11.5,
  },
});

// ─── AiCoachCreditsModal ──────────────────────────────────────────────────────
// Bottom-sheet style modal shown when AI coach credits are exhausted.
// Offers credit packs (mocked) and plan upgrade without blocking the chat.

interface AiCoachCreditsModalProps {
  visible: boolean;
  planId: string;
  onClose: () => void;
  onBuyPack: (count: number) => void;
  onUpgrade: () => void;
}

function AiCoachCreditsModal({
  visible,
  planId,
  onClose,
  onBuyPack,
  onUpgrade,
}: AiCoachCreditsModalProps) {
  const colors = useColors();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <Pressable style={creditModal.backdrop} onPress={onClose} />
      <View style={[creditModal.sheet, { backgroundColor: colors.surface }]}>
        {/* Handle */}
        <View style={[creditModal.handle, { backgroundColor: colors.border }]} />

        {/* Header */}
        <View style={creditModal.header}>
          <View style={[creditModal.iconWrap, { backgroundColor: "#FFF0F3" }]}>
            <Feather name="zap" size={20} color="#D85870" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[creditModal.title, { color: colors.charcoal }]}>
              AI Coach Credits
            </Text>
            <Text style={[creditModal.subtitle, { color: colors.charcoalLight }]}>
              {planId === "free"
                ? "You've used your 5 free daily credits"
                : "You've used your 20 daily credits"}
            </Text>
          </View>
        </View>

        {/* Divider */}
        <View style={[creditModal.divider, { backgroundColor: colors.border }]} />

        {/* Credit packs */}
        <Text style={[creditModal.sectionLabel, { color: colors.charcoalLight }]}>
          Buy extra credits · resets every day
        </Text>

        {AI_COACH_PACKS.map((pack) => (
          <Pressable
            key={pack.count}
            style={[
              creditModal.packRow,
              {
                backgroundColor: pack.popular ? "#FFF0F3" : colors.background,
                borderColor: pack.popular ? "#F2BDCA" : colors.border,
              },
            ]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onBuyPack(pack.count);
            }}
          >
            <View style={creditModal.packLeft}>
              {pack.popular && (
                <View style={[creditModal.popularBadge, { backgroundColor: "#D85870" }]}>
                  <Text style={creditModal.popularText}>Popular</Text>
                </View>
              )}
              <Text style={[creditModal.packLabel, { color: colors.charcoal }]}>
                {pack.label}
              </Text>
              <Text style={[creditModal.packDesc, { color: colors.charcoalLight }]}>
                one-time purchase
              </Text>
            </View>
            <View style={[creditModal.packPricePill, { backgroundColor: pack.popular ? "#D85870" : colors.muted }]}>
              <Text style={[creditModal.packPrice, { color: pack.popular ? "#fff" : colors.charcoal }]}>
                {pack.priceUSD}
              </Text>
            </View>
          </Pressable>
        ))}

        {/* Upgrade to Premium */}
        <Pressable
          style={[creditModal.upgradeBtn, { backgroundColor: "#D85870" }]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            onUpgrade();
          }}
        >
          <Feather name="zap" size={15} color="#fff" />
          <Text style={creditModal.upgradeBtnText}>Unlimited with Premium · $19.99/mo</Text>
        </Pressable>

        <Text style={[creditModal.disclaimer, { color: colors.charcoalFaint }]}>
          Purchases are mocked — no real charge occurs
        </Text>
      </View>
    </Modal>
  );
}

const creditModal = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 22,
    paddingBottom: 36,
    paddingTop: 14,
    gap: 0,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 20,
  },
  handle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 18,
  },
  iconWrap: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontFamily: "Inter_700Bold",
    fontSize: 18,
    marginBottom: 3,
  },
  subtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 13.5,
    lineHeight: 19,
  },
  divider: { height: StyleSheet.hairlineWidth, marginBottom: 16 },
  sectionLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    letterSpacing: 0.3,
    marginBottom: 10,
  },
  packRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 13,
    marginBottom: 9,
  },
  packLeft: { gap: 3 },
  popularBadge: {
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
    alignSelf: "flex-start",
    marginBottom: 2,
  },
  popularText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 9,
    color: "#fff",
    letterSpacing: 0.4,
  },
  packLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
  },
  packDesc: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
  },
  packPricePill: {
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  packPrice: {
    fontFamily: "Inter_700Bold",
    fontSize: 14,
  },
  upgradeBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 100,
    paddingVertical: 16,
    marginTop: 4,
    marginBottom: 10,
  },
  upgradeBtnText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: "#fff",
  },
  disclaimer: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    textAlign: "center",
  },
});

// ─── AiCoachSheet ─────────────────────────────────────────────────────────────
// Conversation coaching bottom sheet — read-only, never touches the input field.

interface AiCoachSheetProps {
  visible: boolean;
  data: CoachResult | null;
  onClose: () => void;
}

function AiCoachSheet({ visible, data, onClose }: AiCoachSheetProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [selectedDir, setSelectedDir] = useState(0);

  if (!data) return null;

  const dirColors = ["#D85870", "#6C63FF", "#2BB56E"];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable style={coach.backdrop} onPress={onClose} />
      <View style={[coach.sheet, { backgroundColor: colors.surface, paddingBottom: insets.bottom + 20 }]}>
        {/* Handle */}
        <View style={[coach.handle, { backgroundColor: colors.border }]} />

        {/* Header row */}
        <View style={coach.headerRow}>
          <View style={coach.headerLeft}>
            <Text style={[coach.headerIcon]}>⚡</Text>
            <Text style={[coach.headerTitle, { color: colors.charcoal }]}>Conversation Coach</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={coach.closeBtn} hitSlop={12}>
            <Feather name="x" size={20} color={colors.charcoalLight} />
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={coach.scroll}>

          {/* ── Summary ─────────────────────────────────────────────────────── */}
          <Text style={[coach.sectionLabel, { color: colors.charcoalLight }]}>📌 What they said</Text>
          <View style={[coach.summaryCard, { backgroundColor: colors.muted }]}>
            <Text style={[coach.summaryText, { color: colors.charcoal }]}>{data.summary}</Text>
          </View>

          {/* ── Tone directions ─────────────────────────────────────────────── */}
          <Text style={[coach.sectionLabel, { color: colors.charcoalLight }]}>💡 Tone directions</Text>
          <View style={coach.pillRow}>
            {data.directions.map((dir, i) => (
              <Pressable
                key={dir}
                onPress={() => setSelectedDir(i)}
                style={[
                  coach.pill,
                  {
                    backgroundColor: selectedDir === i ? dirColors[i % dirColors.length] : colors.muted,
                    borderColor: selectedDir === i ? "transparent" : colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    coach.pillText,
                    { color: selectedDir === i ? "#fff" : colors.charcoalLight },
                  ]}
                >
                  {dir}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* ── Example replies ─────────────────────────────────────────────── */}
          <View style={coach.exampleHeader}>
            <Text style={[coach.sectionLabel, { color: colors.charcoalLight, marginBottom: 0 }]}>
              ✍️ Example replies
            </Text>
            <View style={[coach.refBadge, { backgroundColor: colors.muted }]}>
              <Text style={[coach.refBadgeText, { color: colors.charcoalLight }]}>reference only</Text>
            </View>
          </View>
          {data.examples.map((ex, i) => (
            <View
              key={i}
              style={[
                coach.exampleCard,
                {
                  backgroundColor: colors.background,
                  borderColor: colors.border,
                  borderLeftColor: dirColors[i % dirColors.length],
                },
              ]}
            >
              <Text style={[coach.exampleText, { color: colors.charcoal }]}>{ex}</Text>
              <Text style={[coach.exampleHint, { color: colors.charcoalFaint }]}>
                {data.directions[i] ?? ""}
              </Text>
            </View>
          ))}

          {/* ── Coaching tips ───────────────────────────────────────────────── */}
          <Text style={[coach.sectionLabel, { color: colors.charcoalLight }]}>🌟 Coaching tips</Text>
          <View style={[coach.tipsCard, { backgroundColor: colors.muted }]}>
            {data.tips.map((tip, i) => (
              <View key={i} style={coach.tipRow}>
                <Text style={[coach.tipBullet, { color: "#D85870" }]}>•</Text>
                <Text style={[coach.tipText, { color: colors.charcoal }]}>{tip}</Text>
              </View>
            ))}
          </View>

          <Text style={[coach.footerNote, { color: colors.charcoalFaint }]}>
            Read the suggestions, decide what feels right, then write in your own words.
          </Text>
        </ScrollView>
      </View>
    </Modal>
  );
}

const coach = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  sheet: {
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingHorizontal: 20,
    paddingTop: 14,
    maxHeight: "82%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.14,
    shadowRadius: 24,
    elevation: 24,
  },
  handle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  headerIcon: {
    fontSize: 20,
  },
  headerTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 18,
  },
  closeBtn: {
    padding: 4,
  },
  scroll: {
    paddingBottom: 8,
  },
  sectionLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    letterSpacing: 0.2,
    marginBottom: 10,
    marginTop: 4,
  },
  summaryCard: {
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 20,
  },
  summaryText: {
    fontFamily: "Inter_400Regular",
    fontSize: 14.5,
    lineHeight: 22,
  },
  pillRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 20,
  },
  pill: {
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  pillText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
  },
  exampleHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
    marginTop: 4,
  },
  refBadge: {
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  refBadgeText: {
    fontFamily: "Inter_400Regular",
    fontSize: 10,
    letterSpacing: 0.2,
  },
  exampleCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderLeftWidth: 3,
    paddingHorizontal: 14,
    paddingVertical: 13,
    marginBottom: 10,
    gap: 4,
  },
  exampleText: {
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    lineHeight: 23,
  },
  exampleHint: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    letterSpacing: 0.2,
  },
  tipsCard: {
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 20,
    gap: 10,
  },
  tipRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "flex-start",
  },
  tipBullet: {
    fontFamily: "Inter_700Bold",
    fontSize: 14,
    lineHeight: 21,
  },
  tipText: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    lineHeight: 21,
    flex: 1,
  },
  footerNote: {
    fontFamily: "Inter_400Regular",
    fontSize: 11.5,
    textAlign: "center",
    lineHeight: 17,
    marginBottom: 4,
  },
});

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
  const {
    subscription,
    getAiCoachCreditsRemaining,
    consumeAiCoachCredit,
    buyAiCoachCredits,
    upgradePlan,
  } = useGrowth();

  const [showCreditsModal, setShowCreditsModal] = useState(false);
  const [showCoachSheet, setShowCoachSheet] = useState(false);
  const [coachData, setCoachData] = useState<CoachResult | null>(null);

  const [inputText, setInputText] = useState("");
  const sendBtnScale = useRef(new Animated.Value(1)).current;

  const handleSendPressIn = () => {
    Animated.spring(sendBtnScale, { toValue: 0.88, useNativeDriver: true, speed: 30, bounciness: 0 }).start();
  };
  const handleSendPressOut = () => {
    Animated.spring(sendBtnScale, { toValue: 1, useNativeDriver: true, speed: 18, bounciness: 5 }).start();
  };

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

  // Viewer's primary language — derived from profile.country
  const viewerLang: "ko" | "ja" = profile.country === "KR" ? "ko" : "ja";
  const translationEnabled = !!conversation.translationEnabled;

  // ── Per-message translate function ───────────────────────────────────────
  // Called when a user taps the translate button on an individual message.
  // Works regardless of the global toggle state.
  //
  // Direction rule (message-based, never viewer-based):
  //   Korean message  → always translate TO Japanese
  //   Japanese message → always translate TO Korean
  const handleTranslateMessage = useCallback(async (msg: Message) => {
    const sourceLang = msg.originalLanguage as "ko" | "ja";
    const targetLang: "ko" | "ja" = sourceLang === "ko" ? "ja" : "ko";

    console.log("[Lito Translation] per-message request", {
      msgId: msg.id,
      text: msg.originalText.slice(0, 60),
      sourceLang,
      targetLang,
    });

    const cacheKey = `${msg.id}:${targetLang}`;

    // 1. Module cache hit — no fetch needed
    const cached = translationCache.get(cacheKey);
    if (cached) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setEnrichmentMap((prev) => ({
        ...prev,
        [msg.id]: { translatedText: cached.translation },
      }));
      return;
    }

    // 2. Already in flight — ignore duplicate tap
    if (inflight.current.has(cacheKey)) return;
    inflight.current.add(cacheKey);

    // 3. Set loading state for this specific message
    setEnrichmentMap((prev) => ({
      ...prev,
      [msg.id]: { isLoading: true },
    }));

    try {
      const res = await fetch(`${API_BASE}/api/ai/translate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: msg.originalText,
          sourceLang: msg.originalLanguage,
          viewerLang: targetLang,
        }),
      });
      if (!res.ok) throw new Error(`API ${res.status}`);
      const data = (await res.json()) as TranslationResult;
      translationCache.set(cacheKey, data);
      // Haptic reward — translation revealed
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setEnrichmentMap((prev) => ({
        ...prev,
        [msg.id]: { translatedText: data.translation },
      }));
    } catch {
      // Show retry state — original text stays visible
      setEnrichmentMap((prev) => ({
        ...prev,
        [msg.id]: { failed: true },
      }));
    } finally {
      inflight.current.delete(cacheKey);
    }
  }, []); // no viewer-language dependency — direction is purely message-based

  // ── Batch enrichment effect ───────────────────────────────────────────────
  // When the global translation toggle is ON, automatically pre-fetch translations
  // for all received messages using the three-tier cache:
  //   1. Module cache → 2. Pre-set msg.translatedText → 3. API fetch
  //
  // Direction rule (message-based, never viewer-based):
  //   Korean message  → always translate TO Japanese
  //   Japanese message → always translate TO Korean
  useEffect(() => {
    if (!translationEnabled) return;

    convMessages.forEach((msg) => {
      if (msg.senderId === CURRENT_USER_ID) return;
      // No same-language skip guard — direction is always opposite of source language.

      const sourceLang = msg.originalLanguage as "ko" | "ja";
      const targetLang: "ko" | "ja" = sourceLang === "ko" ? "ja" : "ko";
      const cacheKey = `${msg.id}:${targetLang}`;

      // Already enriched in local state
      if (enrichmentMap[msg.id]?.translatedText) return;

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

      console.log("[Lito Translation] batch request", {
        msgId: msg.id,
        text: msg.originalText.slice(0, 60),
        sourceLang,
        targetLang,
      });

      fetch(`${API_BASE}/api/ai/translate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: msg.originalText, sourceLang, viewerLang: targetLang }),
      })
        .then((r) => r.json())
        .then((data: TranslationResult) => {
          translationCache.set(cacheKey, data);
          setEnrichmentMap((prev) => ({
            ...prev,
            [msg.id]: { translatedText: data.translation },
          }));
        })
        .catch(() => {}) // silent; bubble shows translate button for manual retry
        .finally(() => { inflight.current.delete(cacheKey); });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [convMessages, translationEnabled]); // viewerLang intentionally omitted — direction is message-based

  // ── renderItem ───────────────────────────────────────────────────────────
  // Each bubble receives its own enrichment slice and a stable per-message callback.
  // FlatList re-renders items when enrichmentMap changes (via extraData).
  const renderMessage = useCallback(
    ({ item }: { item: Message }) => {
      if (item.senderId === CURRENT_USER_ID) {
        return (
          <MessageBubble
            msg={item}
            enrichment={undefined}
            viewerLang={viewerLang}
            onTranslate={() => {}}
          />
        );
      }
      return (
        <MessageBubble
          msg={item}
          enrichment={enrichmentMap[item.id]}
          viewerLang={viewerLang}
          onTranslate={() => handleTranslateMessage(item)}
        />
      );
    },
    [enrichmentMap, viewerLang, handleTranslateMessage]
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
    // Credit check — deduct before API call
    const credited = consumeAiCoachCredit();
    if (!credited) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setShowCreditsModal(true);
      return;
    }
    setAiSuggesting(true);
    try {
      const recentMessages = convMessages.slice(-10).map((m) => ({
        sender: m.senderId === CURRENT_USER_ID ? "me" : "them",
        text: m.originalText,
      }));
      const targetLang = conversation.user.country === "JP" ? "ja" : "ko";
      const response = await fetch(`${API_BASE}/api/ai/coach`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: recentMessages, targetLang }),
      });
      if (!response.ok) throw new Error(`API ${response.status}`);
      const data = (await response.json()) as CoachResult;
      // Never touch the input field — open coaching sheet instead
      setCoachData(data);
      setShowCoachSheet(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      Alert.alert("AI Coach", "Could not load coaching. Please try again.");
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

        {/* Translation toggle pill — batch mode */}
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

      {/* ── AI Coach credits modal ──────────────────────────────────────── */}
      <AiCoachCreditsModal
        visible={showCreditsModal}
        planId={subscription.planId}
        onClose={() => setShowCreditsModal(false)}
        onBuyPack={(count) => {
          buyAiCoachCredits(count);
          setShowCreditsModal(false);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }}
        onUpgrade={() => {
          setShowCreditsModal(false);
          router.push("/paywall" as any);
        }}
      />

      {/* ── AI Conversation Coach sheet ──────────────────────────────────── */}
      <AiCoachSheet
        visible={showCoachSheet}
        data={coachData}
        onClose={() => setShowCoachSheet(false)}
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
          {/* AI suggest button — with live credit display */}
          {(() => {
            const remaining = getAiCoachCreditsRemaining();
            const isUnlimited = remaining === Infinity;
            const isEmpty = !isUnlimited && remaining <= 0;
            return (
              <TouchableOpacity
                style={[
                  styles.aiBtn,
                  {
                    backgroundColor: isEmpty
                      ? colors.muted
                      : aiSuggesting
                      ? colors.roseSoft
                      : colors.roseLight,
                    borderColor: isEmpty ? colors.border : colors.roseSoft,
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
                    <Feather
                      name={isEmpty ? "lock" : "zap"}
                      size={13}
                      color={isEmpty ? colors.charcoalLight : colors.rose}
                    />
                    <Text
                      style={[
                        styles.aiBtnLabel,
                        { color: isEmpty ? colors.charcoalLight : colors.rose },
                      ]}
                    >
                      AI
                    </Text>
                    {!isUnlimited && (
                      <View
                        style={[
                          styles.aiBtnBadge,
                          { backgroundColor: isEmpty ? colors.border : "#D85870" },
                        ]}
                      >
                        <Text style={[styles.aiBtnBadgeText, { color: "#fff" }]}>
                          {remaining}
                        </Text>
                      </View>
                    )}
                  </>
                )}
              </TouchableOpacity>
            );
          })()}

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

          {/* Send button — scale spring + haptic on press */}
          <Animated.View style={{ transform: [{ scale: sendBtnScale }] }}>
            <Pressable
              style={[
                styles.sendBtn,
                {
                  backgroundColor: inputText.trim() ? colors.rose : colors.muted,
                  borderColor: inputText.trim() ? colors.rose : colors.border,
                },
              ]}
              onPress={handleSend}
              onPressIn={handleSendPressIn}
              onPressOut={handleSendPressOut}
              disabled={!inputText.trim()}
            >
              <Feather
                name="send"
                size={16}
                color={inputText.trim() ? colors.white : colors.charcoalFaint}
              />
            </Pressable>
          </Animated.View>
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
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  unlockIconWrap: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  unlockText: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
  },

  // ── Message list ──────────────────────────────────────────────────────────
  messageList: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },

  // ── Input area ────────────────────────────────────────────────────────────
  inputArea: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 12,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  aiBtn: {
    minWidth: 44,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 3,
    borderWidth: 1,
    marginBottom: 4,
    paddingHorizontal: 10,
  },
  aiBtnLabel: {
    fontFamily: "Inter_700Bold",
    fontSize: 10,
    letterSpacing: 0.3,
  },
  aiBtnBadge: {
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
    marginLeft: 1,
  },
  aiBtnBadgeText: {
    fontFamily: "Inter_700Bold",
    fontSize: 9,
    letterSpacing: 0.2,
  },
  input: {
    flex: 1,
    borderRadius: 22,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === "ios" ? 11 : 8,
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    maxHeight: 120,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    marginBottom: 4,
  },
});
