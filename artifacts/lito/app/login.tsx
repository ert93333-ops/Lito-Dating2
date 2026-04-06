import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

export default function LoginScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { login } = useApp();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(false);

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

  const emailReady = email.trim().length > 0;

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.white }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* Back button */}
      <TouchableOpacity
        style={[styles.backBtn, { top: topPad + 12 }]}
        onPress={() => router.replace("/onboarding")}
      >
        <Feather name="chevron-left" size={22} color={colors.charcoalMid} />
      </TouchableOpacity>

      <View style={[styles.inner, { paddingTop: topPad + 60, paddingBottom: bottomPad + 32 }]}>

        {/* Logo section */}
        <View style={styles.logoSection}>
          <View style={[styles.logoMark, { backgroundColor: colors.roseLight }]}>
            <Text style={[styles.logoLetter, { color: colors.rose }]}>L</Text>
          </View>
          <Text style={[styles.appName, { color: colors.charcoal }]}>lito</Text>
          <Text style={[styles.tagline, { color: colors.charcoalLight }]}>
            한국과 일본을 잇는 인연
          </Text>
          <Text style={[styles.taglineJa, { color: colors.charcoalLight }]}>
            韓日をつなぐ縁
          </Text>
        </View>

        {/* Form section */}
        <View style={styles.formSection}>

          {/* Email input */}
          <View
            style={[
              styles.inputWrap,
              {
                backgroundColor: focused ? colors.white : colors.muted,
                borderColor: focused ? colors.rose : colors.border,
              },
            ]}
          >
            <Feather
              name="mail"
              size={17}
              color={focused ? colors.rose : colors.charcoalLight}
            />
            <TextInput
              style={[styles.input, { color: colors.charcoal }]}
              placeholder="Enter your email"
              placeholderTextColor={colors.charcoalLight}
              value={email}
              onChangeText={setEmail}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {/* Email CTA button */}
          <Pressable
            style={({ pressed }) => [
              styles.primaryBtn,
              {
                backgroundColor: emailReady ? colors.rose : colors.roseSoft,
                opacity: pressed ? 0.88 : 1,
              },
            ]}
            onPress={handleEmailLogin}
            disabled={loading}
          >
            {loading ? (
              <Text style={[styles.primaryBtnText, { color: colors.white }]}>Signing in...</Text>
            ) : (
              <>
                <Text
                  style={[
                    styles.primaryBtnText,
                    { color: emailReady ? colors.white : colors.rose },
                  ]}
                >
                  Continue with Email
                </Text>
                <Feather
                  name="arrow-right"
                  size={17}
                  color={emailReady ? colors.white : colors.rose}
                />
              </>
            )}
          </Pressable>

          {/* Divider */}
          <View style={styles.dividerRow}>
            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
            <Text style={[styles.dividerText, { color: colors.charcoalLight }]}>
              or continue with
            </Text>
            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
          </View>

          {/* Social buttons */}
          <View style={styles.socialRow}>
            {/* Kakao */}
            <Pressable
              style={({ pressed }) => [
                styles.socialBtn,
                {
                  backgroundColor: "#FEF08A",
                  borderColor: "#FDE047",
                  opacity: pressed ? 0.88 : 1,
                  flex: 1,
                },
              ]}
              onPress={() => handleSocialLogin("kakao")}
            >
              <Text style={styles.socialBtnIcon}>💬</Text>
              <Text style={[styles.socialBtnLabel, { color: "#78350F" }]}>Kakao</Text>
            </Pressable>

            {/* LINE */}
            <Pressable
              style={({ pressed }) => [
                styles.socialBtn,
                {
                  backgroundColor: "#F0FDF4",
                  borderColor: "#BBF7D0",
                  opacity: pressed ? 0.88 : 1,
                  flex: 1,
                },
              ]}
              onPress={() => handleSocialLogin("line")}
            >
              <Text style={styles.socialBtnIcon}>💚</Text>
              <Text style={[styles.socialBtnLabel, { color: "#166534" }]}>LINE</Text>
            </Pressable>
          </View>
        </View>

        {/* Terms */}
        <Text style={[styles.terms, { color: colors.charcoalLight }]}>
          By continuing, you agree to our{" "}
          <Text style={[styles.termsLink, { color: colors.rose }]}>Terms</Text>
          {" & "}
          <Text style={[styles.termsLink, { color: colors.rose }]}>Privacy Policy</Text>
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  backBtn: {
    position: "absolute",
    left: 20,
    zIndex: 10,
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },

  inner: {
    flex: 1,
    paddingHorizontal: 28,
    justifyContent: "space-between",
  },

  logoSection: {
    alignItems: "center",
    paddingBottom: 8,
  },
  logoMark: {
    width: 80,
    height: 80,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  logoLetter: {
    fontFamily: "Inter_700Bold",
    fontSize: 42,
    lineHeight: 48,
  },
  appName: {
    fontFamily: "Inter_700Bold",
    fontSize: 44,
    letterSpacing: -2,
    marginBottom: 12,
  },
  tagline: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    opacity: 0.7,
    marginBottom: 2,
  },
  taglineJa: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    opacity: 0.5,
  },

  formSection: {
    gap: 0,
  },

  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    borderWidth: 1.5,
    paddingHorizontal: 18,
    paddingVertical: 16,
    gap: 12,
    marginBottom: 12,
  },
  input: {
    flex: 1,
    fontFamily: "Inter_400Regular",
    fontSize: 16,
    height: 22,
  },

  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 100,
    paddingVertical: 18,
    gap: 8,
    marginBottom: 4,
  },
  primaryBtnText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
    letterSpacing: 0.1,
  },

  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 28,
    gap: 14,
  },
  dividerLine: { flex: 1, height: StyleSheet.hairlineWidth * 2 },
  dividerText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    opacity: 0.7,
  },

  socialRow: {
    flexDirection: "row",
    gap: 12,
  },
  socialBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 100,
    paddingVertical: 16,
    borderWidth: 1.5,
    gap: 8,
  },
  socialBtnIcon: {
    fontSize: 18,
  },
  socialBtnLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
  },

  terms: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    textAlign: "center",
    lineHeight: 20,
    opacity: 0.8,
  },
  termsLink: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
  },
});
