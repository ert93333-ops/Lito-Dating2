import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, { FadeIn, FadeInUp, FadeInRight } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import FIcon from "@/components/FIcon";
import { useApp, DatingStyleAnswers } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

// ── Types ─────────────────────────────────────────────────────────────────────

type Step = "intro" | number | "complete";

interface Question {
  key: keyof DatingStyleAnswers;
  ko: string;
  ja: string;
  hintKo: string;
  hintJa: string;
  options: { ko: string; ja: string; value: string }[];
}

// ── Questions ────────────────────────────────────────────────────────────────

const QUESTIONS: Question[] = [
  {
    key: "pace",
    ko: "마음에 드는 사람을 만나면\n얼마나 빨리 가까워지고 싶나요?",
    ja: "気になる人に出会ったとき\nどのくらいのペースで近づきたいですか？",
    hintKo: "답변이 매칭 정확도를 높여드려요",
    hintJa: "回答がマッチングの精度を上げます",
    options: [
      { ko: "빠르게 친해지고 싶어요", ja: "すぐに仲良くなりたい", value: "fast" },
      { ko: "몇 번 만나고 나서요", ja: "何度か会ってから", value: "medium" },
      { ko: "천천히 알아가는 게 좋아요", ja: "ゆっくり知り合いたい", value: "slow" },
    ],
  },
  {
    key: "reply_style",
    ko: "메시지를 주고받는 스타일이\n어떻게 되나요?",
    ja: "メッセージのやりとりスタイルは\nどちらに近いですか？",
    hintKo: "AI가 대화 타이밍을 더 잘 분석해드려요",
    hintJa: "AIが会話のタイミングをより正確に分析します",
    options: [
      { ko: "자주, 빠르게 주고받아요", ja: "頻繁に、すぐ返信する", value: "frequent" },
      { ko: "시간 날 때 답장해요", ja: "時間があるときに返信する", value: "medium" },
      { ko: "꼭 필요할 때만 연락해요", ja: "必要なときだけ連絡する", value: "minimal" },
    ],
  },
  {
    key: "expression",
    ko: "관심이 생기면 보통\n어떻게 표현하나요?",
    ja: "気になる人への関心を\nどのように表現しますか？",
    hintKo: "AI 코칭이 더 세밀해져요",
    hintJa: "AIコーチングがより細かくなります",
    options: [
      { ko: "직접적으로 표현해요", ja: "はっきり伝える", value: "direct" },
      { ko: "조심스럽게 표현해요", ja: "そっと伝える", value: "careful" },
      { ko: "먼저 드러내는 건 드물어요", ja: "自分からはあまり見せない", value: "reserved" },
    ],
  },
  {
    key: "dating_style",
    ko: "어떤 스타일의 데이트를\n선호하나요?",
    ja: "どんなスタイルのデートが\n好きですか？",
    hintKo: "거의 다 왔어요",
    hintJa: "もうすぐです",
    options: [
      { ko: "계획적이고 잘 준비된 데이트", ja: "計画的でしっかり準備したデート", value: "planned" },
      { ko: "간단한 계획 후 자유롭게", ja: "軽くプランを立てて柔軟に", value: "flexible" },
      { ko: "즉흥적으로 자유롭게", ja: "自由気ままにアドリブで", value: "spontaneous" },
    ],
  },
  {
    key: "relationship_goal",
    ko: "지금 어떤 관계를\n원하고 있나요?",
    ja: "今どんな関係を\n求めていますか？",
    hintKo: "매칭 추천이 더 정확해져요",
    hintJa: "マッチング推薦がより正確になります",
    options: [
      { ko: "진지한 관계를 원해요", ja: "真剣な関係がほしい", value: "serious" },
      { ko: "가볍게 시작하고 싶어요", ja: "軽く始めたい", value: "casual" },
      { ko: "아직 잘 모르겠어요", ja: "まだわからない", value: "unsure" },
    ],
  },
  {
    key: "privacy",
    ko: "개인 연락처는 언제\n교환해도 괜찮다고 생각하나요?",
    ja: "個人の連絡先はいつ\n交換してもいいと思いますか？",
    hintKo: "마지막 질문이에요",
    hintJa: "最後の質問です",
    options: [
      { ko: "비교적 일찍도 괜찮아요", ja: "比較的早くてもいい", value: "early" },
      { ko: "어느 정도 친해진 후에요", ja: "ある程度仲良くなってから", value: "medium" },
      { ko: "충분히 신뢰가 쌓인 후에요", ja: "十分な信頼が築けてから", value: "high" },
    ],
  },
];

const HINT_GENERIC = [
  { ko: "답변이 매칭 정확도를 높여드려요", ja: "回答がマッチングの精度を上げます" },
  { ko: "AI가 대화 타이밍을 더 잘 분석해드려요", ja: "AIが会話のタイミングをより正確に分析します" },
  { ko: "AI 코칭이 더 세밀해져요", ja: "AIコーチングがより細かくなります" },
  { ko: "거의 다 왔어요", ja: "もうすぐです" },
  { ko: "매칭 추천이 더 정확해져요", ja: "マッチング推薦がより正確になります" },
  { ko: "마지막 질문이에요", ja: "最後の質問です" },
];

// ── Main screen ───────────────────────────────────────────────────────────────

export default function DiagnosisScreen() {
  const { completeDiagnosis, skipDiagnosis, markDiagnosisSeen, diagnosisRewardClaimed, profile } = useApp();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ from?: string }>();
  const fromProfile = params.from === "profile";

  const lang = profile.language === "ja" ? "ja" : "ko";

  const [step, setStep] = useState<Step>("intro");
  const [answers, setAnswers] = useState<Partial<DatingStyleAnswers>>({});
  const [showSkipModal, setShowSkipModal] = useState(false);

  const topPad = Platform.OS === "web" ? 56 : insets.top;
  const botPad = Platform.OS === "web" ? 28 : insets.bottom;

  function goNext() {
    if (step === "intro") {
      setStep(0);
    } else if (typeof step === "number") {
      if (step < QUESTIONS.length - 1) {
        setStep(step + 1);
      } else {
        const full: DatingStyleAnswers = {
          pace: answers.pace ?? null,
          reply_style: answers.reply_style ?? null,
          expression: answers.expression ?? null,
          dating_style: answers.dating_style ?? null,
          relationship_goal: answers.relationship_goal ?? null,
          privacy: answers.privacy ?? null,
        };
        completeDiagnosis(full);
        setStep("complete");
      }
    }
  }

  function handleAnswer(key: keyof DatingStyleAnswers, value: string) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setAnswers((prev) => ({ ...prev, [key]: value }));
    setTimeout(() => goNext(), 280);
  }

  function handleSkipConfirm() {
    setShowSkipModal(false);
    skipDiagnosis();
    markDiagnosisSeen();
    if (fromProfile) {
      router.back();
    } else {
      router.replace("/(tabs)/discover");
    }
  }

  function handleComplete(goProfile: boolean) {
    markDiagnosisSeen();
    if (goProfile) {
      router.replace("/(tabs)/profile");
    } else {
      router.replace("/(tabs)/discover");
    }
  }

  const accentColor = "#C84B72";
  const accentLight = "#FCEEF3";

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Skip confirmation modal */}
      <Modal transparent visible={showSkipModal} animationType="fade" onRequestClose={() => setShowSkipModal(false)}>
        <View style={styles.modalOverlay}>
          <Animated.View entering={FadeInUp.duration(200)} style={[styles.modalCard, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.charcoal }]}>
              {lang === "ko" ? "나중에 할까요?" : "後でやりますか？"}
            </Text>
            <Text style={[styles.modalBody, { color: colors.charcoalLight }]}>
              {lang === "ko"
                ? "지금 건너뛸 수 있어요.\n\n하지만 연애 스타일 진단을 완료하면 매칭 추천과 AI 코칭이 더 정확해져요.\n\n완료 시 AI 코칭 티켓 1장을 드려요.\n\n프로필 메뉴에서 언제든지 다시 할 수 있어요."
                : "今はスキップできます。\n\nでも、恋愛スタイル診断を完了すると、マッチング推薦とAIコーチングがより正確になります。\n\n完了するとAIコーチングチケットを1枚プレゼントします。\n\nプロフィールメニューからいつでも再開できます。"}
            </Text>
            <TouchableOpacity
              style={[styles.modalPrimary, { backgroundColor: accentColor }]}
              onPress={() => setShowSkipModal(false)}
            >
              <Text style={styles.modalPrimaryText}>
                {lang === "ko" ? "계속하기" : "続ける"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalSecondary} onPress={handleSkipConfirm}>
              <Text style={[styles.modalSecondaryText, { color: colors.charcoalLight }]}>
                {lang === "ko" ? "나중에 할게요" : "後でやる"}
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Modal>

      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 8 }]}>
        {(fromProfile || step !== "intro") ? (
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={() => {
              if (step === "intro" || step === "complete") {
                router.back();
              } else if (typeof step === "number" && step > 0) {
                setStep(step - 1);
              } else {
                setStep("intro");
              }
            }}
          >
            <FIcon name="arrow-left" size={22} color={colors.charcoal} />
          </TouchableOpacity>
        ) : (
          <View style={styles.headerBtn} />
        )}

        {step !== "complete" && step !== "intro" && (
          <Text style={[styles.stepLabel, { color: colors.charcoalLight }]}>
            {typeof step === "number" ? `${step + 1} / ${QUESTIONS.length}` : ""}
          </Text>
        )}

        {step !== "complete" ? (
          <TouchableOpacity style={styles.headerBtn} onPress={() => setShowSkipModal(true)}>
            <Text style={[styles.skipText, { color: colors.charcoalLight }]}>
              {lang === "ko" ? "건너뛰기" : "スキップ"}
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.headerBtn} />
        )}
      </View>

      {/* Content */}
      {step === "intro" && (
        <Animated.View entering={FadeIn.duration(300)} style={[styles.content, { paddingBottom: botPad + 24 }]}>
          <ScrollView contentContainerStyle={styles.introScroll} showsVerticalScrollIndicator={false}>
            <LinearGradient
              colors={["#FCEEF3", "#F4E2FF"]}
              style={styles.introBadge}
            >
              <FIcon name="heart" size={32} color={accentColor} />
            </LinearGradient>

            <Animated.Text entering={FadeInUp.delay(80).duration(380)} style={[styles.introTitle, { color: colors.charcoal }]}>
              {lang === "ko"
                ? "6가지 질문으로\n더 나은 매칭을 만들어요"
                : "6つの質問で\nより良いマッチングを実現"}
            </Animated.Text>

            <Animated.View entering={FadeInUp.delay(160).duration(380)} style={[styles.benefitRow, { backgroundColor: accentLight }]}>
              <FIcon name="zap" size={16} color={accentColor} />
              <Text style={[styles.benefitText, { color: colors.charcoal }]}>
                {lang === "ko"
                  ? "AI가 매칭 궁합, 대화 타이밍, 관심도를 더 정확하게 분석해요"
                  : "AIがマッチング相性・会話タイミング・関心度をより正確に分析します"}
              </Text>
            </Animated.View>

            <Animated.View entering={FadeInUp.delay(220).duration(380)} style={[styles.benefitRow, { backgroundColor: "#EEF4FF" }]}>
              <FIcon name="cpu" size={16} color="#3B6FD4" />
              <Text style={[styles.benefitText, { color: colors.charcoal }]}>
                {lang === "ko"
                  ? "AI 코칭이 더 세밀하고 정확한 조언을 제공해요"
                  : "AIコーチングがより詳細で正確なアドバイスを提供します"}
              </Text>
            </Animated.View>

            <Animated.View entering={FadeInUp.delay(280).duration(380)} style={[styles.rewardBanner, { borderColor: accentColor + "40" }]}>
              <Text style={[styles.rewardEmoji, { color: accentColor }]}>+1</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.rewardTitle, { color: colors.charcoal }]}>
                  {lang === "ko" ? "AI 코칭 티켓 1장 증정" : "AIコーチングチケット1枚プレゼント"}
                </Text>
                <Text style={[styles.rewardSub, { color: colors.charcoalLight }]}>
                  {lang === "ko" ? "완료하면 바로 지급돼요" : "完了するとすぐに付与されます"}
                </Text>
              </View>
            </Animated.View>

            <Animated.View entering={FadeInUp.delay(340).duration(380)} style={styles.introActions}>
              <TouchableOpacity
                style={[styles.startBtn, { backgroundColor: accentColor }]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
                  setStep(0);
                }}
              >
                <Text style={styles.startBtnText}>
                  {lang === "ko" ? "진단 시작하기" : "診断を始める"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.skipBtnLarge} onPress={() => setShowSkipModal(true)}>
                <Text style={[styles.skipBtnLargeText, { color: colors.charcoalLight }]}>
                  {lang === "ko" ? "나중에 할게요" : "後でやる"}
                </Text>
              </TouchableOpacity>
            </Animated.View>
          </ScrollView>
        </Animated.View>
      )}

      {typeof step === "number" && step < QUESTIONS.length && (
        <Animated.View
          key={`q-${step}`}
          entering={FadeInRight.duration(280)}
          style={[styles.content, { paddingBottom: botPad + 24 }]}
        >
          {/* Progress bar */}
          <View style={[styles.progressBarBg, { backgroundColor: colors.border }]}>
            <View
              style={[
                styles.progressBarFill,
                {
                  backgroundColor: accentColor,
                  width: `${((step + 1) / QUESTIONS.length) * 100}%`,
                },
              ]}
            />
          </View>

          <Text style={[styles.progressHint, { color: colors.charcoalLight }]}>
            {lang === "ko"
              ? QUESTIONS[step].hintKo
              : QUESTIONS[step].hintJa}
          </Text>

          <ScrollView contentContainerStyle={styles.questionScroll} showsVerticalScrollIndicator={false}>
            <Text style={[styles.questionText, { color: colors.charcoal }]}>
              {lang === "ko" ? QUESTIONS[step].ko : QUESTIONS[step].ja}
            </Text>

            <View style={styles.optionList}>
              {QUESTIONS[step].options.map((opt, i) => {
                const selected = answers[QUESTIONS[step].key] === opt.value;
                return (
                  <Animated.View key={opt.value} entering={FadeInUp.delay(i * 60).duration(280)}>
                    <TouchableOpacity
                      style={[
                        styles.optionBtn,
                        {
                          borderColor: selected ? accentColor : colors.border,
                          backgroundColor: selected ? accentLight : colors.surface,
                        },
                      ]}
                      onPress={() => handleAnswer(QUESTIONS[step].key, opt.value)}
                      activeOpacity={0.7}
                    >
                      <View style={[
                        styles.optionRadio,
                        {
                          borderColor: selected ? accentColor : colors.charcoalFaint,
                          backgroundColor: selected ? accentColor : "transparent",
                        },
                      ]}>
                        {selected && <FIcon name="check" size={11} color="#fff" />}
                      </View>
                      <Text style={[
                        styles.optionText,
                        { color: selected ? accentColor : colors.charcoal },
                      ]}>
                        {lang === "ko" ? opt.ko : opt.ja}
                      </Text>
                    </TouchableOpacity>
                  </Animated.View>
                );
              })}
            </View>
          </ScrollView>
        </Animated.View>
      )}

      {step === "complete" && (
        <Animated.View entering={FadeIn.duration(400)} style={[styles.content, { paddingBottom: botPad + 24 }]}>
          <ScrollView contentContainerStyle={styles.completeScroll} showsVerticalScrollIndicator={false}>
            <LinearGradient
              colors={["#FFF0F5", "#EDE8FF"]}
              style={styles.completeBadge}
            >
              <FIcon name="check-circle" size={40} color={accentColor} />
            </LinearGradient>

            <Text style={[styles.completeTitle, { color: colors.charcoal }]}>
              {lang === "ko" ? "진단 완료" : "診断完了"}
            </Text>

            <Text style={[styles.completeBody, { color: colors.charcoalLight }]}>
              {lang === "ko"
                ? "연애 스타일 프로필이 완성됐어요.\n\n앞으로 매칭 추천과 AI 코칭이 내 스타일에 맞게 개인화돼요."
                : "恋愛スタイルプロフィールが完成しました。\n\nこれからマッチング推薦とAIコーチングがあなたのスタイルに合わせてパーソナライズされます。"}
            </Text>

            {!diagnosisRewardClaimed && (
              <View style={[styles.rewardBannerLg, { borderColor: accentColor + "40", backgroundColor: accentLight }]}>
                <Text style={[styles.rewardEmoji, { color: accentColor, fontSize: 28 }]}>+1</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.rewardTitleLg, { color: accentColor }]}>
                    {lang === "ko" ? "AI 코칭 티켓 1장 지급됐어요!" : "AIコーチングチケットを1枚受け取りました！"}
                  </Text>
                  <Text style={[styles.rewardSub, { color: colors.charcoalLight }]}>
                    {lang === "ko" ? "프로필 코치에서 사용할 수 있어요" : "プロフィールコーチで使えます"}
                  </Text>
                </View>
              </View>
            )}

            <View style={styles.completeActions}>
              <TouchableOpacity
                style={[styles.startBtn, { backgroundColor: accentColor }]}
                onPress={() => handleComplete(false)}
              >
                <Text style={styles.startBtnText}>
                  {lang === "ko" ? "계속하기" : "続ける"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.skipBtnLarge} onPress={() => handleComplete(true)}>
                <Text style={[styles.skipBtnLargeText, { color: colors.charcoalLight }]}>
                  {lang === "ko" ? "프로필 보기" : "プロフィールを見る"}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </Animated.View>
      )}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1 },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  headerBtn: {
    width: 72,
    alignItems: "flex-start",
    justifyContent: "center",
  },
  stepLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    textAlign: "center",
  },
  skipText: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    textAlign: "right",
    width: 72,
  },

  content: { flex: 1 },

  // ── Intro ────────────────────────────────────────────────────────────────
  introScroll: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 16,
    alignItems: "center",
  },
  introBadge: {
    width: 96,
    height: 96,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 28,
    shadowColor: "#C84B72",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.14,
    shadowRadius: 16,
    elevation: 6,
  },
  introTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 26,
    textAlign: "center",
    lineHeight: 36,
    marginBottom: 28,
  },
  benefitRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    width: "100%",
  },
  benefitText: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    lineHeight: 21,
    flex: 1,
  },
  rewardBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 16,
    marginTop: 6,
    marginBottom: 32,
    width: "100%",
    backgroundColor: "#FFF8FB",
  },
  rewardEmoji: {
    fontFamily: "Inter_700Bold",
    fontSize: 22,
    color: "#C84B72",
    minWidth: 32,
    textAlign: "center",
  },
  rewardTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    marginBottom: 2,
  },
  rewardSub: {
    fontFamily: "Inter_400Regular",
    fontSize: 12.5,
  },
  introActions: { width: "100%", gap: 12 },

  startBtn: {
    width: "100%",
    borderRadius: 100,
    paddingVertical: 17,
    alignItems: "center",
    shadowColor: "#C84B72",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  startBtnText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 17,
    color: "#fff",
    letterSpacing: 0.1,
  },
  skipBtnLarge: {
    paddingVertical: 12,
    alignItems: "center",
  },
  skipBtnLargeText: {
    fontFamily: "Inter_400Regular",
    fontSize: 15,
  },

  // ── Progress bar ─────────────────────────────────────────────────────────
  progressBarBg: {
    height: 4,
    borderRadius: 2,
    marginHorizontal: 24,
    marginTop: 4,
    marginBottom: 8,
    overflow: "hidden",
  },
  progressBarFill: {
    height: 4,
    borderRadius: 2,
  },
  progressHint: {
    fontFamily: "Inter_400Regular",
    fontSize: 12.5,
    textAlign: "center",
    marginBottom: 8,
  },

  // ── Question ─────────────────────────────────────────────────────────────
  questionScroll: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 16,
  },
  questionText: {
    fontFamily: "Inter_700Bold",
    fontSize: 22,
    lineHeight: 32,
    marginBottom: 32,
  },
  optionList: { gap: 12 },
  optionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    paddingVertical: 18,
    paddingHorizontal: 18,
  },
  optionRadio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.8,
    alignItems: "center",
    justifyContent: "center",
  },
  optionText: {
    fontFamily: "Inter_500Medium",
    fontSize: 15.5,
    flex: 1,
    lineHeight: 22,
  },

  // ── Complete ─────────────────────────────────────────────────────────────
  completeScroll: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 16,
    alignItems: "center",
  },
  completeBadge: {
    width: 100,
    height: 100,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 28,
    shadowColor: "#C84B72",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
  },
  completeTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 28,
    marginBottom: 16,
  },
  completeBody: {
    fontFamily: "Inter_400Regular",
    fontSize: 15.5,
    lineHeight: 25,
    textAlign: "center",
    marginBottom: 28,
  },
  rewardBannerLg: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 18,
    marginBottom: 32,
    width: "100%",
  },
  rewardTitleLg: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    marginBottom: 3,
  },
  completeActions: { width: "100%", gap: 12 },

  // ── Modal ────────────────────────────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  modalCard: {
    borderRadius: 22,
    padding: 26,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 12,
  },
  modalTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 20,
    marginBottom: 14,
  },
  modalBody: {
    fontFamily: "Inter_400Regular",
    fontSize: 14.5,
    lineHeight: 23,
    marginBottom: 24,
  },
  modalPrimary: {
    borderRadius: 100,
    paddingVertical: 16,
    alignItems: "center",
    marginBottom: 10,
  },
  modalPrimaryText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
    color: "#fff",
  },
  modalSecondary: {
    paddingVertical: 10,
    alignItems: "center",
  },
  modalSecondaryText: {
    fontFamily: "Inter_400Regular",
    fontSize: 15,
  },
});
