/**
 * auth/callback.tsx
 * 소셜 로그인 딥링크 콜백 화면
 * lito://auth/callback?token=JWT  또는  ?error=...
 */
import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect } from "react";
import { ActivityIndicator, Text, View, StyleSheet } from "react-native";

export default function AuthCallbackScreen() {
  const { token: tokenParam, error } = useLocalSearchParams<{ token?: string; error?: string }>();
  const { login } = useApp();
  const colors = useColors();

  useEffect(() => {
    if (error) {
      router.replace({ pathname: "/login", params: { socialError: decodeURIComponent(error) } });
      return;
    }
    if (tokenParam) {
      login(tokenParam);
      return;
    }
    router.replace("/login");
  }, [tokenParam, error]);

  return (
    <View style={[s.container, { backgroundColor: colors.background }]}>
      <ActivityIndicator size="large" color={colors.rose} />
      <Text style={[s.text, { color: colors.charcoalMid }]}>로그인 처리 중...</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16 },
  text: { fontFamily: "Inter_400Regular", fontSize: 14 },
});
