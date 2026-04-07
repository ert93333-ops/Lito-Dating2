/**
 * verify-id.tsx — ID Verification screen
 *
 * This screen is fully STATUS-AWARE. It never marks a user as verified itself.
 * All verification state flows through TrustProfile.idVerified.status, which
 * is managed by the backend (Onfido / Jumio / Persona, etc.) when wired up.
 *
 * Status lifecycle handled here:
 *   not_verified      → "Why it matters" explanation + CTA to start
 *   pending_review    → "Under review" with submission timeline
 *   verified          → Success + badge preview + expiry
 *   rejected          → Reason + how to retry + CTA
 *   reverify_required → Why re-verification is needed + CTA
 *
 * IMPORTANT — this screen does NOT:
 *   - Mark the user as verified directly
 *   - Accept or upload documents itself
 *   - Fake any verification state
 *
 * The "Start verification" CTA currently shows a placeholder alert explaining
 * what would happen in production. Replace alert body with actual SDK navigation
 * (e.g. router.push("/verify-id/capture")) when an ID vendor is integrated.
 *
 * Distinction from Layer 1 (humanVerified):
 *   - Layer 1 = phone OTP + liveness → confirms you're a real person
 *   - Layer 3 (this screen) = government-issued document → confirms your identity
 */

import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { TrustBadge } from "@/components/TrustBadge";
import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import { useLocale } from "@/hooks/useLocale";
import type { TrustStatus } from "@/types";

// ── Status hero config ────────────────────────────────────────────────────────

type HeroConfig = {
  emoji: string;
  color: string;
  bg: string;
  titleKo: string;
  titleJa: string;
  subtitleKo: string;
  subtitleJa: string;
};

function getHeroConfig(status: TrustStatus): HeroConfig {
  switch (status) {
    case "verified":
      return {
        emoji: "✅",
        color: "#1A7A4A",
        bg: "#EFFAF4",
        titleKo: "신분증 인증 완료",
        titleJa: "本人確認書類 認証済み",
        subtitleKo: "신분증이 성공적으로 확인되었습니다.",
        subtitleJa: "身分証明書が正常に確認されました。",
      };
    case "pending_review":
      return {
        emoji: "⏳",
        color: "#3B6FD4",
        bg: "#EEF4FF",
        titleKo: "검토 중입니다",
        titleJa: "審査中です",
        subtitleKo: "제출한 서류를 확인하고 있어요. 잠시만 기다려 주세요.",
        subtitleJa: "提出書類を確認中です。しばらくお待ちください。",
      };
    case "rejected":
      return {
        emoji: "❌",
        color: "#C0392B",
        bg: "#FFF0EE",
        titleKo: "인증에 실패했습니다",
        titleJa: "認証に失敗しました",
        subtitleKo: "제출하신 서류에 문제가 있어 인증을 완료할 수 없었습니다.",
        subtitleJa: "提出された書類に問題があり、認証を完了できませんでした。",
      };
    case "reverify_required":
      return {
        emoji: "🔄",
        color: "#C05020",
        bg: "#FFF3ED",
        titleKo: "재인증이 필요합니다",
        titleJa: "再認証が必要です",
        subtitleKo: "이전 인증 조건이 변경되어 다시 인증해야 합니다.",
        subtitleJa: "以前の認証条件が変更されたため、再認証が必要です。",
      };
    case "not_verified":
    default:
      return {
        emoji: "🪪",
        color: "#B07D1A",
        bg: "#FFF8EC",
        titleKo: "신분증 인증",
        titleJa: "本人確認書類",
        subtitleKo: "여권이나 신분증으로 본인 확인을 완료하세요.",
        subtitleJa: "パスポートや身分証で本人確認を完了してください。",
      };
  }
}

// ── Rejection reason labels ───────────────────────────────────────────────────

function getRejectionLabel(reason: string | undefined, lang: "ko" | "ja"): string {
  const map: Record<string, { ko: string; ja: string }> = {
    document_unreadable: {
      ko: "서류 이미지가 너무 흐리거나 잘렸습니다.",
      ja: "書類の画像がぼやけているかトリミングされています。",
    },
    document_expired: {
      ko: "제출하신 신분증이 만료되었습니다.",
      ja: "提出された身分証明書の有効期限が切れています。",
    },
    name_mismatch: {
      ko: "서류의 이름이 프로필과 일치하지 않습니다.",
      ja: "書類の名前がプロフィールと一致しません。",
    },
    unsupported_document: {
      ko: "지원하지 않는 서류 종류입니다.",
      ja: "サポートされていない書類の種類です。",
    },
  };
  const entry = reason ? map[reason] : undefined;
  if (!entry) return lang === "ko" ? "알 수 없는 오류가 발생했습니다." : "不明なエラーが発生しました。";
  return lang === "ko" ? entry.ko : entry.ja;
}

// ── Placeholder alert for the submit CTA ─────────────────────────────────────
// Replace this with real SDK navigation when an ID vendor is integrated.

function handleStartVerification(lang: "ko" | "ja") {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  Alert.alert(
    lang === "ko" ? "신분증 인증 시작" : "本人確認書類の認証を開始",
    lang === "ko"
      ? [
          "📱 카메라로 신분증 앞면을 촬영합니다.",
          "🤳 본인 확인을 위한 셀피를 찍습니다.",
          "🔍 AI가 서류와 얼굴을 대조합니다.",
          "✅ 보통 1-3 영업일 내에 결과가 나옵니다.",
          "",
          "[연동 예정: Onfido / Jumio / Persona]",
        ].join("\n")
      : [
          "📱 カメラで身分証の表面を撮影します。",
          "🤳 本人確認のためのセルフィーを撮ります。",
          "🔍 AIが書類と顔を照合します。",
          "✅ 通常1〜3営業日以内に結果が出ます。",
          "",
          "[連携予定: Onfido / Jumio / Persona]",
        ].join("\n"),
    [{ text: lang === "ko" ? "확인" : "OK" }]
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function VerifyIdScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { profile } = useApp();
  const { lang } = useLocale();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const idLayer = profile.trustProfile.idVerified;
  const status: TrustStatus = idLayer?.status ?? "not_verified";
  const hero = getHeroConfig(status);

  return (
    <View style={[s.container, { backgroundColor: colors.background }]}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <View style={[s.header, { paddingTop: topPad + 12 }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn} activeOpacity={0.7}>
          <Feather name="arrow-left" size={22} color={colors.charcoal} />
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: colors.charcoal }]}>
          {lang === "ko" ? "신분증 인증" : "本人確認書類"}
        </Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        contentContainerStyle={[s.scroll, { paddingBottom: bottomPad + 32 }]}
        showsVerticalScrollIndicator={false}
      >

        {/* ── Status hero ──────────────────────────────────────────────────── */}
        <View style={[s.hero, { backgroundColor: hero.bg, borderColor: `${hero.color}25` }]}>
          <View style={[s.heroEmoji, { backgroundColor: `${hero.color}18` }]}>
            <Text style={s.heroEmojiText}>{hero.emoji}</Text>
          </View>
          <Text style={[s.heroTitle, { color: hero.color }]}>
            {lang === "ko" ? hero.titleKo : hero.titleJa}
          </Text>
          <Text style={[s.heroSubtitle, { color: colors.charcoalMid }]}>
            {lang === "ko" ? hero.subtitleKo : hero.subtitleJa}
          </Text>
        </View>

        {/* ── Status-specific content ───────────────────────────────────────── */}

        {/* NOT VERIFIED — explanation + document list + privacy */}
        {status === "not_verified" && (
          <>
            {/* Why it matters */}
            <SectionTitle lang={lang} ko="신분증 인증이란?" ja="本人確認書類とは？" colors={colors} />
            <InfoCard colors={colors}>
              <BulletRow icon="shield" color="#B07D1A" colors={colors}
                ko="실제 신원을 확인해 사기·허위 프로필을 방지합니다."
                ja="実際の身元を確認し、詐欺・虚偽プロフィールを防ぎます。" lang={lang} />
              <BulletRow icon="star" color="#B07D1A" colors={colors}
                ko="신분증 인증 배지가 프로필에 표시돼 신뢰도가 높아집니다."
                ja="身分証バッジがプロフィールに表示され、信頼度が上がります。" lang={lang} />
              <BulletRow icon="zap" color="#B07D1A" colors={colors}
                ko="인증 완료 시 매칭 우선 노출 혜택을 받을 수 있습니다."
                ja="認証完了でマッチング優先表示の特典が得られます。" lang={lang} />
            </InfoCard>

            {/* Distinction banner — Human vs ID */}
            <DistinctionBanner lang={lang} colors={colors} />

            {/* Accepted documents */}
            <SectionTitle lang={lang} ko="사용 가능한 서류" ja="使用可能な書類" colors={colors} />
            <InfoCard colors={colors}>
              {[
                { icon: "book-open" as const, ko: "여권 (국제 여권)", ja: "パスポート（国際旅券）" },
                { icon: "credit-card" as const, ko: "주민등록증 / 마이넘버 카드", ja: "住民票 / マイナンバーカード" },
                { icon: "truck" as const, ko: "운전면허증", ja: "運転免許証" },
              ].map((doc, i) => (
                <BulletRow key={i} icon={doc.icon} color={colors.charcoalMid} colors={colors}
                  ko={doc.ko} ja={doc.ja} lang={lang} />
              ))}
            </InfoCard>

            {/* Privacy */}
            <SectionTitle lang={lang} ko="개인정보 보호" ja="個人情報の保護" colors={colors} />
            <View style={[s.privacyCard, { backgroundColor: "#EEF4FF", borderColor: "#3B6FD425" }]}>
              <Feather name="lock" size={16} color="#3B6FD4" />
              <Text style={[s.privacyText, { color: "#2A4D99" }]}>
                {lang === "ko"
                  ? "신분증 이미지는 제3자 인증 기관에만 전달되며, Lito 서버에는 저장되지 않습니다. 인증 후 24시간 내 삭제됩니다."
                  : "身分証の画像は第三者認証機関にのみ送信され、Litoのサーバーには保存されません。認証後24時間以内に削除されます。"}
              </Text>
            </View>

            {/* CTA */}
            <Pressable
              style={[s.ctaBtn, { backgroundColor: "#B07D1A" }]}
              onPress={() => handleStartVerification(lang)}
            >
              <Feather name="upload" size={16} color="#FFF" />
              <Text style={s.ctaBtnText}>
                {lang === "ko" ? "인증 시작하기" : "認証を開始する"}
              </Text>
            </Pressable>
          </>
        )}

        {/* PENDING REVIEW — timeline */}
        {status === "pending_review" && (
          <>
            <SectionTitle lang={lang} ko="검토 진행 상황" ja="審査の進行状況" colors={colors} />
            <InfoCard colors={colors}>
              <TimelineStep
                done label={{ ko: "서류 제출 완료", ja: "書類提出完了" }}
                sub={idLayer?.submittedAt
                  ? new Date(idLayer.submittedAt).toLocaleString(lang === "ko" ? "ko-KR" : "ja-JP")
                  : undefined}
                color="#3B6FD4" lang={lang} />
              <TimelineStep
                done={false} label={{ ko: "전문가 검토 중", ja: "専門家が審査中" }}
                sub={{ ko: "보통 1-3 영업일 소요", ja: "通常1〜3営業日かかります" }}
                color="#8E8E93" lang={lang} />
              <TimelineStep
                done={false} label={{ ko: "결과 통보", ja: "結果通知" }}
                sub={{ ko: "앱 알림 및 이메일 발송", ja: "アプリ通知とメールを送信" }}
                color="#8E8E93" lang={lang} last />
            </InfoCard>

            <View style={[s.helpCard, { backgroundColor: colors.white, borderColor: colors.border }]}>
              <Feather name="message-circle" size={15} color={colors.charcoalLight} />
              <Text style={[s.helpText, { color: colors.charcoalMid }]}>
                {lang === "ko"
                  ? "3 영업일이 지났는데 결과가 없으신가요? 지원팀에 문의하세요."
                  : "3営業日経っても結果が届かない場合は、サポートにお問い合わせください。"}
              </Text>
              <TouchableOpacity onPress={() => {}}>
                <Text style={[s.helpLink, { color: "#3B6FD4" }]}>
                  {lang === "ko" ? "문의하기" : "お問い合わせ"}
                </Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* VERIFIED — badge preview + expiry */}
        {status === "verified" && (
          <>
            <SectionTitle lang={lang} ko="인증 정보" ja="認証情報" colors={colors} />
            <InfoCard colors={colors}>
              {idLayer?.verifiedAt && (
                <InfoRow icon="check-circle" color="#1A7A4A"
                  label={{ ko: "인증 완료일", ja: "認証完了日" }}
                  value={new Date(idLayer.verifiedAt).toLocaleDateString(
                    lang === "ko" ? "ko-KR" : "ja-JP",
                    { year: "numeric", month: "long", day: "numeric" }
                  )} lang={lang} />
              )}
              {idLayer?.expiresAt && (
                <InfoRow icon="calendar" color="#B07D1A"
                  label={{ ko: "유효 기간", ja: "有効期限" }}
                  value={new Date(idLayer.expiresAt).toLocaleDateString(
                    lang === "ko" ? "ko-KR" : "ja-JP",
                    { year: "numeric", month: "long" }
                  )} lang={lang} />
              )}
            </InfoCard>

            {/* Badge preview */}
            <SectionTitle lang={lang} ko="프로필에 표시되는 배지" ja="プロフィールに表示されるバッジ" colors={colors} />
            <View style={[s.badgePreviewCard, { backgroundColor: colors.white, borderColor: colors.border }]}>
              <Text style={[s.badgePreviewLabel, { color: colors.charcoalLight }]}>
                {lang === "ko" ? "다른 유저에게 이렇게 보여요" : "他のユーザーにはこう見えます"}
              </Text>
              <TrustBadge
                trustProfile={profile.trustProfile}
                size="md"
                lang={lang}
              />
            </View>

            {/* What to do if document changes */}
            <View style={[s.noteCard, { backgroundColor: "#FFF8EC", borderColor: "#B07D1A25" }]}>
              <Feather name="info" size={14} color="#B07D1A" />
              <Text style={[s.noteText, { color: "#7A5A10" }]}>
                {lang === "ko"
                  ? "신분증이 만료되거나 변경되면 재인증이 필요합니다. 만료 전에 미리 갱신해 주세요."
                  : "身分証明書が期限切れまたは変更された場合は再認証が必要です。期限前に更新してください。"}
              </Text>
            </View>
          </>
        )}

        {/* REJECTED — reason + how to retry */}
        {status === "rejected" && (
          <>
            <SectionTitle lang={lang} ko="거절 사유" ja="却下の理由" colors={colors} />
            <View style={[s.rejectionCard, { backgroundColor: "#FFF0EE", borderColor: "#C0392B25" }]}>
              <Feather name="x-circle" size={16} color="#C0392B" />
              <Text style={[s.rejectionText, { color: "#8B2020" }]}>
                {getRejectionLabel(idLayer?.rejectionReason, lang)}
              </Text>
            </View>

            <SectionTitle lang={lang} ko="재시도 방법" ja="再試行の方法" colors={colors} />
            <InfoCard colors={colors}>
              <BulletRow icon="sun" color={colors.charcoalMid} colors={colors}
                ko="밝은 곳에서 서류가 화면 전체에 잘 들어오도록 촬영하세요."
                ja="明るい場所で書類が画面全体に収まるように撮影してください。" lang={lang} />
              <BulletRow icon="eye" color={colors.charcoalMid} colors={colors}
                ko="모든 글자, 사진, 만료일이 선명하게 보여야 합니다."
                ja="すべての文字、写真、有効期限が鮮明に見える必要があります。" lang={lang} />
              <BulletRow icon="calendar" color={colors.charcoalMid} colors={colors}
                ko="유효기간이 지나지 않은 서류를 사용하세요."
                ja="有効期限が切れていない書類を使用してください。" lang={lang} />
            </InfoCard>

            <Pressable
              style={[s.ctaBtn, { backgroundColor: "#C0392B" }]}
              onPress={() => handleStartVerification(lang)}
            >
              <Feather name="refresh-cw" size={16} color="#FFF" />
              <Text style={s.ctaBtnText}>
                {lang === "ko" ? "다시 시도하기" : "再試行する"}
              </Text>
            </Pressable>
          </>
        )}

        {/* REVERIFY REQUIRED — why + CTA */}
        {status === "reverify_required" && (
          <>
            <SectionTitle lang={lang} ko="재인증이 필요한 이유" ja="再認証が必要な理由" colors={colors} />
            <InfoCard colors={colors}>
              <BulletRow icon="image" color="#C05020" colors={colors}
                ko="프로필 사진이 인증 당시와 달라졌습니다."
                ja="プロフィール写真が認証時と異なっています。" lang={lang} />
              <BulletRow icon="clock" color="#C05020" colors={colors}
                ko="또는 신분증 유효기간이 만료되었습니다."
                ja="または身分証明書の有効期限が切れています。" lang={lang} />
            </InfoCard>

            <View style={[s.noteCard, { backgroundColor: "#FFF3ED", borderColor: "#C0502025" }]}>
              <Feather name="info" size={14} color="#C05020" />
              <Text style={[s.noteText, { color: "#7A3510" }]}>
                {lang === "ko"
                  ? "재인증 동안 신분증 인증 배지는 일시적으로 프로필에서 숨겨집니다."
                  : "再認証中は、身分証バッジが一時的にプロフィールから非表示になります。"}
              </Text>
            </View>

            <Pressable
              style={[s.ctaBtn, { backgroundColor: "#C05020" }]}
              onPress={() => handleStartVerification(lang)}
            >
              <Feather name="refresh-cw" size={16} color="#FFF" />
              <Text style={s.ctaBtnText}>
                {lang === "ko" ? "재인증 시작하기" : "再認証を開始する"}
              </Text>
            </Pressable>
          </>
        )}

        {/* ── Always visible: distinction banner ───────────────────────────── */}
        {status !== "not_verified" && <DistinctionBanner lang={lang} colors={colors} />}

      </ScrollView>
    </View>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function SectionTitle({ lang, ko, ja, colors }: { lang: "ko" | "ja"; ko: string; ja: string; colors: any }) {
  return (
    <Text style={[s.sectionTitle, { color: colors.charcoal }]}>
      {lang === "ko" ? ko : ja}
    </Text>
  );
}

function InfoCard({ children, colors }: { children: React.ReactNode; colors: any }) {
  return (
    <View style={[s.infoCard, { backgroundColor: colors.white, borderColor: colors.border }]}>
      {children}
    </View>
  );
}

function BulletRow({
  icon, color, ko, ja, lang, colors,
}: {
  icon: any; color: string; ko: string; ja: string; lang: "ko" | "ja"; colors: any;
}) {
  return (
    <View style={s.bulletRow}>
      <Feather name={icon} size={14} color={color} style={{ marginTop: 2 }} />
      <Text style={[s.bulletText, { color: colors.charcoalMid }]}>
        {lang === "ko" ? ko : ja}
      </Text>
    </View>
  );
}

function InfoRow({
  icon, color, label, value, lang,
}: {
  icon: any; color: string; label: { ko: string; ja: string }; value: string; lang: "ko" | "ja";
}) {
  return (
    <View style={s.infoRow}>
      <Feather name={icon} size={14} color={color} />
      <Text style={s.infoRowLabel}>{lang === "ko" ? label.ko : label.ja}</Text>
      <Text style={[s.infoRowValue, { color }]}>{value}</Text>
    </View>
  );
}

function TimelineStep({
  done, label, sub, color, lang, last = false,
}: {
  done: boolean;
  label: { ko: string; ja: string };
  sub?: { ko: string; ja: string } | string;
  color: string;
  lang: "ko" | "ja";
  last?: boolean;
}) {
  const subText = typeof sub === "string" ? sub : sub ? (lang === "ko" ? sub.ko : sub.ja) : undefined;
  return (
    <View style={s.timelineStep}>
      <View style={s.timelineLeft}>
        <View style={[s.timelineDot, { backgroundColor: done ? color : "#E0E0E0", borderColor: done ? color : "#C7C7CC" }]}>
          {done && <Feather name="check" size={10} color="#FFF" />}
        </View>
        {!last && <View style={[s.timelineLine, { backgroundColor: done ? `${color}40` : "#E0E0E0" }]} />}
      </View>
      <View style={s.timelineContent}>
        <Text style={[s.timelineLabel, { color: done ? "#1C1C1E" : "#8E8E93" }]}>
          {lang === "ko" ? label.ko : label.ja}
        </Text>
        {subText && <Text style={s.timelineSub}>{subText}</Text>}
      </View>
    </View>
  );
}

function DistinctionBanner({ lang, colors }: { lang: "ko" | "ja"; colors: any }) {
  return (
    <View style={[s.distinctionCard, { backgroundColor: colors.white, borderColor: colors.border }]}>
      <Text style={[s.distinctionTitle, { color: colors.charcoal }]}>
        {lang === "ko" ? "🔍 본인 인증 vs 신분증 인증" : "🔍 本人確認 vs 身分証明書"}
      </Text>
      <View style={s.distinctionRow}>
        {/* Human verified */}
        <View style={[s.distinctionCol, { backgroundColor: "#EEF4FF", borderColor: "#3B6FD420" }]}>
          <View style={[s.distinctionIconWrap, { backgroundColor: "#3B6FD415" }]}>
            <Feather name="user-check" size={18} color="#3B6FD4" />
          </View>
          <Text style={[s.distinctionColTitle, { color: "#3B6FD4" }]}>
            {lang === "ko" ? "Layer 1 · 본인 인증" : "Layer 1 · 本人確認"}
          </Text>
          <Text style={[s.distinctionColDesc, { color: "#4A5568" }]}>
            {lang === "ko"
              ? "휴대폰 번호 + 생체 인식으로 실제 사람임을 확인합니다."
              : "電話番号 + 生体認証で実在する人物であることを確認します。"}
          </Text>
        </View>
        {/* ID verified */}
        <View style={[s.distinctionCol, { backgroundColor: "#FFF8EC", borderColor: "#B07D1A20" }]}>
          <View style={[s.distinctionIconWrap, { backgroundColor: "#B07D1A15" }]}>
            <Feather name="credit-card" size={18} color="#B07D1A" />
          </View>
          <Text style={[s.distinctionColTitle, { color: "#B07D1A" }]}>
            {lang === "ko" ? "Layer 3 · 신분증 인증" : "Layer 3 · 身分証明書"}
          </Text>
          <Text style={[s.distinctionColDesc, { color: "#4A5568" }]}>
            {lang === "ko"
              ? "정부 발행 신분증으로 실명과 생년월일을 확인합니다."
              : "政府発行の身分証で実名と生年月日を確認します。"}
          </Text>
        </View>
      </View>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, paddingBottom: 14,
  },
  backBtn: { padding: 6, marginLeft: -6 },
  headerTitle: { fontFamily: "Inter_700Bold", fontSize: 18, letterSpacing: -0.4 },
  scroll: { paddingHorizontal: 20, paddingTop: 4 },

  // Hero
  hero: {
    borderRadius: 20, borderWidth: 1, padding: 24, alignItems: "center",
    marginBottom: 4,
  },
  heroEmoji: { width: 72, height: 72, borderRadius: 36, alignItems: "center", justifyContent: "center", marginBottom: 14 },
  heroEmojiText: { fontSize: 32 },
  heroTitle: { fontFamily: "Inter_700Bold", fontSize: 22, letterSpacing: -0.5, marginBottom: 8, textAlign: "center" },
  heroSubtitle: { fontFamily: "Inter_400Regular", fontSize: 14, lineHeight: 21, textAlign: "center" },

  sectionTitle: { fontFamily: "Inter_700Bold", fontSize: 15, marginTop: 20, marginBottom: 10, letterSpacing: -0.2 },

  // Info card
  infoCard: { borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, overflow: "hidden", paddingVertical: 4 },
  bulletRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, paddingHorizontal: 16, paddingVertical: 10 },
  bulletText: { fontFamily: "Inter_400Regular", fontSize: 13.5, lineHeight: 20, flex: 1 },

  infoRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16, paddingVertical: 12 },
  infoRowLabel: { fontFamily: "Inter_500Medium", fontSize: 13, color: "#8E8E93", flex: 1 },
  infoRowValue: { fontFamily: "Inter_600SemiBold", fontSize: 13 },

  // Privacy card
  privacyCard: { flexDirection: "row", alignItems: "flex-start", gap: 10, borderRadius: 12, borderWidth: 1, padding: 14, marginTop: 0 },
  privacyText: { fontFamily: "Inter_400Regular", fontSize: 13, lineHeight: 19, flex: 1 },

  // CTA button
  ctaBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    borderRadius: 16, paddingVertical: 16, marginTop: 24,
  },
  ctaBtnText: { fontFamily: "Inter_700Bold", fontSize: 16, color: "#FFF", letterSpacing: -0.3 },

  // Timeline
  timelineStep: { flexDirection: "row", gap: 14, paddingHorizontal: 16, paddingTop: 10 },
  timelineLeft: { alignItems: "center", width: 20 },
  timelineDot: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  timelineLine: { width: 2, flex: 1, marginTop: 4, minHeight: 16 },
  timelineContent: { flex: 1, paddingBottom: 12 },
  timelineLabel: { fontFamily: "Inter_600SemiBold", fontSize: 13.5, marginBottom: 2 },
  timelineSub: { fontFamily: "Inter_400Regular", fontSize: 12, color: "#8E8E93" },

  // Pending help card
  helpCard: { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, padding: 14, marginTop: 12 },
  helpText: { fontFamily: "Inter_400Regular", fontSize: 12.5, lineHeight: 18, flex: 1 },
  helpLink: { fontFamily: "Inter_600SemiBold", fontSize: 13 },

  // Badge preview card
  badgePreviewCard: { borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, padding: 16, alignItems: "flex-start" },
  badgePreviewLabel: { fontFamily: "Inter_400Regular", fontSize: 12, marginBottom: 10 },

  // Rejection card
  rejectionCard: { flexDirection: "row", alignItems: "flex-start", gap: 10, borderRadius: 12, borderWidth: 1, padding: 14, marginBottom: 4 },
  rejectionText: { fontFamily: "Inter_500Medium", fontSize: 13.5, lineHeight: 20, flex: 1 },

  // Note card
  noteCard: { flexDirection: "row", alignItems: "flex-start", gap: 8, borderRadius: 12, borderWidth: 1, padding: 12, marginTop: 12 },
  noteText: { fontFamily: "Inter_400Regular", fontSize: 12.5, lineHeight: 19, flex: 1 },

  // Distinction card
  distinctionCard: { borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, padding: 16, marginTop: 20 },
  distinctionTitle: { fontFamily: "Inter_700Bold", fontSize: 14, marginBottom: 12, letterSpacing: -0.2 },
  distinctionRow: { flexDirection: "row", gap: 10 },
  distinctionCol: { flex: 1, borderRadius: 12, borderWidth: 1, padding: 12 },
  distinctionIconWrap: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center", marginBottom: 8 },
  distinctionColTitle: { fontFamily: "Inter_600SemiBold", fontSize: 11.5, marginBottom: 6, lineHeight: 15 },
  distinctionColDesc: { fontFamily: "Inter_400Regular", fontSize: 11.5, lineHeight: 17 },
});
