import FIcon from "@/components/FIcon";
import { CountryFlag } from "@/components/CountryFlag";
import { ProfileImage } from "@/components/ProfileImage";
import { TrustBadge } from "@/components/TrustBadge";
import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import { useLocale } from "@/hooks/useLocale";
import { translateInterest } from "@/utils/interests";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Dimensions,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width: SCREEN_W } = Dimensions.get("window");
const HERO_H = 400;

export default function UserProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { lang } = useLocale();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { conversations, discoverUsers, blockUser } = useApp();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  // ── Photo gallery ──────────────────────────────────────────────────────────
  const [photoIndex, setPhotoIndex] = useState(0);

  const handlePhotoScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_W);
    setPhotoIndex(idx);
  };

  // ── Entry animations ───────────────────────────────────────────────────────
  const heroAnim    = useRef(new Animated.Value(0)).current; // hero fade+scale
  const contentAnim = useRef(new Animated.Value(0)).current; // content fade+slide
  const footerAnim  = useRef(new Animated.Value(28)).current; // footer slide-up

  useEffect(() => {
    Animated.parallel([
      // Hero: fade in + subtle scale 0.97→1
      Animated.timing(heroAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      // Content: slight delay, fade + 16px slide up
      Animated.sequence([
        Animated.delay(100),
        Animated.parallel([
          Animated.timing(contentAnim, {
            toValue: 1,
            duration: 320,
            useNativeDriver: true,
          }),
        ]),
      ]),
      // Footer: slides up from 28px below
      Animated.sequence([
        Animated.delay(160),
        Animated.spring(footerAnim, {
          toValue: 0,
          useNativeDriver: true,
          damping: 22,
          stiffness: 240,
          mass: 0.9,
        }),
      ]),
    ]).start();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Find user from conversations or discover deck
  const conv = conversations.find((c) => c.user.id === id);
  const user = conv?.user ?? discoverUsers.find((u) => u.id === id);

  if (!user) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: topPad }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <FIcon name="arrow-left" size={22} color={colors.charcoal} />
        </TouchableOpacity>
        <View style={styles.notFound}>
          <Text style={[styles.notFoundText, { color: colors.charcoalLight }]}>
            {lang === "ko" ? "프로필을 찾을 수 없어요" : "プロフィールが見つかりません"}
          </Text>
        </View>
      </View>
    );
  }

  const convId = conv?.id ?? `conv_${id}`;
  const hasConv = !!conv;

  const levelLabel = {
    beginner: lang === "ko" ? "초급" : "初級",
    intermediate: lang === "ko" ? "중급" : "中級",
    advanced: lang === "ko" ? "고급" : "上級",
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* ── Back button overlaid on photo ── */}
      <TouchableOpacity
        style={[styles.backBtn, { top: topPad + 8 }]}
        onPress={() => router.back()}
      >
        <View style={styles.backBtnBg}>
          <FIcon name="arrow-left" size={20} color="#fff" />
        </View>
      </TouchableOpacity>

      {/* ── Report button (top-right) ── */}
      <TouchableOpacity
        style={[styles.reportBtn, { top: topPad + 8 }]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          router.push(
            `/report-user?userId=${user.id}&nickname=${encodeURIComponent(user.nickname)}` as any
          );
        }}
      >
        <View style={styles.backBtnBg}>
          <FIcon name="flag" size={17} color="#fff" />
        </View>
      </TouchableOpacity>

      <ScrollView
        contentContainerStyle={{ paddingBottom: bottomPad + 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero photo gallery ── */}
        <Animated.View
          style={[
            styles.heroWrap,
            {
              opacity: heroAnim,
              transform: [
                {
                  scale: heroAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.97, 1],
                  }),
                },
              ],
            },
          ]}
        >
          {/* Horizontal paging photo carousel */}
          {(() => {
            const photos = user.photos.length > 0 ? user.photos : ["profile1"];
            return (
              <>
                <ScrollView
                  horizontal
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
                  onMomentumScrollEnd={handlePhotoScroll}
                  scrollEventThrottle={16}
                  style={{ width: SCREEN_W, height: HERO_H }}
                >
                  {photos.map((photo, i) => (
                    <View key={i} style={{ width: SCREEN_W, height: HERO_H }}>
                      <ProfileImage
                        photoKey={photo}
                        size={undefined}
                        style={{ width: SCREEN_W, height: HERO_H } as any}
                        borderRadius={0}
                      />
                    </View>
                  ))}
                </ScrollView>

                {/* Gradient overlay */}
                <LinearGradient
                  colors={["transparent", "rgba(0,0,0,0.72)"]}
                  locations={[0.45, 1]}
                  style={StyleSheet.absoluteFill}
                  pointerEvents="none"
                />

                {/* Dot indicators — only if multiple photos */}
                {photos.length > 1 && (
                  <View style={styles.photoDots}>
                    {photos.map((_, i) => (
                      <View
                        key={i}
                        style={[
                          styles.photoDot,
                          { opacity: i === photoIndex ? 1 : 0.38, width: i === photoIndex ? 18 : 6 },
                        ]}
                      />
                    ))}
                  </View>
                )}

                {/* Name / age / city info */}
                <View style={styles.heroInfo}>
                  <View style={styles.heroNameRow}>
                    <Text style={styles.heroName}>{user.nickname}</Text>
                    <Text style={styles.heroAge}>{user.age}</Text>
                    <CountryFlag country={user.country} size={18} />
                  </View>
                  <Text style={styles.heroCity}>{user.city}</Text>
                  {/* Photo count pill */}
                  {photos.length > 1 && (
                    <View style={styles.photoCountPill}>
                      <Text style={styles.photoCountText}>
                        {photoIndex + 1} / {photos.length}
                      </Text>
                    </View>
                  )}
                </View>
              </>
            );
          })()}
        </Animated.View>

        <Animated.View
          style={[
            styles.content,
            {
              opacity: contentAnim,
              transform: [
                {
                  translateY: contentAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [16, 0],
                  }),
                },
              ],
            },
          ]}
        >
          {/* ── Trust badge ── */}
          <View style={styles.trustRow}>
            <TrustBadge trustProfile={user.trustProfile} size="md" lang={lang} />
            {user.isOnline && (
              <View style={[styles.onlinePill, { backgroundColor: "#E6F9EE" }]}>
                <View style={[styles.onlineDot, { backgroundColor: colors.green }]} />
                <Text style={[styles.onlineText, { color: colors.green }]}>
                  {lang === "ko" ? "지금 온라인" : "今オンライン"}
                </Text>
              </View>
            )}
          </View>

          {/* ── Language level ── */}
          {user.studyingLanguage && user.languageLevel && (
            <View style={[styles.studyBadge, { backgroundColor: "#EBF7EF", borderColor: "#AEEDC8" }]}>
              <FIcon name="globe" size={13} color="#1A7A4A" />
              <Text style={[styles.studyText, { color: "#1A7A4A" }]}>
                {lang === "ko"
                  ? `${user.country === "JP" ? "한국어" : "일본어"} 공부 중 · ${levelLabel[user.languageLevel]}`
                  : `${user.country === "JP" ? "韓国語" : "日本語"}勉強中 · ${levelLabel[user.languageLevel]}`}
              </Text>
            </View>
          )}

          {/* ── Bio ── */}
          {user.bio ? (
            <View style={[styles.section, { borderColor: colors.border }]}>
              <Text style={[styles.sectionLabel, { color: colors.charcoalLight }]}>
                {lang === "ko" ? "소개" : "自己紹介"}
              </Text>
              <Text style={[styles.bioText, { color: colors.charcoal }]}>{user.bio}</Text>
            </View>
          ) : null}

          {/* ── Interests ── */}
          {user.interests && user.interests.length > 0 && (
            <View style={[styles.section, { borderColor: colors.border }]}>
              <Text style={[styles.sectionLabel, { color: colors.charcoalLight }]}>
                {lang === "ko" ? "관심사" : "趣味・興味"}
              </Text>
              <View style={styles.interestChips}>
                {user.interests.map((interest) => (
                  <View
                    key={interest}
                    style={[styles.interestChip, { backgroundColor: colors.roseLight, borderColor: colors.roseSoft }]}
                  >
                    <Text style={[styles.interestText, { color: colors.rose }]}>
                      {translateInterest(interest, lang)}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* ── Lifestyle ── */}
          {(user.smoking || user.drinking) && (
            <View style={[styles.section, { borderColor: colors.border }]}>
              <Text style={[styles.sectionLabel, { color: colors.charcoalLight }]}>
                {lang === "ko" ? "라이프스타일" : "ライフスタイル"}
              </Text>
              <View style={styles.lifestyleGrid}>
                {user.smoking && user.smoking !== "prefer_not_to_say" && (
                  <View style={[styles.lifestyleItem, { backgroundColor: colors.muted, borderColor: colors.border }]}>
                    <Text style={[styles.lifestyleItemLabel, { color: colors.charcoalLight }]}>
                      {lang === "ko" ? "흡연" : "喫煙"}
                    </Text>
                    <Text style={[styles.lifestyleItemValue, { color: colors.charcoalMid }]}>
                      {user.smoking === "never"
                        ? lang === "ko" ? "안 함" : "しない"
                        : user.smoking === "socially"
                        ? lang === "ko" ? "가끔" : "たまに"
                        : lang === "ko" ? "자주" : "よくする"}
                    </Text>
                  </View>
                )}
                {user.drinking && user.drinking !== "prefer_not_to_say" && (
                  <View style={[styles.lifestyleItem, { backgroundColor: colors.muted, borderColor: colors.border }]}>
                    <Text style={[styles.lifestyleItemLabel, { color: colors.charcoalLight }]}>
                      {lang === "ko" ? "음주" : "飲酒"}
                    </Text>
                    <Text style={[styles.lifestyleItemValue, { color: colors.charcoalMid }]}>
                      {user.drinking === "never"
                        ? lang === "ko" ? "안 함" : "しない"
                        : user.drinking === "socially"
                        ? lang === "ko" ? "가끔" : "たまに"
                        : lang === "ko" ? "자주" : "よく飲む"}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* ── Compatibility reasons ── */}
          {user.compatibilityReasons && user.compatibilityReasons.length > 0 && (
            <View style={[styles.section, { borderColor: colors.border }]}>
              <Text style={[styles.sectionLabel, { color: colors.charcoalLight }]}>
                {lang === "ko" ? "AI 매칭 포인트" : "AIマッチングポイント"}
              </Text>
              {user.compatibilityReasons.map((reason, i) => (
                <View key={i} style={styles.reasonRow}>
                  <FIcon name="check-circle" size={13} color={colors.rose} />
                  <Text style={[styles.reasonText, { color: colors.charcoal }]}>{reason}</Text>
                </View>
              ))}
            </View>
          )}
        </Animated.View>
      </ScrollView>

      {/* ── Bottom CTA — slides up on mount ── */}
      <Animated.View
        style={[
          styles.footer,
          {
            paddingBottom: bottomPad + 12,
            backgroundColor: colors.surface,
            borderTopColor: colors.border,
            transform: [{ translateY: footerAnim }],
          },
        ]}
      >
        {hasConv ? (
          <TouchableOpacity
            style={[styles.ctaBtn, { backgroundColor: colors.rose }]}
            onPress={() => router.push(`/chat/${convId}` as any)}
          >
            <FIcon name="message-circle" size={18} color="#fff" />
            <Text style={styles.ctaBtnText}>
              {lang === "ko" ? "대화 계속하기" : "チャットを続ける"}
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={[styles.ctaBtn, { backgroundColor: colors.muted }]}>
            <FIcon name="heart" size={18} color={colors.charcoalLight} />
            <Text style={[styles.ctaBtnText, { color: colors.charcoalLight }]}>
              {lang === "ko" ? "발견 탭에서 매칭하세요" : "発見タブでマッチングしましょう"}
            </Text>
          </View>
        )}

        {/* Secondary actions: report & block */}
        <View style={styles.secondaryActions}>
          <TouchableOpacity
            style={[styles.secondaryBtn, { borderColor: colors.border }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              router.push(
                `/report-user?userId=${user.id}&nickname=${encodeURIComponent(user.nickname)}` as any
              );
            }}
          >
            <FIcon name="flag" size={13} color="#C05020" />
            <Text style={[styles.secondaryBtnText, { color: "#C05020" }]}>
              {lang === "ko" ? "신고" : "通報"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.secondaryBtn, { borderColor: colors.border }]}
            onPress={() => {
              Alert.alert(
                lang === "ko" ? "차단하기" : "ブロックする",
                lang === "ko"
                  ? `${user.nickname}을(를) 차단하면 더 이상 보이지 않아요. 계속할까요?`
                  : `${user.nickname}をブロックすると表示されなくなります。続けますか？`,
                [
                  { text: lang === "ko" ? "취소" : "キャンセル", style: "cancel" },
                  {
                    text: lang === "ko" ? "차단" : "ブロック",
                    style: "destructive",
                    onPress: () => {
                      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                      blockUser(user.id);
                      router.back();
                    },
                  },
                ]
              );
            }}
          >
            <FIcon name="slash" size={13} color="#C0392B" />
            <Text style={[styles.secondaryBtnText, { color: "#C0392B" }]}>
              {lang === "ko" ? "차단" : "ブロック"}
            </Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  backBtn: {
    position: "absolute",
    left: 16,
    zIndex: 10,
  },
  reportBtn: {
    position: "absolute",
    right: 16,
    zIndex: 10,
  },
  backBtnBg: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  heroWrap: {
    position: "relative",
    height: HERO_H,
    overflow: "hidden",
  },
  photoDots: {
    position: "absolute",
    top: 14,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 5,
    zIndex: 5,
  },
  photoDot: {
    height: 4,
    borderRadius: 2,
    backgroundColor: "#fff",
  },
  photoCountPill: {
    marginTop: 6,
    alignSelf: "flex-start",
    backgroundColor: "rgba(0,0,0,0.4)",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  photoCountText: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    color: "rgba(255,255,255,0.9)",
  },
  heroInfo: {
    position: "absolute",
    bottom: 16,
    left: 16,
    right: 16,
  },
  heroNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  heroName: {
    fontFamily: "Inter_700Bold",
    fontSize: 26,
    color: "#fff",
  },
  heroAge: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 20,
    color: "rgba(255,255,255,0.85)",
  },
  heroCity: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: "rgba(255,255,255,0.75)",
    marginTop: 2,
  },
  content: {
    padding: 16,
    gap: 0,
  },
  trustRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
    marginTop: 4,
  },
  onlinePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  onlineDot: { width: 6, height: 6, borderRadius: 3 },
  onlineText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
  },
  studyBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    alignSelf: "flex-start",
    marginBottom: 14,
  },
  studyText: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
  },
  section: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 14,
    paddingBottom: 10,
    marginBottom: 2,
    gap: 8,
  },
  sectionLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    letterSpacing: 0.8,
  },
  bioText: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    lineHeight: 22,
  },
  interestChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
  },
  interestChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  interestText: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
  },
  lifestyleGrid: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  lifestyleItem: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    minWidth: 90,
    alignItems: "center",
  },
  lifestyleItemLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    letterSpacing: 0.4,
    marginBottom: 2,
  },
  lifestyleItemValue: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
  },
  reasonRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  reasonText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    flex: 1,
    lineHeight: 19,
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  ctaBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 14,
  },
  ctaBtnText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: "#fff",
  },
  secondaryActions: {
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
  },
  secondaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  secondaryBtnText: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
  },
  notFound: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  notFoundText: {
    fontFamily: "Inter_400Regular",
    fontSize: 15,
  },
});
