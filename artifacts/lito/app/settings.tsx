import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { logout, profile, updateProfile } = useApp();
  const appLanguage = profile.language;
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const SettingRow = ({
    icon,
    label,
    sublabel,
    onPress,
    right,
    danger = false,
  }: {
    icon: string;
    label: string;
    sublabel?: string;
    onPress?: () => void;
    right?: React.ReactNode;
    danger?: boolean;
  }) => (
    <TouchableOpacity
      style={[styles.row, { borderBottomColor: colors.border }]}
      onPress={onPress}
      disabled={!onPress && !right}
    >
      <View style={[styles.rowIcon, { backgroundColor: danger ? "#FFEDED" : colors.roseLight }]}>
        <Feather name={icon as any} size={16} color={danger ? colors.destructive : colors.rose} />
      </View>
      <View style={styles.rowContent}>
        <Text style={[styles.rowLabel, { color: danger ? colors.destructive : colors.charcoal }]}>
          {label}
        </Text>
        {sublabel && <Text style={[styles.rowSub, { color: colors.charcoalLight }]}>{sublabel}</Text>}
      </View>
      {right || (onPress && <Feather name="chevron-right" size={16} color={colors.charcoalLight} />)}
    </TouchableOpacity>
  );

  const handleDeleteAccount = () => {
    Alert.alert(
      "Delete Account",
      "Are you sure? This cannot be undone.\n계정을 삭제하시겠습니까? 취소할 수 없습니다.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            // TODO: Supabase account deletion
            logout();
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 12 }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Feather name="chevron-left" size={24} color={colors.charcoal} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.charcoal }]}>Settings</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: bottomPad + 24 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.sectionWrap}>
          <Text style={[styles.sectionTitle, { color: colors.charcoalLight }]}>SUPPORT</Text>
          <View style={[styles.section, { backgroundColor: colors.white, borderColor: colors.border }]}>
            <SettingRow
              icon="mail"
              label="Contact Support"
              sublabel="litosupport@gmail.com"
              onPress={() => {
                // TODO: Open email client
              }}
            />
            <SettingRow
              icon="file-text"
              label="Privacy Policy"
              sublabel="개인정보 보호정책 · プライバシーポリシー"
              onPress={() => {
                // TODO: Open privacy policy URL
              }}
            />
            <SettingRow
              icon="help-circle"
              label="FAQ"
              sublabel="자주 묻는 질문 · よくある質問"
              onPress={() => {}}
            />
          </View>
        </View>

        <View style={styles.sectionWrap}>
          <Text style={[styles.sectionTitle, { color: colors.charcoalLight }]}>PREFERENCES</Text>
          <View style={[styles.section, { backgroundColor: colors.white, borderColor: colors.border }]}>
            <SettingRow
              icon="globe"
              label="App Language"
              sublabel={appLanguage === "ko" ? "한국어 (Korean)" : "日本語 (Japanese)"}
              right={
                <View style={styles.langToggle}>
                  {(["ko", "ja"] as const).map((lang) => (
                    <TouchableOpacity
                      key={lang}
                      style={[
                        styles.langBtn,
                        {
                          backgroundColor: appLanguage === lang ? colors.rose : colors.muted,
                          borderColor: appLanguage === lang ? colors.rose : colors.border,
                        },
                      ]}
                      onPress={() =>
                        updateProfile({ country: lang === "ko" ? "KR" : "JP", language: lang })
                      }
                    >
                      <Text
                        style={[
                          styles.langBtnText,
                          { color: appLanguage === lang ? colors.white : colors.charcoalMid },
                        ]}
                      >
                        {lang === "ko" ? "KO" : "JA"}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              }
            />
            <SettingRow
              icon="bell"
              label="Notifications"
              right={
                <Switch
                  value={true}
                  onValueChange={() => {}}
                  trackColor={{ true: colors.rose }}
                  thumbColor={colors.white}
                />
              }
            />
          </View>
        </View>

        <View style={styles.sectionWrap}>
          <Text style={[styles.sectionTitle, { color: colors.charcoalLight }]}>ACCOUNT</Text>
          <View style={[styles.section, { backgroundColor: colors.white, borderColor: colors.border }]}>
            <SettingRow
              icon="shield"
              label="Block / Report"
              onPress={() => {}}
            />
            <SettingRow
              icon="trash-2"
              label="Delete Account"
              sublabel="계정 삭제 · アカウント削除"
              onPress={handleDeleteAccount}
              danger
            />
          </View>
        </View>

        <View style={[styles.appInfo]}>
          <Text style={[styles.appName, { color: colors.rose }]}>lito</Text>
          <Text style={[styles.appVersion, { color: colors.charcoalLight }]}>Version 1.0.0</Text>
          <Text style={[styles.appTagline, { color: colors.charcoalLight }]}>
            한국과 일본을 잇는 인연 · 韓日をつなぐ縁
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  title: {
    fontFamily: "Inter_700Bold",
    fontSize: 18,
  },
  sectionWrap: { marginBottom: 8, paddingHorizontal: 20 },
  sectionTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    letterSpacing: 1,
    marginBottom: 8,
    paddingTop: 16,
  },
  section: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    gap: 12,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  rowContent: { flex: 1 },
  rowLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 15,
  },
  rowSub: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    marginTop: 2,
  },
  langToggle: { flexDirection: "row", gap: 6 },
  langBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  langBtnText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
  },
  appInfo: {
    alignItems: "center",
    paddingTop: 32,
    paddingBottom: 8,
  },
  appName: {
    fontFamily: "Inter_700Bold",
    fontSize: 24,
    letterSpacing: -1,
    marginBottom: 4,
  },
  appVersion: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    marginBottom: 4,
  },
  appTagline: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
  },
});
