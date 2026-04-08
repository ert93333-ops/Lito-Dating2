import React from "react";
import { View } from "react-native";
import Svg, { Path } from "react-native-svg";

interface LitoMarkProps {
  size?: number;
  /** Show the rounded-square icon wrapper (for hero / splash contexts). Default false. */
  withBadge?: boolean;
}

/**
 * Lito dual-tone heart mark.
 *
 * Left arc  → charcoal (#2B2D3A) — represents Korea
 * Right arc → dusty rose (#C1808E) — represents Japan
 *
 * The two strokes meet at the top center and the bottom tip,
 * forming one unified heart outline — two cultures, one connection.
 *
 * withBadge=true renders the icon in a rounded-square badge
 * (mirrors the App Store / Play Store icon layout).
 */
export function LitoMark({ size = 80, withBadge = false }: LitoMarkProps) {
  const strokeW = Math.max(4, size * 0.115);

  const heart = (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
    >
      {/* Left arc — charcoal */}
      <Path
        d="M 50 80 C 18 60 7 48 7 34 C 7 18 18 11 29 11 C 40 11 47 20 50 28"
        stroke="#2B2D3A"
        strokeWidth={strokeW}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Right arc — dusty rose */}
      <Path
        d="M 50 28 C 53 20 60 11 71 11 C 82 11 93 18 93 34 C 93 48 82 60 50 80"
        stroke="#C1808E"
        strokeWidth={strokeW}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );

  if (!withBadge) return heart;

  const badgeSize = size * 1.5;
  const badgeRadius = badgeSize * 0.22;

  return (
    <View
      style={{
        width: badgeSize,
        height: badgeSize,
        borderRadius: badgeRadius,
        backgroundColor: "#FDF7F5",
        alignItems: "center",
        justifyContent: "center",
        shadowColor: "#2B2D3A",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 12,
        elevation: 6,
      }}
    >
      {heart}
    </View>
  );
}
