import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
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

  const heroHeight = 290;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingBottom: bottomPad + 90 }}
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
          <View
            style={[
              styles.heroPlaceholder,
              { backgroundColor: colors.rose, height: heroHeight + topPad },
            ]}
          >
            <Text style={styles.heroInitial}>
              {(profile.nickname || "U")[0].toUpperCase()}
            </Text>
          </View>
        )}

        {/* Rich gradient — transparent top → deep dark bottom */}
        <LinearGradient
          colors={[
            "transparent",
            "rgba(10,8,10,0.15)",
            "rgba(10,8,10,0.62)",
          ]}
          locations={[0.4, 0.68, 1]}
          style={StyleSheet.absoluteFillObject}
          pointerEvents="none"
        />

        {/* Settings button */}
        <TouchableOpacity
          style={[styles.settingsBtn, { top: topPad + 14 }]}
          onPress={() => router.push("/settings" as any)}
        >
          <Feather name="settings" size={19} color={colors.white} />
        </TouchableOpacity>

        {/* Edit photo — bottom right overlay */}
        <TouchableOpacity
          style={[styles.addPhotoBtn, { backgroundColor: "rgba(0,0,0,0.42)" }]}
        >
          <Feather name="camera" size={13} color={colors.white} />
          <Text style={styles.addPhotoBtnText}>{t("profile.addPhoto")}</Text>
        </TouchableOpacity>

        {/* Identity shown on the hero image */}
        <View style={[styles.heroIdentity, { paddingTop: topPad }]}>
          <View style={styles.heroNameRow}>
            <Text style={styles.heroName}>{profile.nickname}</Text>
            <Text style={styles.heroAge}>{profile.age}</Text>
            <CountryFlag country={profile.country} size={20} />
          </View>
          {profile.intro ? (
            <Text style={styles.heroIntro} numberOfLines={1}>
              {profile.intro}
            </Text>
          ) : null}
        </View>
      </View>

      {/* ── Trust / completeness bar ──────────────────────────────────────── */}
      <View style={[styles.trustCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.trustRow}>
          <View style={[styles.trustIcon, { backgroundColor: colors.roseLight }]}>
            <Feather name="shield" size={14} color={colors.rose} />
          </View>
          <View style={styles.trustMeta}>
            <Text style={[styles.trustLabel, { color: colors.charcoal }]}>
              Profile strength
            </Text>
            <Text style={[styles.trustSub, { color: colors.charcoalLight }]}>
              {profile.isVerified ? "Verified member · " : ""}
              {profile.photos.length} photo{profile.photos.length !== 1 ? "s" : ""}
              {profile.bio ? " · Bio added" : ""}
            </Text>
          </View>
          <View style={[styles.trustBadge, { backgroundColor: colors.roseLight }]}>
            <Text style={[styles.trustBadgeText, { color: colors.rose }]}>
              {profile.isVerified ? "Verified" : "Add info"}
            </Text>
          </View>
        </View>

        {/* Strength bar */}
        <View style={[styles.barTrack, { backgroundColor: colors.border }]}>
          <View
            style={[
              styles.barFill,
              {
                backgroundColor: colors.rose,
                width: `${Math.min(
                  100,
                  (profile.photos.length > 0 ? 30 : 0) +
                    (profile.bio ? 25 : 0) +
                    (profile.interests?.length ? 20 : 0) +
                    (profile.isVerified ? 25 : 0)
                )}%` as any,
              },
            ]}
          />
        </View>
      </View>

      {/* ── Language badges ───────────────────────────────────────────────── */}
      <View style={[styles.section, { backgroundColor: colors.surface }]}>
        <Text style={[styles.sectionLabel, { color: colors.charcoalLight }]}>
          LANGUAGE & SOCIAL
        </Text>
        <View style={styles.badgeRow}>
          <View
            style={[
              styles.badge,
              { backgroundColor: colors.roseLight, borderColor: colors.roseSoft },
            ]}
          >
            <Feather name="globe" size={12} color={colors.rose} />
            <Text style={[styles.badgeText, { color: colors.rose }]}>
              {profile.language === "ko" ? "한국어" : "日本語"}
            </Text>
          </View>
          {profile.instagramHandle && (
            <View
              style={[
                styles.badge,
                { backgroundColor: "#F5F0FF", borderColor: "#DDD5F8" },
              ]}
            >
              <Feather name="instagram" size={12} color="#7C3AED" />
              <Text style={[styles.badgeText, { color: "#7C3AED" }]}>
                {profile.instagramHandle}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* ── Interests ────────────────────────────────────────────────────── */}
      {profile.interests && profile.interests.length > 0 && (
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionLabel, { color: colors.charcoalLight }]}>
            {t("profile.interests").toUpperCase()}
          </Text>
          <View style={styles.tagsWrap}>
            {profile.interests.map((tag) => (
              <View
                key={tag}
                style={[
                  styles.tag,
                  {
                    backgroundColor: colors.roseLight,
                    borderColor: colors.roseSoft,
                  },
                ]}
              >
                <Text style={[styles.tagText, { color: colors.rose }]}>{tag}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* ── Bio ──────────────────────────────────────────────────────────── */}
      {profile.bio ? (
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
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
        <View
          style={[
            styles.aiCard,
            { backgroundColor: colors.roseLight, borderColor: colors.roseSoft },
          ]}
        >
          <View style={styles.aiCardHeader}>
            <View style={[styles.aiIconWrap, { backgroundColor: colors.roseSoft }]}>
              <Feather name="cpu" size={12} color={colors.rose} />
            </View>
            <Text style={[styles.aiCardTitle, { color: colors.rose }]}>
              AI CULTURE FIT
            </Text>
          </View>
          <Text style={[styles.aiCardBody, { color: colors.charcoalMid }]}>
            {profile.aiStyleSummary}
          </Text>
        </View>
      ) : null}

      {/* ── Actions ──────────────────────────────────────────────────────── */}
      <View
        style={[
          styles.actionsCard,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
        <TouchableOpacity
          style={[styles.actionRow, { borderBottomColor: colors.border }]}
          onPress={() => router.push("/profile-setup" as any)}
        >
          <View style={[styles.actionIcon, { backgroundColor: colors.roseLight }]}>
            <Feather name="edit-2" size={16} color={colors.rose} />
          </View>
          <Text style={[styles.actionLabel, { color: colors.charcoal }]}>
            {t("profile.editProfile")}
          </Text>
          <Feather name="chevron-right" size={15} color={colors.charcoalLight} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionRow, { borderBottomColor: colors.border }]}
          onPress={() => router.push("/settings" as any)}
        >
          <View style={[styles.actionIcon, { backgroundColor: colors.roseLight }]}>
            <Feather name="settings" size={16} color={colors.rose} />
          </View>
          <Text style={[styles.actionLabel, { color: colors.charcoal }]}>
            {t("profile.settings")}
          </Text>
          <Feather name="chevron-right" size={15} color={colors.charcoalLight} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionRow} onPress={logout}>
          <View style={[styles.actionIcon, { backgroundColor: "#FFEDED" }]}>
            <Feather name="log-out" size={16} color="#E8607A" />
          </View>
          <Text style={[styles.actionLabel, { color: "#E8607A" }]}>
            {t("profile.signOut")}
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── App tag ──────────────────────────────────────────────────────── */}
      <View style={styles.appTag}>
        <Text style={[styles.appTagText, { color: colors.charcoalFaint }]}>
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

  // ── Hero ──────────────────────────────────────────────────────────────────
  hero: { position: "relative", overflow: "hidden" },
  heroPlaceholder: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  heroInitial: {
    fontFamily: "Inter_700Bold",
    fontSize: 96,
    color: "rgba(255,255,255,0.55)",
  },
  settingsBtn: {
    position: "absolute",
    right: 16,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(0,0,0,0.32)",
    alignItems: "center",
    justifyContent: "center",
  },
  addPhotoBtn: {
    position: "absolute",
    bottom: 60,
    right: 16,
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
  // Identity overlaid on hero
  heroIdentity: {
    position: "absolute",
    bottom: 18,
    left: 20,
    right: 60,
  },
  heroNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginBottom: 4,
  },
  heroName: {
    fontFamily: "Inter_700Bold",
    fontSize: 28,
    color: "#fff",
    textShadowColor: "rgba(0,0,0,0.3)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  heroAge: {
    fontFamily: "Inter_400Regular",
    fontSize: 22,
    color: "rgba(255,255,255,0.82)",
  },
  heroIntro: {
    fontFamily: "Inter_400Regular",
    fontSize: 13.5,
    color: "rgba(255,255,255,0.75)",
    lineHeight: 20,
  },

  // ── Trust card ────────────────────────────────────────────────────────────
  trustCard: {
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 10,
    borderRadius: 18,
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
  },
  trustRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 14,
  },
  trustIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  trustMeta: { flex: 1 },
  trustLabel: { fontFamily: "Inter_600SemiBold", fontSize: 14, marginBottom: 2 },
  trustSub: { fontFamily: "Inter_400Regular", fontSize: 12 },
  trustBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  trustBadgeText: { fontFamily: "Inter_600SemiBold", fontSize: 11 },
  barTrack: {
    height: 4,
    borderRadius: 2,
    overflow: "hidden",
  },
  barFill: {
    height: 4,
    borderRadius: 2,
  },

  // ── Sections ──────────────────────────────────────────────────────────────
  section: {
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 18,
    padding: 18,
  },
  sectionLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 10.5,
    letterSpacing: 0.9,
    marginBottom: 13,
  },
  badgeRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  badgeText: { fontFamily: "Inter_500Medium", fontSize: 13 },

  tagsWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tag: {
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  tagText: { fontFamily: "Inter_500Medium", fontSize: 13 },
  bioText: {
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    lineHeight: 23,
  },

  // ── AI card ───────────────────────────────────────────────────────────────
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
    gap: 8,
    marginBottom: 10,
  },
  aiIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  aiCardTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 10.5,
    letterSpacing: 0.8,
  },
  aiCardBody: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    lineHeight: 21,
  },

  // ── Actions ───────────────────────────────────────────────────────────────
  actionsCard: {
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 15,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 13,
  },
  actionIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  actionLabel: { fontFamily: "Inter_500Medium", fontSize: 15, flex: 1 },

  // ── App tag ───────────────────────────────────────────────────────────────
  appTag: { alignItems: "center", paddingTop: 18, paddingBottom: 8 },
  appTagText: { fontFamily: "Inter_400Regular", fontSize: 11.5, letterSpacing: 0.1 },
});
