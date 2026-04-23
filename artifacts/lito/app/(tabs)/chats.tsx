import FIcon from "@/components/FIcon";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Animated,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CountryFlag } from "@/components/CountryFlag";
import { FadeScreen } from "@/components/FadeScreen";
import { ProfileImage } from "@/components/ProfileImage";
import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import { useLocale } from "@/hooks/useLocale";
import { Conversation } from "@/types";

type TabKey = "all" | "unread" | "requests";

function formatTime(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  const now = new Date();
  const diffH = (now.getTime() - d.getTime()) / 3600000;
  if (diffH < 24) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (diffH < 24 * 7) return d.toLocaleDateString([], { weekday: "short" });
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

function ConversationRow({ conversation }: { conversation: Conversation }) {
  const colors = useColors();
  const { lang } = useLocale();

  const hasLockRequest = conversation.unlockRequestState === "received";
  const hasUnread = conversation.unreadCount > 0;

  return (
    <TouchableOpacity
      style={[styles.row, { borderBottomColor: colors.border }]}
      onPress={() => router.push(`/chat/${conversation.id}` as any)}
      accessibilityRole="button"
      accessibilityLabel={lang === "ko" ? `${conversation.user.nickname}와 채팅` : `${conversation.user.nickname}とチャット`}
    >
      {/* ── Avatar ── */}
      <View style={styles.avatarWrap}>
        <ProfileImage photoKey={conversation.user.photos[0]} size={52} />
        {conversation.user.isOnline && (
          <View style={[styles.onlineDot, { backgroundColor: colors.green, borderColor: colors.white }]} />
        )}
        {hasLockRequest && !hasUnread && (
          <View style={[styles.lockBadge, { backgroundColor: "#F5D98A", borderColor: colors.white }]}>
            <FIcon name="lock" size={9} color="#7A5200" />
          </View>
        )}
        {hasUnread && (
          <View style={[styles.unreadBadgeAvatar, { backgroundColor: colors.rose, borderColor: colors.white }]}>
            <Text style={styles.unreadBadgeAvatarText}>
              {conversation.unreadCount > 9 ? "9+" : conversation.unreadCount}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.body}>
        {/* ── Top row: name + time ── */}
        <View style={styles.topRow}>
          <View style={styles.nameRow}>
            <Text
              style={[
                styles.name,
                {
                  color: colors.charcoal,
                  fontFamily: hasUnread ? "Inter_700Bold" : "Inter_500Medium",
                },
              ]}
            >
              {conversation.user.nickname}
            </Text>
            <CountryFlag country={conversation.user.country} size={13} />
          </View>
          <Text style={[styles.time, { color: hasUnread ? colors.rose : colors.charcoalFaint }]}>
            {formatTime(conversation.lastMessage?.createdAt)}
          </Text>
        </View>

        {/* ── Preview line ── */}
        {hasLockRequest ? (
          <View style={[styles.lockChip, { backgroundColor: "#FFF8EC", borderColor: "#F5D98A" }]}>
            <FIcon name="instagram" size={11} color="#8A5D00" />
            <Text style={[styles.lockChipText, { color: "#8A5D00" }]}>
              {lang === "ko" ? "인스타 공개 요청" : "インスタ公開リクエスト"}
            </Text>
          </View>
        ) : (
          <Text
            style={[
              styles.lastMsg,
              {
                color: hasUnread ? colors.charcoalMid : colors.charcoalLight,
                fontFamily: hasUnread ? "Inter_500Medium" : "Inter_400Regular",
              },
            ]}
            numberOfLines={1}
          >
            {conversation.lastMessage
              ? conversation.lastMessage.originalText
              : lang === "ko" ? "대화를 시작해보세요!" : "メッセージを送りましょう！"}
          </Text>
        )}

        {/* ── Tags row ── */}
        {conversation.translationEnabled && (
          <View style={[styles.translationTag, { backgroundColor: colors.roseLight }]}>
            <FIcon name="globe" size={9} color={colors.rose} />
            <Text style={[styles.translationLabel, { color: colors.rose }]}>
              {lang === "ko" ? "번역" : "翻訳"}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

export default function ChatsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { conversations } = useApp();
  const { lang } = useLocale();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const [activeTab, setActiveTab] = useState<TabKey>("all");

  const tabs: { key: TabKey; label: string }[] = [
    { key: "all",      label: lang === "ko" ? "전체"   : "すべて" },
    { key: "unread",   label: lang === "ko" ? "안 읽음" : "未読"   },
    { key: "requests", label: lang === "ko" ? "요청"   : "リクエスト" },
  ];

  const filtered = conversations.filter((c) => {
    if (activeTab === "unread")   return c.unreadCount > 0;
    if (activeTab === "requests") return c.unlockRequestState === "received";
    return true;
  });

  const unreadCount   = conversations.filter((c) => c.unreadCount > 0).length;
  const requestCount  = conversations.filter((c) => c.unlockRequestState === "received").length;

  const badgeFor = (key: TabKey) => {
    if (key === "unread")   return unreadCount;
    if (key === "requests") return requestCount;
    return 0;
  };

  return (
    <FadeScreen style={[styles.container, { backgroundColor: colors.background }]}>
      {/* ── Header ── */}
      <View style={[styles.header, { paddingTop: topPad + 16 }]}>
        <Text style={[styles.title, { color: colors.charcoal }]}>
          {lang === "ko" ? "채팅" : "チャット"}
        </Text>

        {/* ── Filter Tabs ── */}
        <View style={[styles.tabRow, { borderBottomColor: colors.border }]}>
          {tabs.map((tab) => {
            const active = activeTab === tab.key;
            const badge  = badgeFor(tab.key);
            return (
              <TouchableOpacity
                key={tab.key}
                style={styles.tab}
                onPress={() => setActiveTab(tab.key)}
                activeOpacity={0.7}
              >
                <View style={styles.tabInner}>
                  <Text
                    style={[
                      styles.tabLabel,
                      {
                        color: active ? colors.rose : colors.charcoalLight,
                        fontFamily: active ? "Inter_600SemiBold" : "Inter_400Regular",
                      },
                    ]}
                  >
                    {tab.label}
                  </Text>
                  {badge > 0 && (
                    <View style={[styles.tabBadge, { backgroundColor: active ? colors.rose : colors.charcoalFaint }]}>
                      <Text style={styles.tabBadgeText}>{badge > 9 ? "9+" : badge}</Text>
                    </View>
                  )}
                </View>
                {active && (
                  <View style={[styles.tabUnderline, { backgroundColor: colors.rose }]} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: bottomPad + 100 }}
        showsVerticalScrollIndicator={false}
      >
        {filtered.length === 0 ? (
          <View style={styles.empty}>
            <View style={[styles.emptyIcon, { backgroundColor: colors.roseLight }]}>
              <FIcon
                name={activeTab === "requests" ? "lock" : activeTab === "unread" ? "bell" : "message-circle"}
                size={32}
                color={colors.rose}
              />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.charcoal }]}>
              {activeTab === "unread"
                ? lang === "ko" ? "안 읽은 대화가 없어요" : "未読メッセージはありません"
                : activeTab === "requests"
                ? lang === "ko" ? "받은 요청이 없어요" : "リクエストはありません"
                : lang === "ko" ? "아직 대화가 없어요" : "まだ会話がありません"}
            </Text>
            <Text style={[styles.emptySub, { color: colors.charcoalLight }]}>
              {activeTab === "all"
                ? lang === "ko" ? "매칭하고 대화를 시작해보세요" : "マッチングして会話を始めましょう"
                : ""}
            </Text>
            {activeTab === "all" && (
              <TouchableOpacity
                style={[styles.emptyCta, { backgroundColor: colors.rose }]}
                onPress={() => router.push("/(tabs)/matches" as any)}
                activeOpacity={0.85}
                accessibilityRole="button"
              >
                <FIcon name="heart" size={14} color="#fff" />
                <Text style={styles.emptyCtaText}>
                  {lang === "ko" ? "매칭 보러 가기" : "マッチングを見る"}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          filtered.map((conv) => (
            <ConversationRow key={conv.id} conversation={conv} />
          ))
        )}
      </ScrollView>
    </FadeScreen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 24,
    paddingBottom: 0,
  },
  title: {
    fontFamily: "Inter_700Bold",
    fontSize: 30,
    marginBottom: 14,
  },

  /* ── Tabs ── */
  tabRow: {
    flexDirection: "row",
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginHorizontal: -24,
    paddingHorizontal: 16,
  },
  tab: {
    marginRight: 4,
    paddingHorizontal: 8,
    alignItems: "center",
  },
  tabInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingVertical: 10,
  },
  tabLabel: {
    fontSize: 14,
  },
  tabBadge: {
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  tabBadgeText: {
    fontFamily: "Inter_700Bold",
    fontSize: 10,
    color: "#fff",
  },
  tabUnderline: {
    height: 2,
    borderRadius: 1,
    width: "100%",
    marginTop: -1,
  },

  /* ── Row ── */
  row: {
    flexDirection: "row",
    paddingHorizontal: 24,
    paddingVertical: 13,
    borderBottomWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
  },
  avatarWrap: { position: "relative", marginRight: 13 },
  onlineDot: {
    position: "absolute",
    bottom: 1,
    right: 1,
    width: 11,
    height: 11,
    borderRadius: 6,
    borderWidth: 2,
  },
  lockBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 19,
    height: 19,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  unreadBadgeAvatar: {
    position: "absolute",
    top: -2,
    right: -2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  unreadBadgeAvatarText: {
    fontFamily: "Inter_700Bold",
    fontSize: 9.5,
    color: "#fff",
  },
  body: { flex: 1, gap: 3 },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  name: {
    fontSize: 15.5,
  },
  time: {
    fontFamily: "Inter_400Regular",
    fontSize: 11.5,
  },
  lastMsg: {
    fontSize: 13.5,
  },
  lockChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  lockChipText: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
  },
  translationTag: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 5,
    gap: 3,
    marginTop: 1,
  },
  translationLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 9.5,
  },

  /* ── Empty ── */
  empty: {
    alignItems: "center",
    paddingTop: 80,
    paddingHorizontal: 40,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },
  emptyTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 20,
    marginBottom: 7,
    textAlign: "center",
  },
  emptySub: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    textAlign: "center",
    marginBottom: 22,
  },
  emptyCta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 30,
  },
  emptyCtaText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: "#fff",
  },
});
