import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button } from "@/components/Button";
import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

export default function LoginScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { login } = useApp();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const handleEmailLogin = async () => {
    if (!email.trim()) return;
    setLoading(true);
    // TODO: Integrate with Supabase Auth
    await new Promise((r) => setTimeout(r, 800));
    login();
    router.replace("/(tabs)/discover");
    setLoading(false);
  };

  const handleSocialLogin = (provider: "kakao" | "line") => {
    // TODO: Integrate with Kakao / LINE OAuth
    login();
    router.replace("/(tabs)/discover");
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.white }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={[styles.inner, { paddingTop: topPad + 40, paddingBottom: bottomPad + 24 }]}>
        <View style={styles.top}>
          <View style={[styles.logoMark, { backgroundColor: colors.roseLight }]}>
            <Text style={[styles.logoLetter, { color: colors.rose }]}>L</Text>
          </View>
          <Text style={[styles.appName, { color: colors.charcoal }]}>lito</Text>
          <Text style={[styles.tagline, { color: colors.charcoalLight }]}>
            한국과 일본을 잇는 인연 · 韓日をつなぐ縁
          </Text>
        </View>

        <View style={styles.form}>
          <View style={[styles.inputWrap, { borderColor: colors.border, backgroundColor: colors.muted }]}>
            <Feather name="mail" size={18} color={colors.charcoalLight} />
            <TextInput
              style={[styles.input, { color: colors.charcoal }]}
              placeholder="Email address"
              placeholderTextColor={colors.charcoalLight}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>
          <Button
            label="Continue with Email"
            onPress={handleEmailLogin}
            loading={loading}
            style={{ marginTop: 12 }}
          />

          <View style={styles.dividerRow}>
            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
            <Text style={[styles.dividerText, { color: colors.charcoalLight }]}>or</Text>
            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
          </View>

          <TouchableOpacity
            style={[styles.socialBtn, { backgroundColor: "#FAE100", borderColor: "#F0D500" }]}
            onPress={() => handleSocialLogin("kakao")}
          >
            <Text style={[styles.socialIcon]}>💬</Text>
            <Text style={[styles.socialLabel, { color: "#3A1D00" }]}>Continue with Kakao</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.socialBtn, { backgroundColor: "#06C755", borderColor: "#00B548", marginTop: 12 }]}
            onPress={() => handleSocialLogin("line")}
          >
            <Text style={[styles.socialIcon]}>💚</Text>
            <Text style={[styles.socialLabel, { color: colors.white }]}>Continue with LINE</Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.terms, { color: colors.charcoalLight }]}>
          By continuing, you agree to our Terms of Service and Privacy Policy.
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: {
    flex: 1,
    paddingHorizontal: 28,
    justifyContent: "space-between",
  },
  top: { alignItems: "center", marginBottom: 40 },
  logoMark: {
    width: 72,
    height: 72,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  logoLetter: {
    fontFamily: "Inter_700Bold",
    fontSize: 36,
  },
  appName: {
    fontFamily: "Inter_700Bold",
    fontSize: 36,
    letterSpacing: -1.5,
    marginBottom: 8,
  },
  tagline: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    textAlign: "center",
  },
  form: { gap: 0 },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1.5,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 10,
  },
  input: {
    flex: 1,
    fontFamily: "Inter_400Regular",
    fontSize: 15,
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 24,
    gap: 12,
  },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { fontFamily: "Inter_400Regular", fontSize: 13 },
  socialBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 100,
    paddingVertical: 15,
    borderWidth: 1,
    gap: 8,
  },
  socialIcon: { fontSize: 20 },
  socialLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
  },
  terms: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    textAlign: "center",
    lineHeight: 18,
  },
});
