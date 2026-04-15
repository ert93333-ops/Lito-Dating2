import FIcon from "@/components/FIcon";
import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import { useLocale } from "@/hooks/useLocale";
import * as WebBrowser from "expo-web-browser";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const API_BASE = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}`
  : "http://localhost:3000";

type Mode = "login" | "register";

export default function LoginScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { login } = useApp();
  const { lang } = useLocale();
  const params = useLocalSearchParams<{ socialError?: string }>();

  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<string | null>(null);
  const [focusedField, setFocusedField] = useState<"email" | "password" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const emailReady = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const formReady = emailReady && password.length >= 6;

  useEffect(() => {
    if (params.socialError) {
      setError(decodeURIComponent(params.socialError));
    }
  }, [params.socialError]);

  // ── 서버사이드 OAuth (Google / Kakao / LINE) ───────────────────────────────
  const handleServerOAuth = async (provider: "google" | "kakao" | "line") => {
    setError(null);
    setSocialLoading(provider);
    const country = lang === "ko" ? "KR" : "JP";
    const startUrl = `${API_BASE}/api/auth/${provider}/start?country=${country}&language=${lang}`;
    try {
      const result = await WebBrowser.openAuthSessionAsync(startUrl, "lito://auth/callback");
      if (result.type === "cancel" || result.type === "dismiss") return;
      if (result.type === "success" && result.url) {
        const url = new URL(result.url);
        const token = url.searchParams.get("token");
        const errMsg = url.searchParams.get("error");
        if (token) {
          login(token);
        } else if (errMsg) {
          setError(decodeURIComponent(errMsg));
        }
      }
    } catch {
      setError(lang === "ko" ? "로그인 중 오류가 발생했습니다." : "ログイン中にエラーが発生しました。");
    } finally {
      setSocialLoading(null);
    }
  };

  // ── Apple 로그인 (iOS 네이티브 빌드 전용) ────────────────────────────────
  const handleAppleLogin = async () => {
    if (Platform.OS !== "ios") {
      Alert.alert(
        lang === "ko" ? "iOS 전용" : "iOS専用",
        lang === "ko" ? "Apple 로그인은 iPhone에서만 가능합니다." : "AppleログインはiPhoneでのみ利用できます。"
      );
      return;
    }
    setError(null);
    setSocialLoading("apple");
    try {
      const AppleAuth = await import("expo-apple-authentication").catch(() => null);
      if (!AppleAuth) {
        setError(lang === "ko" ? "Apple 로그인을 사용할 수 없습니다." : "Apple ログインを利用できません。");
        return;
      }
      const credential = await AppleAuth.signInAsync({
        requestedScopes: [
          AppleAuth.AppleAuthenticationScope.FULL_NAME,
          AppleAuth.AppleAuthenticationScope.EMAIL,
        ],
      });
      const fullName = [credential.fullName?.givenName, credential.fullName?.familyName]
        .filter(Boolean)
        .join(" ");
      const res = await fetch(`${API_BASE}/api/auth/social`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: "apple",
          identityToken: credential.identityToken ?? "",
          accessToken: credential.authorizationCode ?? "",
          providerUserId: credential.user,
          email: credential.email ?? undefined,
          name: fullName || undefined,
          country: lang === "ko" ? "KR" : "JP",
          language: lang,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "오류");
      login(data.token);
    } catch (e: any) {
      if (e.code !== "ERR_REQUEST_CANCELED") {
        setError(lang === "ko" ? "Apple 로그인에 실패했습니다." : "Appleログインに失敗しました。");
      }
    } finally {
      setSocialLoading(null);
    }
  };

  const handleSocialLogin = (provider: "google" | "apple" | "kakao" | "line") => {
    if (provider === "apple") return handleAppleLogin();
    return handleServerOAuth(provider);
  };

  // ── 이메일/비밀번호 ─────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!formReady || loading) return;
    setLoading(true);
    setError(null);
    try {
      const endpoint = mode === "register" ? "/api/auth/register" : "/api/auth/login";
      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
          country: lang === "ko" ? "KR" : "JP",
          language: lang,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? (lang === "ko" ? "오류가 발생했습니다." : "エラーが発生しました。"));
        return;
      }
      login(data.token);
    } catch {
      setError(
        lang === "ko"
          ? "서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요."
          : "サーバーに接続できません。しばらくしてから再試行してください。"
      );
    } finally {
      setLoading(false);
    }
  };

  // ── UI ─────────────────────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.white }]}
      behavior="padding"
    >
      <TouchableOpacity
        style={[styles.backBtn, { top: topPad + 12 }]}
        onPress={() => router.replace("/onboarding")}
      >
        <FIcon name="chevron-left" size={22} color={colors.charcoalMid} />
      </TouchableOpacity>

      <View style={[styles.inner, { paddingTop: topPad + 60, paddingBottom: bottomPad + 32 }]}>
        <View style={styles.logoSection}>
          <Text style={[styles.appName, { color: colors.charcoal }]}>lito</Text>
          <Text style={[styles.tagline, { color: colors.charcoalLight }]}>한국과 일본을 잇는 인연</Text>
          <Text style={[styles.taglineJa, { color: colors.charcoalLight }]}>韓日をつなぐ縁</Text>
        </View>

        <View style={styles.formSection}>
          {/* Mode toggle */}
          <View style={[styles.modeToggle, { backgroundColor: colors.muted, borderColor: colors.border }]}>
            {(["login", "register"] as const).map((m) => (
              <Pressable
                key={m}
                style={[styles.modeBtn, mode === m && { backgroundColor: colors.white, shadowColor: colors.charcoal }]}
                onPress={() => { setMode(m); setError(null); }}
              >
                <Text style={[styles.modeBtnText, { color: mode === m ? colors.charcoal : colors.charcoalLight }]}>
                  {m === "login" ? (lang === "ko" ? "로그인" : "ログイン") : (lang === "ko" ? "신규 가입" : "新規登録")}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Email input */}
          <View style={[styles.inputWrap, { backgroundColor: focusedField === "email" ? colors.white : colors.muted, borderColor: focusedField === "email" ? colors.rose : colors.border }]}>
            <FIcon name="mail" size={17} color={focusedField === "email" ? colors.rose : colors.charcoalLight} />
            <TextInput
              style={[styles.input, { color: colors.charcoal }]}
              placeholder={lang === "ko" ? "이메일" : "メールアドレス"}
              placeholderTextColor={colors.charcoalLight}
              value={email}
              onChangeText={(v) => { setEmail(v); setError(null); }}
              onFocus={() => setFocusedField("email")}
              onBlur={() => setFocusedField(null)}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {/* Password input */}
          <View style={[styles.inputWrap, { backgroundColor: focusedField === "password" ? colors.white : colors.muted, borderColor: focusedField === "password" ? colors.rose : colors.border, marginTop: 10 }]}>
            <FIcon name="lock" size={17} color={focusedField === "password" ? colors.rose : colors.charcoalLight} />
            <TextInput
              style={[styles.input, { color: colors.charcoal }]}
              placeholder={lang === "ko" ? (mode === "register" ? "비밀번호 (6자 이상)" : "비밀번호") : (mode === "register" ? "パスワード（6文字以上）" : "パスワード")}
              placeholderTextColor={colors.charcoalLight}
              value={password}
              onChangeText={(v) => { setPassword(v); setError(null); }}
              onFocus={() => setFocusedField("password")}
              onBlur={() => setFocusedField(null)}
              secureTextEntry
              autoCapitalize="none"
            />
          </View>

          {error ? (
            <View style={[styles.errorBox, { backgroundColor: colors.roseLight }]}>
              <FIcon name="alert-circle" size={14} color={colors.rose} />
              <Text style={[styles.errorText, { color: colors.rose }]}>{error}</Text>
            </View>
          ) : null}

          <Pressable
            style={({ pressed }) => [styles.primaryBtn, { backgroundColor: formReady ? colors.rose : colors.roseSoft, opacity: pressed ? 0.88 : 1, marginTop: 16 }]}
            onPress={handleSubmit}
            disabled={loading || !formReady}
          >
            {loading ? (
              <Text style={[styles.primaryBtnText, { color: colors.white }]}>
                {mode === "register" ? (lang === "ko" ? "가입 중..." : "登録中...") : (lang === "ko" ? "로그인 중..." : "ログイン中...")}
              </Text>
            ) : (
              <>
                <Text style={[styles.primaryBtnText, { color: formReady ? colors.white : colors.rose }]}>
                  {mode === "register" ? (lang === "ko" ? "가입하기" : "登録する") : (lang === "ko" ? "로그인" : "ログイン")}
                </Text>
                <FIcon name="arrow-right" size={17} color={formReady ? colors.white : colors.rose} />
              </>
            )}
          </Pressable>

          {/* Divider */}
          <View style={styles.dividerRow}>
            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
            <Text style={[styles.dividerText, { color: colors.charcoalLight }]}>{lang === "ko" ? "또는" : "または"}</Text>
            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
          </View>

          {/* Social buttons 2x2 */}
          <View style={styles.socialGrid}>
            <SocialBtn
              label="Google"
              bg={colors.white}
              border="#DADCE0"
              iconBg="#F1F3F4"
              iconText="G"
              iconColor="#4285F4"
              textColor={colors.charcoal}
              loading={socialLoading === "google"}
              onPress={() => handleSocialLogin("google")}
            />
            <SocialBtn
              label="Apple"
              bg="#000000"
              border="#000000"
              iconBg="#333333"
              iconText="A"
              iconColor="#FFFFFF"
              textColor="#FFFFFF"
              loading={socialLoading === "apple"}
              onPress={() => handleSocialLogin("apple")}
            />
            <SocialBtn
              label="Kakao"
              bg="#FEFCE8"
              border="#E9D95C"
              iconBg="#E9D95C"
              iconText="K"
              iconColor="#5C4A00"
              textColor="#5C4A00"
              loading={socialLoading === "kakao"}
              onPress={() => handleSocialLogin("kakao")}
            />
            <SocialBtn
              label="LINE"
              bg="#F7FEFB"
              border="#7EC8A4"
              iconBg="#7EC8A4"
              iconText="L"
              iconColor="#1A5C3A"
              textColor="#1A5C3A"
              loading={socialLoading === "line"}
              onPress={() => handleSocialLogin("line")}
            />
          </View>
        </View>

        <Text style={[styles.terms, { color: colors.charcoalLight }]}>
          {lang === "ko" ? "계속하면 " : "続けることで、"}
          <Text
            style={[styles.termsLink, { color: colors.rose }]}
            onPress={() => {
              const base = process.env.EXPO_PUBLIC_DOMAIN
                ? `https://${process.env.EXPO_PUBLIC_DOMAIN}`
                : "http://localhost:3000";
              Linking.openURL(`${base}/api/legal/terms`);
            }}
          >{lang === "ko" ? "이용약관" : "利用規約"}</Text>
          {lang === "ko" ? " 및 " : "・"}
          <Text
            style={[styles.termsLink, { color: colors.rose }]}
            onPress={() => {
              const base = process.env.EXPO_PUBLIC_DOMAIN
                ? `https://${process.env.EXPO_PUBLIC_DOMAIN}`
                : "http://localhost:3000";
              Linking.openURL(`${base}/api/legal/privacy`);
            }}
          >{lang === "ko" ? "개인정보 보호정책" : "プライバシーポリシー"}</Text>
          {lang === "ko" ? "에 동의하는 것으로 간주됩니다." : "に同意したことになります。"}
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}

// ── SocialBtn ───────────────────────────────────────────────────────────────

function SocialBtn({
  label, bg, border, iconBg, iconText, iconColor, textColor, loading, onPress,
}: {
  label: string; bg: string; border: string; iconBg: string;
  iconText: string; iconColor: string; textColor: string; loading: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [styles.socialBtn, { backgroundColor: bg, borderColor: border, opacity: pressed || loading ? 0.8 : 1 }]}
      onPress={onPress}
      disabled={loading}
    >
      <View style={[styles.socialIconWrap, { backgroundColor: iconBg }]}>
        <Text style={[styles.socialBtnIconSm, { color: iconColor }]}>
          {loading ? "..." : iconText}
        </Text>
      </View>
      <Text style={[styles.socialBtnLabel, { color: textColor }]}>{label}</Text>
    </Pressable>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  backBtn: { position: "absolute", left: 20, zIndex: 10, width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  inner: { flex: 1, paddingHorizontal: 28, justifyContent: "space-between" },
  logoSection: { alignItems: "center", paddingBottom: 8 },
  appName: { fontFamily: "Inter_700Bold", fontSize: 44, letterSpacing: -2, marginBottom: 12 },
  tagline: { fontFamily: "Inter_400Regular", fontSize: 13, opacity: 0.7, marginBottom: 2 },
  taglineJa: { fontFamily: "Inter_400Regular", fontSize: 13, opacity: 0.5 },
  formSection: { gap: 0 },
  modeToggle: { flexDirection: "row", borderRadius: 14, borderWidth: 1, padding: 4, marginBottom: 18 },
  modeBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: "center", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 2 },
  modeBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 14 },
  inputWrap: { flexDirection: "row", alignItems: "center", borderRadius: 16, borderWidth: 1.5, paddingHorizontal: 18, paddingVertical: 16, gap: 12 },
  input: { flex: 1, fontFamily: "Inter_400Regular", fontSize: 16, height: 22 },
  errorBox: { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, marginTop: 10 },
  errorText: { fontFamily: "Inter_400Regular", fontSize: 13, flex: 1 },
  primaryBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", borderRadius: 100, paddingVertical: 18, gap: 8 },
  primaryBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 16, letterSpacing: 0.1 },
  dividerRow: { flexDirection: "row", alignItems: "center", marginVertical: 24, gap: 14 },
  dividerLine: { flex: 1, height: StyleSheet.hairlineWidth * 2 },
  dividerText: { fontFamily: "Inter_400Regular", fontSize: 13, opacity: 0.7 },
  socialGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  socialBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", borderRadius: 100, paddingVertical: 14, borderWidth: 1.5, gap: 8, width: "47.5%" },
  socialIconWrap: { width: 22, height: 22, borderRadius: 6, alignItems: "center", justifyContent: "center" },
  socialBtnIconSm: { fontFamily: "Inter_700Bold", fontSize: 12, lineHeight: 14 },
  socialBtnLabel: { fontFamily: "Inter_600SemiBold", fontSize: 15 },
  terms: { fontFamily: "Inter_400Regular", fontSize: 12, textAlign: "center", lineHeight: 20, opacity: 0.8 },
  termsLink: { fontFamily: "Inter_500Medium", fontSize: 12 },
});
