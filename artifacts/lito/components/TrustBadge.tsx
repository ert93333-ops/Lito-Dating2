/**
 * TrustBadge — renders layered trust indicators for a user.
 *
 * Each of the 4 trust layers is visually distinct in color and icon.
 * Only "verified" layers show a filled badge. pending_review / rejected /
 * reverify_required are shown with their own distinct chip when showPending=true.
 *
 * Sizes:
 *   "sm"  — compact pills for card overlays and list rows (icon only)
 *   "md"  — icon + short label for profile headers
 *   "lg"  — full card rows used in the Trust Center screen
 */

import FIcon from "@/components/FIcon";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

import type { TrustProfile, TrustStatus } from "@/types";

// ── Layer config ──────────────────────────────────────────────────────────────

export const TRUST_LAYERS = [
  {
    key: "humanVerified" as const,
    icon: "user-check" as const,
    color: "#3B6FD4",
    bgColor: "#EEF4FF",
    labelKo: "본인 인증",
    labelJa: "本人確認",
    descKo: "휴대폰 번호 + 생체 인식 확인",
    descJa: "電話番号 + 生体認証確認",
  },
  {
    key: "faceMatched" as const,
    icon: "camera" as const,
    color: "#1A7A4A",
    bgColor: "#EFFAF4",
    labelKo: "얼굴 인증",
    labelJa: "顔認証",
    descKo: "프로필 사진과 셀피 일치 확인",
    descJa: "プロフィール写真とセルフィー照合",
  },
  {
    key: "idVerified" as const,
    icon: "credit-card" as const,
    color: "#B07D1A",
    bgColor: "#FFF8EC",
    labelKo: "신분증 인증",
    labelJa: "本人確認書類",
    descKo: "여권 또는 정부 발행 신분증",
    descJa: "パスポートまたは公的身分証明書",
  },
  {
    key: "institutionVerified" as const,
    icon: "briefcase" as const,
    color: "#7C3AED",
    bgColor: "#F3EEFF",
    labelKo: "직장/학교 인증",
    labelJa: "職場/学校認証",
    descKo: "직장 이메일 또는 학생증 인증",
    descJa: "職場メールまたは学生証確認",
  },
] as const;

// ── Status display config (5-state) ───────────────────────────────────────────

type StatusConfig = {
  label: { ko: string; ja: string };
  color: string;
  bg: string;
  icon: "check-circle" | "clock" | "x-circle" | "alert-circle" | "circle";
};

export function getStatusConfig(status: TrustStatus, layerColor: string, layerBg: string): StatusConfig {
  switch (status) {
    case "verified":
      return {
        label: { ko: "인증 완료", ja: "認証済み" },
        color: layerColor,
        bg: layerBg,
        icon: "check-circle",
      };
    case "pending_review":
      return {
        label: { ko: "검토 중", ja: "審査中" },
        color: "#B07D1A",
        bg: "#FFF8EC",
        icon: "clock",
      };
    case "rejected":
      return {
        label: { ko: "인증 실패", ja: "認証失敗" },
        color: "#C0392B",
        bg: "#FFF0EE",
        icon: "x-circle",
      };
    case "reverify_required":
      return {
        label: { ko: "재인증 필요", ja: "再認証必要" },
        color: "#C05020",
        bg: "#FFF3ED",
        icon: "alert-circle",
      };
    case "not_verified":
    default:
      return {
        label: { ko: "미인증", ja: "未認証" },
        color: "#8E8E93",
        bg: "#F4F4F6",
        icon: "circle",
      };
  }
}

// ── Types ─────────────────────────────────────────────────────────────────────

type LayerKey = typeof TRUST_LAYERS[number]["key"];
type Size = "sm" | "md";

interface TrustBadgeProps {
  trustProfile: TrustProfile;
  size?: Size;
  lang?: "ko" | "ja";
  showPending?: boolean;
}

// ── TrustBadge ────────────────────────────────────────────────────────────────
// Renders compact pills for each verified layer.
// Pass showPending=true to also render pending_review / reverify_required chips.
// "rejected" and "not_verified" are never shown here — they are only in TrustLayerRow.

export function TrustBadge({
  trustProfile,
  size = "sm",
  lang = "ko",
  showPending = false,
}: TrustBadgeProps) {
  const visibleLayers = TRUST_LAYERS.filter((layer) => {
    const status = trustProfile[layer.key]?.status ?? "not_verified";
    if (status === "verified") return true;
    if (showPending && (status === "pending_review" || status === "reverify_required")) return true;
    return false;
  });

  if (visibleLayers.length === 0) return null;

  return (
    <View style={styles.row}>
      {visibleLayers.map((layer) => {
        const status = trustProfile[layer.key]?.status ?? "not_verified";
        const sc = getStatusConfig(status, layer.color, layer.bgColor);
        const isPending = status !== "verified";

        if (size === "sm") {
          return (
            <View
              key={layer.key}
              style={[
                styles.smPill,
                {
                  backgroundColor: sc.bg,
                  borderColor: `${sc.color}30`,
                  opacity: isPending ? 0.7 : 1,
                },
              ]}
            >
              <FIcon name={isPending ? sc.icon : layer.icon} size={12} color={sc.color} />
            </View>
          );
        }

        return (
          <View
            key={layer.key}
            style={[
              styles.mdPill,
              {
                backgroundColor: sc.bg,
                borderColor: `${sc.color}25`,
                opacity: isPending ? 0.75 : 1,
              },
            ]}
          >
            <FIcon name={isPending ? sc.icon : layer.icon} size={11} color={sc.color} />
            <Text style={[styles.mdLabel, { color: sc.color }]}>
              {lang === "ko" ? layer.labelKo : layer.labelJa}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

// ── TrustScoreBar — numeric progress bar ─────────────────────────────────────

interface TrustScoreBarProps {
  trustProfile: TrustProfile;
  lang?: "ko" | "ja";
}

export function TrustScoreBar({ trustProfile, lang = "ko" }: TrustScoreBarProps) {
  const verifiedLayers = TRUST_LAYERS.filter(
    (l) => (trustProfile[l.key]?.status ?? "not_verified") === "verified"
  );
  const total = TRUST_LAYERS.length;
  const pct = (verifiedLayers.length / total) * 100;
  const topLayer = verifiedLayers[verifiedLayers.length - 1];
  const barColor = topLayer?.color ?? "#C7C7CC";

  return (
    <View style={score.wrap}>
      <View style={[score.track, { backgroundColor: "#EDE8EA" }]}>
        <View style={[score.fill, { width: `${pct}%` as any, backgroundColor: barColor }]} />
      </View>
      <Text style={score.label}>
        {verifiedLayers.length}/{total}{"  "}
        {lang === "ko" ? "인증 완료" : "認証完了"}
      </Text>
    </View>
  );
}

// ── TrustLayerRow — single layer row for Trust Center / profile page ──────────

interface TrustLayerRowProps {
  layerKey: LayerKey;
  trustProfile: TrustProfile;
  lang?: "ko" | "ja";
  onPress?: () => void;
}

export function TrustLayerRow({
  layerKey,
  trustProfile,
  lang = "ko",
  onPress,
}: TrustLayerRowProps) {
  const layer = TRUST_LAYERS.find((l) => l.key === layerKey)!;
  const layerData = trustProfile[layerKey];
  const status: TrustStatus = layerData?.status ?? "not_verified";

  const sc = getStatusConfig(status, layer.color, layer.bgColor);

  return (
    <View style={row.wrap}>
      <View style={[row.iconWrap, { backgroundColor: layer.bgColor }]}>
        <FIcon name={layer.icon} size={18} color={layer.color} />
      </View>

      <View style={row.meta}>
        <Text style={row.title}>
          {lang === "ko" ? layer.labelKo : layer.labelJa}
        </Text>
        <Text style={row.desc}>
          {lang === "ko" ? layer.descKo : layer.descJa}
        </Text>
        {layerData?.verifiedAt && status === "verified" && (
          <Text style={row.date}>
            {new Date(layerData.verifiedAt).toLocaleDateString(
              lang === "ko" ? "ko-KR" : "ja-JP",
              { year: "numeric", month: "short", day: "numeric" }
            )}
            {layerData.expiresAt
              ? (lang === "ko" ? "  만료: " : "  有効期限: ") +
                new Date(layerData.expiresAt).toLocaleDateString(
                  lang === "ko" ? "ko-KR" : "ja-JP",
                  { year: "numeric", month: "short" }
                )
              : ""}
          </Text>
        )}
      </View>

      <View style={[row.statusBadge, { backgroundColor: sc.bg }]}>
        <FIcon name={sc.icon} size={12} color={sc.color} />
        <Text style={[row.statusText, { color: sc.color }]}>
          {lang === "ko" ? sc.label.ko : sc.label.ja}
        </Text>
      </View>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    flexWrap: "wrap",
  },
  smPill: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  mdPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  mdLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
  },
});

const score = StyleSheet.create({
  wrap: { flexDirection: "row", alignItems: "center", gap: 8 },
  track: { flex: 1, height: 4, borderRadius: 2, overflow: "hidden" },
  fill: { height: 4, borderRadius: 2 },
  label: { fontFamily: "Inter_400Regular", fontSize: 11.5, color: "#8E8E93" },
});

const row = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  meta: { flex: 1 },
  title: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: "#1C1C1E",
    marginBottom: 2,
  },
  desc: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: "#8E8E93",
    lineHeight: 17,
  },
  date: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: "#C7C7CC",
    marginTop: 3,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 12,
  },
  statusText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
  },
});
