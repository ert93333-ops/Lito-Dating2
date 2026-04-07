import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CountryFlag } from "@/components/CountryFlag";
import { ProfileImage } from "@/components/ProfileImage";
import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import { Conversation } from "@/types";

function formatTime(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  const now = new Date();
  const diffH = (now.getTime() - d.getTime()) / 3600000;
  if (diffH < 24) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

function ConversationRow({ conversation }: { conversation: Conversation }) {
  const colors = useColors();

  return (
    <TouchableOpacity
      style={[styles.row, { borderBottomColor: colors.border }]}
      onPress={() => router.push(`/chat/${conversation.id}` as any)}
    >
      <View style={styles.avatarWrap}>
        <ProfileImage photoKey={conversation.user.photos[0]} size={56} />
        {conversation.user.lastActive === "방금 전" && (
          <View style={[styles.onlineDot, { backgroundColor: colors.green, borderColor: colors.white }]} />
        )}
      </View>

      <View style={styles.body}>
        <View style={styles.topRow}>
          <View style={styles.nameRow}>
            <Text style={[styles.name, { color: colors.charcoal }]}>{conversation.user.nickname}</Text>
            <CountryFlag country={conversation.user.country} size={14} />
          </View>
          <Text style={[styles.time, { color: colors.charcoalLight }]}>
            {formatTime(conversation.lastMessage?.createdAt)}
          </Text>
        </View>

        <View style={styles.bottomRow}>
          <Text style={[styles.lastMsg, { color: colors.charcoalLight }]} numberOfLines={1}>
            {conversation.lastMessage
              ? conversation.lastMessage.originalText
              : "Say hi! 안녕하세요! こんにちは！"}
          </Text>
          {conversation.unreadCount > 0 && (
            <View style={[styles.badge, { backgroundColor: colors.rose }]}>
              <Text style={styles.badgeText}>{conversation.unreadCount}</Text>
            </View>
          )}
        </View>

        {conversation.translationEnabled && (
          <View style={[styles.translationTag, { backgroundColor: colors.roseLight }]}>
            <Feather name="globe" size={10} color={colors.rose} />
            <Text style={[styles.translationLabel, { color: colors.rose }]}>Translation on</Text>
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
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 16 }]}>
        <Text style={[styles.title, { color: colors.charcoal }]}>Chats</Text>
        <Text style={[styles.subtitle, { color: colors.charcoalLight }]}>
          채팅 · チャット
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: bottomPad + 100 }}
        showsVerticalScrollIndicator={false}
      >
        {conversations.length === 0 ? (
          <View style={styles.empty}>
            <View style={[styles.emptyIcon, { backgroundColor: colors.roseLight }]}>
              <Feather name="message-circle" size={36} color={colors.rose} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.charcoal }]}>No conversations yet</Text>
            <Text style={[styles.emptySub, { color: colors.charcoalLight }]}>
              Match with someone to start chatting!
            </Text>
          </View>
        ) : (
          conversations.map((conv) => (
            <ConversationRow key={conv.id} conversation={conv} />
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 24, paddingBottom: 16 },
  title: {
    fontFamily: "Inter_700Bold",
    fontSize: 30,
    marginBottom: 2,
  },
  subtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
  },
  row: {
    flexDirection: "row",
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderBottomWidth: 1,
    alignItems: "center",
  },
  avatarWrap: { position: "relative", marginRight: 14 },
  onlineDot: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
  },
  body: { flex: 1 },
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  name: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
  },
  time: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
  },
  bottomRow: { flexDirection: "row", alignItems: "center" },
  lastMsg: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    flex: 1,
  },
  badge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
  badgeText: {
    fontFamily: "Inter_700Bold",
    fontSize: 11,
    color: "#FFF",
  },
  translationTag: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 4,
    gap: 3,
  },
  translationLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 10,
  },
  empty: {
    alignItems: "center",
    paddingTop: 100,
    paddingHorizontal: 40,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  emptyTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 22,
    marginBottom: 8,
    textAlign: "center",
  },
  emptySub: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    textAlign: "center",
  },
});
