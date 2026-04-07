import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import {
  Dimensions,
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
import { useLocale } from "@/hooks/useLocale";

const { width } = Dimensions.get("window");

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { profile, logout } = useApp();
  const { t, lang } = useLocale();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const heroHeight = 240;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingBottom: bottomPad + 80 }}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <View style={[styles.hero, { height: heroHeight + topPad }]}>
        {profile.photos[0] ? (
          <ProfileImage
            photoKey={profile.photos[0]}
            size={width}
            borderRadius={0}
            style={{ width, height: heroHeight + topPad }}
          />
        ) : (
          <View style={[styles.heroPlaceholder, { backgroundColor: colors.rose, height: heroHeight + topPad }]}>
            <Text style={styles.heroInitial}>{(profile.nickname || "U")[0].toUpperCase()}</Text>
          </View>
        )}

        {/* Dim overlay */}
        <View style={styles.heroOverlay} />

        {/* Settings button */}
        <TouchableOpacity
          style={[styles.settingsBtn, { top: topPad + 12 }]}
          onPress={() => router.push("/settings" as any)}
        >
          <Feather name="settings" size={20} color={colors.white} />
        </TouchableOpacity>

        {/* Add photo button */}
        <TouchableOpacity style={[styles.addPhotoBtn, { backgroundColor: "rgba(0,0,0,0.45)" }]}>
          <Feather name="camera" size={14} color={colors.white} />
          <Text style={styles.addPhotoBtnText}>{t("profile.addPhoto")}</Text>
        </TouchableOpacity>
      </View>

      {/* ── Identity ─────────────────────────────────────────────────────── */}
      <View style={[styles.identity, { backgroundColor: colors.white }]}>
        <View style={styles.nameRow}>
          <Text style={[styles.name, { color: colors.charcoal }]}>{profile.nickname}</Text>
          <Text style={[styles.age, { color: colors.charcoalMid }]}>, {profile.age}</Text>
          <CountryFlag country={profile.country} size={20} />
        </View>

        {profile.intro ? (
          <Text style={[styles.intro, { color: colors.charcoalMid }]}>{profile.intro}</Text>
        ) : null}

        {/* Language badge */}
        <View style={styles.badgeRow}>
          <View style={[styles.badge, { backgroundColor: colors.roseLight, borderColor: colors.roseSoft }]}>
            <Feather name="globe" size={12} color={colors.rose} />
            <Text style={[styles.badgeText, { color: colors.rose }]}>
              {profile.language === "ko" ? "한국어" : "日本語"}
            </Text>
          </View>
          {profile.instagramHandle && (
            <View style={[styles.badge, { backgroundColor: "#F5F0FF", borderColor: "#DDD5F8" }]}>
              <Feather name="instagram" size={12} color="#7C3AED" />
              <Text style={[styles.badgeText, { color: "#7C3AED" }]}>{profile.instagramHandle}</Text>
            </View>
          )}
        </View>
      </View>

      {/* ── Interests ────────────────────────────────────────────────────── */}
      {profile.interests && profile.interests.length > 0 && (
        <View style={[styles.section, { backgroundColor: colors.white }]}>
          <Text style={[styles.sectionLabel, { color: colors.charcoalLight }]}>
            {t("profile.interests").toUpperCase()}
          </Text>
          <View style={styles.tagsWrap}>
            {profile.interests.map((tag) => (
              <View
                key={tag}
                style={[styles.tag, { backgroundColor: colors.roseLight, borderColor: colors.roseSoft }]}
              >
                <Text style={[styles.tagText, { color: colors.rose }]}>{tag}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* ── Bio ──────────────────────────────────────────────────────────── */}
      {profile.bio ? (
        <View style={[styles.section, { backgroundColor: colors.white }]}>
          <Text style={[styles.sectionLabel, { color: colors.charcoalLight }]}>
            {t("profile.bio").toUpperCase()}
          </Text>
          <Text style={[styles.bioText, { color: colors.charcoal }]}>
            {profile.bio.split("\n\n")[0]}
          </Text>
        </View>
      ) : null}

      {/* ── AI Insight ───────────────────────────────────────────────────── */}
      {profile.aiStyleSummary ? (
        <View style={[styles.aiCard, { backgroundColor: colors.roseLight, borderColor: colors.roseSoft }]}>
          <View style={styles.aiCardHeader}>
            <Feather name="cpu" size={14} color={colors.rose} />
            <Text style={[styles.aiCardTitle, { color: colors.rose }]}>
              {t("profile.aiSummary").toUpperCase()}
            </Text>
          </View>
          <Text style={[styles.aiCardBody, { color: colors.charcoalMid }]}>
            {profile.aiStyleSummary}
          </Text>
        </View>
      ) : null}

      {/* ── Actions ──────────────────────────────────────────────────────── */}
      <View style={[styles.actionsCard, { backgroundColor: colors.white, borderColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.actionRow, { borderBottomColor: colors.border }]}
          onPress={() => router.push("/profile-setup" as any)}
        >
          <View style={[styles.actionIcon, { backgroundColor: colors.roseLight }]}>
            <Feather name="edit-2" size={16} color={colors.rose} />
          </View>
          <Text style={[styles.actionLabel, { color: colors.charcoal }]}>{t("profile.editProfile")}</Text>
          <Feather name="chevron-right" size={16} color={colors.charcoalLight} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionRow, { borderBottomColor: colors.border }]}
          onPress={() => router.push("/settings" as any)}
        >
          <View style={[styles.actionIcon, { backgroundColor: colors.roseLight }]}>
            <Feather name="settings" size={16} color={colors.rose} />
          </View>
          <Text style={[styles.actionLabel, { color: colors.charcoal }]}>{t("profile.settings")}</Text>
          <Feather name="chevron-right" size={16} color={colors.charcoalLight} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionRow}
          onPress={logout}
        >
          <View style={[styles.actionIcon, { backgroundColor: "#FFEDED" }]}>
            <Feather name="log-out" size={16} color="#E8607A" />
          </View>
          <Text style={[styles.actionLabel, { color: "#E8607A" }]}>{t("profile.signOut")}</Text>
        </TouchableOpacity>
      </View>

      {/* ── App tag ──────────────────────────────────────────────────────── */}
      <View style={styles.appTag}>
        <Text style={[styles.appTagText, { color: colors.charcoalLight }]}>
          {lang === "ko"
            ? "한국과 일본을 잇는 인연 · 韓日をつなぐ縁"
            : "韓日をつなぐ縁 · 한국과 일본을 잇는 인연"}
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  hero: { position: "relative", overflow: "hidden" },
  heroPlaceholder: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  heroInitial: {
    fontFamily: "Inter_700Bold",
    fontSize: 96,
    color: "rgba(255,255,255,0.6)",
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.18)",
  },
  settingsBtn: {
    position: "absolute",
    right: 16,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  addPhotoBtn: {
    position: "absolute",
    bottom: 14,
    right: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  addPhotoBtnText: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    color: "#fff",
  },

  identity: {
    paddingHorizontal: 22,
    paddingTop: 20,
    paddingBottom: 18,
    marginBottom: 10,
  },
  nameRow: { flexDirection: "row", alignItems: "baseline", gap: 4, marginBottom: 6 },
  name: { fontFamily: "Inter_700Bold", fontSize: 28 },
  age:  { fontFamily: "Inter_400Regular", fontSize: 22, marginRight: 4 },
  intro: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
    fontStyle: "italic",
  },
  badgeRow: { flexDirection: "row", gap: 8 },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  badgeText: { fontFamily: "Inter_500Medium", fontSize: 12 },

  section: {
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 18,
    padding: 18,
  },
  sectionLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  tagsWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  tagText: { fontFamily: "Inter_500Medium", fontSize: 13 },
  bioText: {
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    lineHeight: 23,
  },

  aiCard: {
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
  },
  aiCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  aiCardTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    letterSpacing: 0.8,
  },
  aiCardBody: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    lineHeight: 21,
  },

  actionsCard: {
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 18,
    borderWidth: 1,
    overflow: "hidden",
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    gap: 12,
  },
  actionIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  actionLabel: { fontFamily: "Inter_500Medium", fontSize: 15, flex: 1 },

  appTag: { alignItems: "center", paddingTop: 16, paddingBottom: 8 },
  appTagText: { fontFamily: "Inter_400Regular", fontSize: 12 },
});
