/**
 * app/blocked-users.tsx — 내가 차단한 사용자 목록
 */

import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import FIcon from "@/components/FIcon";
import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import { useLocale } from "@/hooks/useLocale";
import { API_BASE } from "@/utils/api";

interface BlockedUser {
  userId: number;
  nickname: string;
  photoUrl: string | null;
  blockedAt: string;
}

export default function BlockedUsersScreen() {
  const colors = useColors();
  const { lang } = useLocale();
  const { token } = useApp();
  const insets = useSafeAreaInsets();

  const [users, setUsers] = useState<BlockedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [unblocking, setUnblocking] = useState<number | null>(null);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;
  const ko = lang === "ko";

  const fetchBlocked = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/api/blocks`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json() as { blocks: BlockedUser[] };
        setUsers(data.blocks);
      }
    } catch {
      // 조회 실패 무시
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchBlocked();
  }, [fetchBlocked]);

  const handleUnblock = (user: BlockedUser) => {
    Alert.alert(
      ko ? "차단 해제" : "ブロック解除",
      ko
        ? `${user.nickname}님의 차단을 해제할까요?`
        : `${user.nickname}さんのブロックを解除しますか？`,
      [
        { text: ko ? "취소" : "キャンセル", style: "cancel" },
        {
          text: ko ? "해제" : "解除",
          style: "destructive",
          onPress: async () => {
            setUnblocking(user.userId);
            try {
              const res = await fetch(`${API_BASE}/api/blocks/${user.userId}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` },
              });
              if (res.ok) {
                setUsers((prev) => prev.filter((u) => u.userId !== user.userId));
              } else {
                Alert.alert(ko ? "오류" : "エラー", ko ? "차단 해제에 실패했습니다." : "ブロック解除に失敗しました。");
              }
            } catch {
              Alert.alert(ko ? "오류" : "エラー", ko ? "네트워크 오류가 발생했습니다." : "ネットワークエラーが発生しました。");
            } finally {
              setUnblocking(null);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={[s.container, { backgroundColor: colors.background }]}>
      <View style={[s.header, { paddingTop: topPad + 12, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <FIcon name="chevron-left" size={24} color={colors.charcoal} />
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: colors.charcoal }]}>
          {ko ? "차단 · 신고" : "ブロック・報告"}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      {loading ? (
        <View style={s.centered}>
          <ActivityIndicator color={colors.rose} />
        </View>
      ) : users.length === 0 ? (
        <View style={s.centered}>
          <FIcon name="shield" size={40} color={colors.border} />
          <Text style={[s.emptyText, { color: colors.charcoalLight }]}>
            {ko ? "차단한 사용자가 없습니다" : "ブロックしたユーザーはいません"}
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: bottomPad + 32 }}
          showsVerticalScrollIndicator={false}
        >
          <Text style={[s.hint, { color: colors.charcoalLight }]}>
            {ko
              ? "차단된 사용자는 나를 발견하거나 메시지를 보낼 수 없습니다."
              : "ブロックされたユーザーはあなたを見つけたり、メッセージを送ったりできません。"}
          </Text>

          <View style={[s.list, { borderColor: colors.border }]}>
            {users.map((user, i) => (
              <View
                key={user.userId}
                style={[
                  s.row,
                  { borderBottomColor: colors.border },
                  i === users.length - 1 && { borderBottomWidth: 0 },
                ]}
              >
                <View style={s.avatar}>
                  {user.photoUrl ? (
                    <Image source={{ uri: user.photoUrl }} style={s.avatarImg} />
                  ) : (
                    <View style={[s.avatarPlaceholder, { backgroundColor: colors.roseLight }]}>
                      <FIcon name="user" size={18} color={colors.rose} />
                    </View>
                  )}
                </View>
                <View style={s.info}>
                  <Text style={[s.nickname, { color: colors.charcoal }]}>{user.nickname}</Text>
                  <Text style={[s.blockedAt, { color: colors.charcoalLight }]}>
                    {ko ? "차단됨" : "ブロック中"}
                  </Text>
                </View>
                <TouchableOpacity
                  style={[s.unblockBtn, { borderColor: colors.border }]}
                  onPress={() => handleUnblock(user)}
                  disabled={unblocking === user.userId}
                  activeOpacity={0.7}
                >
                  {unblocking === user.userId ? (
                    <ActivityIndicator size="small" color={colors.charcoalLight} />
                  ) : (
                    <Text style={[s.unblockText, { color: colors.charcoalMid }]}>
                      {ko ? "해제" : "解除"}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 17,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  emptyText: {
    fontFamily: "Inter_400Regular",
    fontSize: 15,
  },
  hint: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 16,
  },
  list: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
    backgroundColor: "white",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  avatar: { width: 44, height: 44 },
  avatarImg: { width: 44, height: 44, borderRadius: 22 },
  avatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  info: { flex: 1, gap: 2 },
  nickname: {
    fontFamily: "Inter_500Medium",
    fontSize: 15,
  },
  blockedAt: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
  },
  unblockBtn: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    minWidth: 44,
    alignItems: "center",
  },
  unblockText: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
  },
});
