import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Clipboard,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useGrowth } from "@/context/GrowthContext";
import { useColors } from "@/hooks/useColors";
import { useLocale } from "@/hooks/useLocale";
import { unclaimedRewards } from "@/services/referral";
import { ReferralReward } from "@/types/growth";

// ── Reward card ───────────────────────────────────────────────────────────────

function RewardCard({ reward }: { reward: ReferralReward }) {
  const colors = useColors();
  const { claimReferralReward } = useGrowth();
  const { lang } = useLocale();

  const icon =
    reward.type === "boost"
      ? "zap"
      : reward.type === "direct_intro"
      ? "send"
      : reward.type === "premium_trial_7d"
      ? "star"
      : "heart";

  const label =
    reward.type === "boost"
      ? lang === "ko" ? `부스트 ${reward.amount}개` : `ブースト${reward.amount}個`
      : reward.type === "direct_intro"
      ? lang === "ko" ? `다이렉트 인트로 ${reward.amount}회` : `ダイレクトイントロ${reward.amount}回`
      : reward.type === "premium_trial_7d"
      ? lang === "ko" ? "7일 Premium 체험" : "7日間Premium体験"
      : lang === "ko" ? `보너스 좋아요 ${reward.amount}개` : `ボーナスいいね${reward.amount}個`;

  return (
    <View style={[styles.rewardCard, { backgroundColor: colors.white, borderColor: colors.border }]}>
      <View style={[styles.rewardIcon, { backgroundColor: colors.roseLight }]}>
        <Feather name={icon as any} size={18} color={colors.rose} />
      </View>
      <View style={styles.rewardInfo}>
        <Text style={[styles.rewardLabel, { color: colors.charcoal }]}>{label}</Text>
        <Text style={[styles.rewardReason, { color: colors.charcoalLight }]}>{reward.reason}</Text>
      </View>
      <TouchableOpacity
        style={[styles.claimBtn, { backgroundColor: colors.rose }]}
        onPress={() => claimReferralReward(reward.id)}
      >
        <Text style={styles.claimBtnText}>
          {lang === "ko" ? "받기" : "受け取る"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

// ── ReferralScreen ────────────────────────────────────────────────────────────

export default function ReferralScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { referral, getReferralLink, applyReferralCode, simulateReferralSuccess, track } = useGrowth();
  const { lang } = useLocale();

  const [codeInput, setCodeInput] = useState("");
  const [codeApplied, setCodeApplied] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const link = getReferralLink();
  const pending = unclaimedRewards(referral);

  const copyCode = () => {
    Clipboard.setString(link);
    setCodeCopied(true);
    track("referral_code_shared", { code: referral.myCode });
    setTimeout(() => setCodeCopied(false), 2000);
  };

  const handleApplyCode = () => {
    const clean = codeInput.trim().toUpperCase();
    if (!clean) return;
    const ok = applyReferralCode(clean);
    if (ok) {
      setCodeApplied(true);
      setCodeInput("");
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <LinearGradient
        colors={["#FFF0F3", colors.background]}
        style={[styles.header, { paddingTop: topPad + 14 }]}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={20} color={colors.charcoal} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: colors.charcoal }]}>
            {lang === "ko" ? "친구 초대" : "友達招待"}
          </Text>
          <Text style={[styles.headerSub, { color: colors.charcoalLight }]}>
            {lang === "ko" ? "초대하면 둘 다 보상을 받아요 🎁" : "招待するとお互いに特典があります 🎁"}
          </Text>
        </View>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: bottomPad + 40 }]}
        showsVerticalScrollIndicator={false}
      >

        {/* ── Stats ──────────────────────────────────────────────────────── */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: colors.white, borderColor: colors.border }]}>
            <Text style={[styles.statNum, { color: colors.rose }]}>
              {referral.successfulReferrals}
            </Text>
            <Text style={[styles.statLabel, { color: colors.charcoalLight }]}>
              {lang === "ko" ? "성공한 초대" : "招待成功"}
            </Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.white, borderColor: colors.border }]}>
            <Text style={[styles.statNum, { color: colors.charcoalMid }]}>
              {referral.pendingReferrals}
            </Text>
            <Text style={[styles.statLabel, { color: colors.charcoalLight }]}>
              {lang === "ko" ? "대기 중" : "保留中"}
            </Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.white, borderColor: colors.border }]}>
            <Text style={[styles.statNum, { color: "#1A7A4A" }]}>
              {referral.rewards.length}
            </Text>
            <Text style={[styles.statLabel, { color: colors.charcoalLight }]}>
              {lang === "ko" ? "받은 보상" : "獲得特典"}
            </Text>
          </View>
        </View>

        {/* ── My code ────────────────────────────────────────────────────── */}
        <View style={[styles.section, { backgroundColor: colors.white, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.charcoal }]}>
            {lang === "ko" ? "내 초대 링크" : "私の招待リンク"}
          </Text>
          <Text style={[styles.sectionSub, { color: colors.charcoalLight }]}>
            {lang === "ko"
              ? "친구가 이 링크로 가입하면 둘 다 보상을 받아요"
              : "友達がこのリンクから登録するとお互いに特典があります"}
          </Text>
          <View style={[styles.codeBox, { backgroundColor: colors.roseLight, borderColor: colors.roseSoft }]}>
            <Text style={[styles.codeText, { color: colors.rose }]}>
              {referral.myCode}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.copyBtn, { backgroundColor: codeCopied ? "#EFFAF4" : colors.rose }]}
            onPress={copyCode}
          >
            <Feather
              name={codeCopied ? "check" : "copy"}
              size={15}
              color={codeCopied ? "#1A7A4A" : "#fff"}
            />
            <Text style={[styles.copyBtnText, { color: codeCopied ? "#1A7A4A" : "#fff" }]}>
              {codeCopied
                ? (lang === "ko" ? "복사됨!" : "コピーしました!")
                : (lang === "ko" ? "링크 복사하기" : "リンクをコピー")}
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── Pending rewards ─────────────────────────────────────────────── */}
        {pending.length > 0 && (
          <View style={styles.rewardsSection}>
            <Text style={[styles.rewardsSectionTitle, { color: colors.charcoal }]}>
              🎁 {lang === "ko" ? "받을 수 있는 보상" : "受け取れる特典"}
            </Text>
            {pending.map((r) => (
              <RewardCard key={r.id} reward={r} />
            ))}
          </View>
        )}

        {/* ── Apply referral code ─────────────────────────────────────────── */}
        {!referral.referredBy && (
          <View style={[styles.section, { backgroundColor: colors.white, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.charcoal }]}>
              {lang === "ko" ? "친구 코드 입력" : "招待コードを入力"}
            </Text>
            {codeApplied ? (
              <View style={styles.appliedRow}>
                <Feather name="check-circle" size={16} color="#1A7A4A" />
                <Text style={{ color: "#1A7A4A", fontFamily: "Inter_500Medium", fontSize: 14 }}>
                  {lang === "ko" ? "코드가 적용됐어요!" : "コードが適用されました！"}
                </Text>
              </View>
            ) : (
              <View style={styles.applyRow}>
                <TextInput
                  style={[styles.codeInput, { backgroundColor: colors.muted, borderColor: colors.border, color: colors.charcoal }]}
                  value={codeInput}
                  onChangeText={(t) => setCodeInput(t.toUpperCase())}
                  placeholder={lang === "ko" ? "친구 코드 입력" : "招待コードを入力"}
                  placeholderTextColor={colors.charcoalLight}
                  autoCapitalize="characters"
                  maxLength={10}
                />
                <TouchableOpacity
                  style={[styles.applyBtn, { backgroundColor: codeInput.trim() ? colors.rose : colors.muted }]}
                  onPress={handleApplyCode}
                  disabled={!codeInput.trim()}
                >
                  <Text style={[styles.applyBtnText, { color: codeInput.trim() ? "#fff" : colors.charcoalLight }]}>
                    {lang === "ko" ? "적용" : "適用"}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* ── Dev: simulate referral (dev only hint) ─────────────────────── */}
        {__DEV__ && (
          <TouchableOpacity
            style={[styles.devBtn, { borderColor: colors.border }]}
            onPress={simulateReferralSuccess}
          >
            <Text style={[styles.devBtnText, { color: colors.charcoalLight }]}>
              [DEV] Simulate referral success
            </Text>
          </TouchableOpacity>
        )}

        {/* ── Reward explanation ──────────────────────────────────────────── */}
        <View style={[styles.explainer, { backgroundColor: colors.white, borderColor: colors.border }]}>
          <Text style={[styles.explainerTitle, { color: colors.charcoal }]}>
            {lang === "ko" ? "보상 방식" : "特典の仕組み"}
          </Text>
          {[
            {
              step: "1",
              text:
                lang === "ko"
                  ? "친구가 내 링크로 가입 → 부스트 1개 지급"
                  : "友達がリンクから登録 → ブースト1個付与",
            },
            {
              step: "2",
              text:
                lang === "ko"
                  ? "친구가 첫 매칭 성공 → 다이렉트 인트로 1회 지급"
                  : "友達が最初のマッチング → ダイレクトイントロ1回付与",
            },
          ].map((item) => (
            <View key={item.step} style={styles.explainerRow}>
              <View style={[styles.stepDot, { backgroundColor: colors.rose }]}>
                <Text style={styles.stepDotText}>{item.step}</Text>
              </View>
              <Text style={[styles.explainerText, { color: colors.charcoalMid }]}>
                {item.text}
              </Text>
            </View>
          ))}
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
    paddingHorizontal: 20,
    paddingBottom: 16,
    gap: 12,
  },
  backBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontFamily: "Inter_700Bold", fontSize: 22 },
  headerSub: { fontFamily: "Inter_400Regular", fontSize: 13, marginTop: 1 },

  scroll: { paddingHorizontal: 20, paddingTop: 12, gap: 14 },

  statsRow: { flexDirection: "row", gap: 10 },
  statCard: {
    flex: 1,
    borderRadius: 14,
    padding: 14,
    alignItems: "center",
    borderWidth: 1,
  },
  statNum: { fontFamily: "Inter_700Bold", fontSize: 28, marginBottom: 2 },
  statLabel: { fontFamily: "Inter_400Regular", fontSize: 11, textAlign: "center" },

  section: {
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    gap: 10,
  },
  sectionTitle: { fontFamily: "Inter_700Bold", fontSize: 17 },
  sectionSub: { fontFamily: "Inter_400Regular", fontSize: 13, lineHeight: 19 },
  codeBox: {
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 14,
    alignItems: "center",
  },
  codeText: { fontFamily: "Inter_700Bold", fontSize: 22, letterSpacing: 2 },
  copyBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 100,
    paddingVertical: 14,
  },
  copyBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 15 },

  rewardsSection: { gap: 10 },
  rewardsSectionTitle: { fontFamily: "Inter_700Bold", fontSize: 16 },
  rewardCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    gap: 12,
  },
  rewardIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  rewardInfo: { flex: 1 },
  rewardLabel: { fontFamily: "Inter_600SemiBold", fontSize: 14, marginBottom: 2 },
  rewardReason: { fontFamily: "Inter_400Regular", fontSize: 12 },
  claimBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  claimBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: "#fff" },

  appliedRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  applyRow: { flexDirection: "row", gap: 10 },
  codeInput: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    letterSpacing: 1,
  },
  applyBtn: {
    paddingHorizontal: 20,
    borderRadius: 12,
    justifyContent: "center",
  },
  applyBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 15 },

  devBtn: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
    borderStyle: "dashed",
  },
  devBtnText: { fontFamily: "Inter_400Regular", fontSize: 12 },

  explainer: { borderRadius: 18, padding: 18, borderWidth: 1, gap: 12 },
  explainerTitle: { fontFamily: "Inter_700Bold", fontSize: 15 },
  explainerRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  stepDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  stepDotText: { fontFamily: "Inter_700Bold", fontSize: 11, color: "#fff" },
  explainerText: { fontFamily: "Inter_400Regular", fontSize: 13.5, lineHeight: 20, flex: 1 },
});
