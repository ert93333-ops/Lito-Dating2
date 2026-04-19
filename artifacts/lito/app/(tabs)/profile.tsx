import FIcon from "@/components/FIcon";
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
import { TrustBadge } from "@/components/TrustBadge";
import { useApp } from "@/context/AppContext";
import { useGrowth } from "@/context/GrowthContext";
import { useColors } from "@/hooks/useColors";
import { useLocale } from "@/hooks/useLocale";
import { PLANS } from "@/services/monetization";
import { computeTrustScore } from "@/types";
import { translateInterest } from "@/utils/interests";

const { width } = Dimensions.get("window");

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { profile, logout, diagnosisStatus, diagnosisRewardClaimed } = useApp();
  const { subscription, track } = useGrowth();
  const { t, lang } = useLocale();

  const currentPlan = PLANS.find((p) => p.id === subscription.planId) ?? PLANS[0];

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
          <FIcon name="settings" size={19} color={colors.white} />
        </TouchableOpacity>

        {/* Edit photo — bottom right overlay */}
        <TouchableOpacity
          style={[styles.addPhotoBtn, { backgroundColor: "rgba(0,0,0,0.42)" }]}
          onPress={() => router.push("/profile-edit" as any)}
        >
          <FIcon name="camera" size={13} color={colors.white} />
          <Text style={styles.addPhotoBtnText}>{t("profile.addPhoto")}</Text>
        </TouchableOpacity>

        {/* Identity shown on the hero image */}
        <View style={[styles.heroIdentity, { paddingTop: topPad }]}>
          <View style={styles.heroNameRow}>
            <Text style={styles.heroName}>{profile.nickname}</Text>
            <Text style={styles.heroAge}>{profile.age}</Text>
            {profile.gender && (
              <View style={styles.genderPill}>
                <FIcon
                  name="user"
                  size={11}
                  color="rgba(255,255,255,0.9)"
                />
                <Text style={styles.genderPillText}>
                  {profile.gender === "male"
                    ? (lang === "ko" ? "남성" : "男性")
                    : profile.gender === "female"
                    ? (lang === "ko" ? "여성" : "女性")
                    : (lang === "ko" ? "기타" : "その他")}
                </Text>
              </View>
            )}
            <CountryFlag country={profile.country} size={20} />
          </View>
          {(profile.introI18n?.[lang] ?? profile.intro) ? (
            <Text style={styles.heroIntro} numberOfLines={1}>
              {profile.introI18n?.[lang] ?? profile.intro}
            </Text>
          ) : null}
        </View>
      </View>

      {/* ── Trust / completeness card ──────────────────────────────────────── */}
      <TouchableOpacity
        style={[styles.trustCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
        activeOpacity={0.88}
        onPress={() => router.push("/trust-center")}
      >
        <View style={styles.trustRow}>
          <View style={[styles.trustIcon, { backgroundColor: colors.roseLight }]}>
            <FIcon name="shield" size={14} color={colors.rose} />
          </View>
          <View style={styles.trustMeta}>
            <Text style={[styles.trustLabel, { color: colors.charcoal }]}>
              {lang === "ko" ? "신뢰 & 프로필 강도" : "信頼 & プロフィール強度"}
            </Text>
            <Text style={[styles.trustSub, { color: colors.charcoalLight }]}>
              {(() => {
                const parts: string[] = [];
                const photoCount = profile.photos.length;
                if (photoCount > 0) parts.push(lang === "ko" ? `사진 ${photoCount}장` : `写真${photoCount}枚`);
                if (profile.gender) parts.push(lang === "ko" ? "성별 설정" : "性別設定済");
                if (profile.bio) parts.push(lang === "ko" ? "소개 완료" : "自己紹介あり");
                if (profile.interests?.length) parts.push(lang === "ko" ? `관심사 ${profile.interests.length}개` : `興味${profile.interests.length}個`);
                return parts.length > 0 ? parts.join(" · ") : (lang === "ko" ? "프로필을 완성해봐요" : "プロフィールを完成させましょう");
              })()}
            </Text>
          </View>
          <FIcon name="chevron-right" size={15} color={colors.charcoalLight} />
        </View>

        {/* Layered trust badges */}
        <View style={styles.trustBadgesRow}>
          <TrustBadge
            trustProfile={profile.trustProfile}
            size="md"
            lang={lang}
            showPending
          />
          {computeTrustScore(profile.trustProfile) === 0 && (
            <TouchableOpacity
              onPress={() => router.push("/trust-center")}
              style={[styles.trustStartBtn, { backgroundColor: colors.roseLight, borderColor: colors.roseSoft }]}
            >
              <Text style={[styles.trustStartText, { color: colors.rose }]}>
                {lang === "ko" ? "인증 시작 →" : "認証を開始 →"}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Strength bar (profile completeness + trust combined) */}
        {(() => {
          const photoScore = profile.photos.length >= 3 ? 25 : profile.photos.length === 2 ? 20 : profile.photos.length === 1 ? 12 : 0;
          const genderScore = profile.gender ? 10 : 0;
          const bioScore = profile.bio ? 15 : 0;
          const interestScore = (profile.interests?.length ?? 0) >= 3 ? 15 : (profile.interests?.length ?? 0) > 0 ? 8 : 0;
          const nickScore = profile.nickname && profile.nickname !== "User" ? 5 : 0;
          const trustScore = computeTrustScore(profile.trustProfile) * 0.3;
          const total = Math.min(100, photoScore + genderScore + bioScore + interestScore + nickScore + trustScore);
          return (
            <View style={[styles.barTrack, { backgroundColor: colors.border }]}>
              <View style={[styles.barFill, { backgroundColor: colors.rose, width: `${total}%` as any }]} />
            </View>
          );
        })()}
      </TouchableOpacity>

      {/* ── 사진 없음 경고 배너 ───────────────────────────────────────────── */}
      {profile.photos.length === 0 && (
        <TouchableOpacity
          style={[styles.nophotoBanner, { backgroundColor: "#FFF8E7", borderColor: "#F5C842" }]}
          onPress={() => router.push("/profile-edit" as any)}
          activeOpacity={0.85}
        >
          <View style={[styles.nophotoIconWrap, { backgroundColor: "#F5C842" }]}>
            <FIcon name="camera" size={14} color="#7A5C00" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.nophotoTitle, { color: "#7A5C00" }]}>
              {lang === "ko" ? "사진을 올리면 Discover에 노출돼요" : "写真を追加するとDiscoverに表示されます"}
            </Text>
            <Text style={[styles.nophotoSub, { color: "#A07800" }]}>
              {lang === "ko" ? "지금 사진 추가하기 →" : "今すぐ写真を追加 →"}
            </Text>
          </View>
        </TouchableOpacity>
      )}

      {/* ── Language badges ───────────────────────────────────────────────── */}
      <View style={[styles.section, { backgroundColor: colors.surface }]}>
        <Text style={[styles.sectionLabel, { color: colors.charcoalLight }]}>
          {lang === "ko" ? "언어 & 소셜" : "言語 & SNS"}
        </Text>
        <View style={styles.badgeRow}>
          <View
            style={[
              styles.badge,
              { backgroundColor: colors.roseLight, borderColor: colors.roseSoft },
            ]}
          >
            <FIcon name="globe" size={12} color={colors.rose} />
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
              <FIcon name="instagram" size={12} color="#7C3AED" />
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
            {profile.interests.map((tag) => {
              const displayTag = translateInterest(tag, lang === "ko" ? "ko" : "ja");
              return (
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
                  <Text style={[styles.tagText, { color: colors.rose }]}>{displayTag}</Text>
                </View>
              );
            })}
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
              <FIcon name="cpu" size={12} color={colors.rose} />
            </View>
            <Text style={[styles.aiCardTitle, { color: colors.rose }]}>
              {lang === "ko" ? "AI 문화 공감" : "AIカルチャーフィット"}
            </Text>
          </View>
          <Text style={[styles.aiCardBody, { color: colors.charcoalMid }]}>
            {profile.aiStyleSummary[lang]}
          </Text>
        </View>
      ) : null}

      {/* ── Growth section ────────────────────────────────────────────────── */}
      <View style={[styles.section, { backgroundColor: colors.surface }]}>
        <Text style={[styles.sectionLabel, { color: colors.charcoalLight }]}>
          {lang === "ko" ? "멤버십 & AI" : "メンバーシップ & AI"}
        </Text>

        {/* Plan badge */}
        <View style={[styles.planRow, { borderColor: colors.border }]}>
          <View style={[styles.planBadgeIcon, { backgroundColor: subscription.planId === "free" ? colors.roseLight : "#FFF4F7" }]}>
            <FIcon
              name={subscription.planId === "premium" ? "star" : subscription.planId === "plus" ? "zap" : "user"}
              size={14}
              color={subscription.planId === "free" ? colors.charcoalMid : "#B83058"}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.planName, { color: colors.charcoal }]}>
              {currentPlan.name} {lang === "ko" ? "멤버" : "メンバー"}
            </Text>
            <Text style={[styles.planTagline, { color: colors.charcoalLight }]}>
              {lang === "ko"
                ? (currentPlan.taglineKo ?? currentPlan.tagline)
                : (currentPlan.taglineJa ?? currentPlan.tagline)}
            </Text>
          </View>
          {subscription.planId === "free" && (
            <TouchableOpacity
              style={[styles.upgradeChip, { backgroundColor: "#B83058" }]}
              onPress={() => {
                track("paywall_viewed", { entry: "profile" });
                router.push("/paywall" as any);
              }}
            >
              <Text style={styles.upgradeChipText}>
                {lang === "ko" ? "업그레이드" : "アップグレード"}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Dating Style Diagnosis */}
        <TouchableOpacity
          style={[styles.growthBtn, { borderColor: diagnosisStatus !== "completed" ? "#C84B72" : colors.border }]}
          onPress={() => router.push({ pathname: "/diagnosis" as any, params: { from: "profile" } })}
        >
          <View style={[styles.growthBtnIcon, { backgroundColor: "#FCEEF3" }]}>
            <FIcon name="heart" size={15} color="#C84B72" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.growthBtnLabel, { color: colors.charcoal }]}>
              {lang === "ko" ? "연애 스타일 진단" : "恋愛スタイル診断"}
            </Text>
            <Text style={[styles.growthBtnSub, { color: colors.charcoalLight }]}>
              {diagnosisStatus === "completed"
                ? (lang === "ko" ? "완료됨 · 답변 수정하기" : "完了済み · 回答を編集")
                : (lang === "ko"
                  ? "완료하면 매칭 정확도와 AI 코칭이 향상돼요"
                  : "完了するとマッチング精度とAIコーチングが向上します")}
            </Text>
          </View>
          {diagnosisStatus !== "completed" && (
            <View style={styles.diagnosisDot} />
          )}
          <FIcon name="chevron-right" size={15} color={colors.charcoalLight} />
        </TouchableOpacity>

        {/* AI Photo */}
        <TouchableOpacity
          style={[styles.growthBtn, { borderColor: colors.border }]}
          onPress={() => router.push("/ai-photo" as any)}
        >
          <View style={[styles.growthBtnIcon, { backgroundColor: colors.roseLight }]}>
            <FIcon name="camera" size={15} color={colors.rose} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.growthBtnLabel, { color: colors.charcoal }]}>
              {lang === "ko" ? "AI 증명사진 만들기" : "AI証明写真を作成"}
            </Text>
            <Text style={[styles.growthBtnSub, { color: colors.charcoalLight }]}>
              {lang === "ko"
                ? "사진 4~5장으로 자연스러운 프로필 사진 생성"
                : "写真4〜5枚で自然なプロフィール写真を生成"}
            </Text>
          </View>
          <View style={[{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, backgroundColor: colors.roseLight, marginRight: 6 }]}>
            <Text style={{ fontFamily: "Inter_700Bold", fontSize: 10, color: colors.rose }}>AI</Text>
          </View>
          <FIcon name="chevron-right" size={15} color={colors.charcoalLight} />
        </TouchableOpacity>

        {/* AI Coach */}
        <TouchableOpacity
          style={[styles.growthBtn, { borderColor: colors.border }]}
          onPress={() => {
            track("profile_coach_opened");
            router.push("/profile-coach" as any);
          }}
        >
          <View style={[styles.growthBtnIcon, { backgroundColor: colors.roseLight }]}>
            <FIcon name="cpu" size={15} color={colors.rose} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.growthBtnLabel, { color: colors.charcoal }]}>
              {lang === "ko" ? "AI 프로필 코치" : "AI プロフィールコーチ"}
            </Text>
            <Text style={[styles.growthBtnSub, { color: colors.charcoalLight }]}>
              {lang === "ko" ? "프로필 개선 제안 받기" : "プロフィール改善提案を見る"}
            </Text>
          </View>
          <FIcon name="chevron-right" size={15} color={colors.charcoalLight} />
        </TouchableOpacity>

        {/* Referral */}
        <TouchableOpacity
          style={[styles.growthBtn, { borderColor: colors.border }]}
          onPress={() => {
            track("invite_link_created");
            router.push("/referral" as any);
          }}
        >
          <View style={[styles.growthBtnIcon, { backgroundColor: colors.roseLight }]}>
            <FIcon name="gift" size={15} color={colors.rose} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.growthBtnLabel, { color: colors.charcoal }]}>
              {lang === "ko" ? "친구 초대" : "友達招待"}
            </Text>
            <Text style={[styles.growthBtnSub, { color: colors.charcoalLight }]}>
              {lang === "ko" ? "초대하면 둘 다 보상을 받아요" : "招待するとお互いに特典があります"}
            </Text>
          </View>
          <FIcon name="chevron-right" size={15} color={colors.charcoalLight} />
        </TouchableOpacity>
      </View>

      {/* ── Actions ──────────────────────────────────────────────────────── */}
      <View
        style={[
          styles.actionsCard,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
        <TouchableOpacity
          style={[styles.actionRow, { borderBottomColor: colors.border }]}
          onPress={() => router.push("/profile-edit" as any)}
        >
          <View style={[styles.actionIcon, { backgroundColor: colors.roseLight }]}>
            <FIcon name="edit-2" size={16} color={colors.rose} />
          </View>
          <Text style={[styles.actionLabel, { color: colors.charcoal }]}>
            {t("profile.editProfile")}
          </Text>
          <FIcon name="chevron-right" size={15} color={colors.charcoalLight} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionRow, { borderBottomColor: colors.border }]}
          onPress={() => router.push("/settings" as any)}
        >
          <View style={[styles.actionIcon, { backgroundColor: colors.roseLight }]}>
            <FIcon name="settings" size={16} color={colors.rose} />
          </View>
          <Text style={[styles.actionLabel, { color: colors.charcoal }]}>
            {t("profile.settings")}
          </Text>
          <FIcon name="chevron-right" size={15} color={colors.charcoalLight} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionRow} onPress={logout}>
          <View style={[styles.actionIcon, { backgroundColor: "#FFEDED" }]}>
            <FIcon name="log-out" size={16} color="#E8607A" />
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
  genderPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "rgba(255,255,255,0.18)",
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  genderPillText: {
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    color: "rgba(255,255,255,0.9)",
  },
  heroIntro: {
    fontFamily: "Inter_400Regular",
    fontSize: 13.5,
    color: "rgba(255,255,255,0.75)",
    lineHeight: 20,
  },

  // ── No photo banner ───────────────────────────────────────────────────────
  nophotoBanner: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginTop: 14,
    borderRadius: 16,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 12,
  },
  nophotoIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  nophotoTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    marginBottom: 2,
  },
  nophotoSub: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
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
  trustBadgesRow: {
    marginBottom: 12,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    alignItems: "center",
  },
  trustStartBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
  trustStartText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
  },
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

  // ── Growth section ────────────────────────────────────────────────────────
  planRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginBottom: 6,
  },
  planBadgeIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  planName: { fontFamily: "Inter_600SemiBold", fontSize: 15, marginBottom: 1 },
  planTagline: { fontFamily: "Inter_400Regular", fontSize: 12 },
  upgradeChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
  },
  upgradeChipText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    color: "#fff",
  },
  growthBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 13,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  growthBtnIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  growthBtnLabel: { fontFamily: "Inter_500Medium", fontSize: 15, marginBottom: 1 },
  growthBtnSub: { fontFamily: "Inter_400Regular", fontSize: 12 },
  diagnosisDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#C84B72",
    marginRight: 4,
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
