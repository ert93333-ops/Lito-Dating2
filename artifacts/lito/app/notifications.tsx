/**
 * app/notifications.tsx
 *
 * In-app notification inbox.
 *
 * Categories:
 *   messages    → 💬
 *   matches     → 💕
 *   safety      → 🛡️
 *   ai          → ✨
 *   promotions  → 📣
 *
 * Behaviour:
 *   - Loads inbox on mount, marks all as read on mount.
 *   - Shows unread dot until read.
 *   - Tapping a notification navigates if conversationId present.
 */

import React, { useCallback, useEffect, useState } from "react";
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { useColors } from "@/hooks/useColors";
import { useLocale } from "@/hooks/useLocale";
import { useApp } from "@/context/AppContext";
import FIcon from "@/components/FIcon";

const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? "";

interface InAppNotification {
  id: number;
  category: string;
  titleKo: string;
  titleJa: string;
  bodyKo: string;
  bodyJa: string;
  payload: Record<string, unknown>;
  isRead: boolean;
  createdAt: string;
}

const CATEGORY_EMOJI: Record<string, string> = {
  messages: "💬",
  matches: "💕",
  safety: "🛡️",
  ai: "✨",
  promotions: "📣",
};

function timeAgo(dateStr: string, lang: "ko" | "ja"): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return lang === "ko" ? "방금" : "たった今";
  if (diff < 3600) {
    const m = Math.floor(diff / 60);
    return lang === "ko" ? `${m}분 전` : `${m}分前`;
  }
  if (diff < 86400) {
    const h = Math.floor(diff / 3600);
    return lang === "ko" ? `${h}시간 전` : `${h}時間前`;
  }
  const d = Math.floor(diff / 86400);
  return lang === "ko" ? `${d}일 전` : `${d}日前`;
}

export default function NotificationsScreen() {
  const colors = useColors();
  const { lang } = useLocale();
  const { token: jwt } = useApp();
  const router = useRouter();

  const [items, setItems] = useState<InAppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchInbox = useCallback(async () => {
    if (!jwt) return;
    try {
      const res = await fetch(`${API_BASE}/api/notifications/inbox?limit=50`, {
        headers: { Authorization: `Bearer ${jwt}` },
      });
      if (!res.ok) return;
      const data = await res.json() as { items: InAppNotification[] };
      setItems(data.items);
    } catch {
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [jwt]);

  const markAllRead = useCallback(async () => {
    if (!jwt) return;
    try {
      await fetch(`${API_BASE}/api/notifications/inbox/read-all`, {
        method: "POST",
        headers: { Authorization: `Bearer ${jwt}` },
      });
    } catch {}
  }, [jwt]);

  useEffect(() => {
    fetchInbox();
    markAllRead();
  }, [fetchInbox, markAllRead]);

  const handleTap = useCallback(
    (item: InAppNotification) => {
      const payload = item.payload as { conversationId?: string };
      if (payload.conversationId) {
        router.push(`/chat/${payload.conversationId}`);
      }
    },
    [router]
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchInbox();
  }, [fetchInbox]);

  const s = makeStyles(colors);

  if (loading) {
    return (
      <View style={s.centered}>
        <ActivityIndicator color={colors.rose} />
      </View>
    );
  }

  return (
    <View style={s.root}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <FIcon name="arrow-left" size={22} color={colors.charcoal} />
        </TouchableOpacity>
        <Text style={s.title}>{lang === "ko" ? "알림" : "通知"}</Text>
        <View style={{ width: 40 }} />
      </View>

      {items.length === 0 ? (
        <View style={s.empty}>
          <Text style={s.emptyEmoji}>🔔</Text>
          <Text style={s.emptyText}>
            {lang === "ko" ? "아직 알림이 없어요" : "まだ通知はありません"}
          </Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={s.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.rose}
            />
          }
          renderItem={({ item }) => {
            const emoji = CATEGORY_EMOJI[item.category] ?? "🔔";
            const title = lang === "ko" ? item.titleKo : item.titleJa;
            const body = lang === "ko" ? item.bodyKo : item.bodyJa;
            const hasTap = !!(item.payload as { conversationId?: string }).conversationId;

            return (
              <TouchableOpacity
                style={[s.card, !item.isRead && s.cardUnread]}
                onPress={() => handleTap(item)}
                activeOpacity={hasTap ? 0.7 : 1}
              >
                <View style={s.emojiWrap}>
                  <Text style={s.emoji}>{emoji}</Text>
                  {!item.isRead && <View style={s.dot} />}
                </View>
                <View style={s.content}>
                  <Text style={s.cardTitle} numberOfLines={2}>{title}</Text>
                  {body ? (
                    <Text style={s.cardBody} numberOfLines={2}>{body}</Text>
                  ) : null}
                  <Text style={s.cardTime}>{timeAgo(item.createdAt, lang)}</Text>
                </View>
                {hasTap && (
                  <FIcon name="chevron-right" size={16} color={colors.charcoalLight} />
                )}
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    centered: { flex: 1, justifyContent: "center", alignItems: "center" },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 20,
      paddingTop: 56,
      paddingBottom: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    backBtn: { width: 40, alignItems: "flex-start" },
    title: {
      fontSize: 18,
      fontFamily: "Inter_600SemiBold",
      color: colors.charcoal,
    },
    list: { padding: 16, gap: 8 },
    card: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      backgroundColor: colors.card,
      borderRadius: 14,
      padding: 14,
      borderWidth: 1,
      borderColor: colors.border,
    },
    cardUnread: {
      borderColor: colors.roseLight,
      backgroundColor: "#FFF5F6",
    },
    emojiWrap: { position: "relative" },
    emoji: { fontSize: 26 },
    dot: {
      position: "absolute",
      top: -2,
      right: -2,
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.rose,
    },
    content: { flex: 1, gap: 2 },
    cardTitle: {
      fontSize: 14,
      fontFamily: "Inter_600SemiBold",
      color: colors.charcoal,
      lineHeight: 20,
    },
    cardBody: {
      fontSize: 13,
      fontFamily: "Inter_400Regular",
      color: colors.charcoalMid,
      lineHeight: 18,
    },
    cardTime: {
      fontSize: 11,
      fontFamily: "Inter_400Regular",
      color: colors.charcoalLight,
      marginTop: 2,
    },
    empty: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12 },
    emptyEmoji: { fontSize: 48 },
    emptyText: {
      fontSize: 15,
      fontFamily: "Inter_400Regular",
      color: colors.charcoalMid,
    },
  });
}
