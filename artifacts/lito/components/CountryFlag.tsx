import React from "react";
import Svg, { Circle, G, Path } from "react-native-svg";

interface CountryFlagProps {
  country: "KR" | "JP";
  size?: number;
}

export function CountryFlag({ country, size = 22 }: CountryFlagProps) {
  if (country === "JP") {
    return (
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Circle cx="50" cy="50" r="38" fill="#BC002D" />
      </Svg>
    );
  }

  // KR — 순수 태극 문양 (배경 없음)
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      {/* 빨강(양) */}
      <Path
        d="M 50 12 A 38 38 0 0 1 50 88 A 19 19 0 0 1 50 50 A 19 19 0 0 0 50 12 Z"
        fill="#D42B3A"
        transform="rotate(-45, 50, 50)"
      />
      {/* 파랑(음) */}
      <Path
        d="M 50 12 A 38 38 0 0 0 50 88 A 19 19 0 0 0 50 50 A 19 19 0 0 1 50 12 Z"
        fill="#1B3F8B"
        transform="rotate(-45, 50, 50)"
      />
    </Svg>
  );
}
