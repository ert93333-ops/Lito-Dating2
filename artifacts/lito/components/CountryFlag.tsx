import React from "react";
import { View, Text } from "react-native";

interface CountryFlagProps {
  country: "KR" | "JP";
  size?: number;
}

/**
 * 국가 표시 뱃지 — 플랫 단색, 앱 아이콘 톤에 맞춤
 * KR: 딥레드 + 한  /  JP: 다크네이비 + 日
 */
export function CountryFlag({ country, size = 22 }: CountryFlagProps) {
  const radius = Math.round(size * 0.3);
  const fontSize = Math.round(size * 0.55);

  const isKR = country === "KR";

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        backgroundColor: isKR ? "#C0122A" : "#1C3F8B",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text
        style={{
          fontFamily: "Inter_700Bold",
          fontSize,
          color: "rgba(255,255,255,0.92)",
          lineHeight: size,
          includeFontPadding: false,
          textAlignVertical: "center",
        }}
      >
        {isKR ? "한" : "日"}
      </Text>
    </View>
  );
}
