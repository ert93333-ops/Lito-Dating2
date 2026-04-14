import React from "react";
import Svg, { Circle, Path } from "react-native-svg";

interface CountryFlagProps {
  country: "KR" | "JP";
  size?: number;
}

/**
 * KR: 태극 — 빨강(위) + 파랑(아래), 수평 S곡선
 * JP: 빨간 원
 */
export function CountryFlag({ country, size = 22 }: CountryFlagProps) {
  if (country === "JP") {
    return (
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Circle cx="50" cy="50" r="44" fill="#BC002D" />
      </Svg>
    );
  }

  // viewBox 100×100, 중심(50,50), 외곽R=44, 내부r=22
  // 좌점(6,50) ↔ 우점(94,50)
  // 빨강: CCW 외곽 상반원 + CW 우측내원 하반 + CW 좌측내원 상반
  // 파랑: CW 외곽 하반원 + CCW 우측내원 상반 + CCW 좌측내원 하반
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      {/* 파랑(음) — 하단 */}
      <Path
        d="M 6 50 A 44 44 0 0 1 94 50 A 22 22 0 0 0 50 50 A 22 22 0 0 0 6 50 Z"
        fill="#1B3F8B"
      />
      {/* 빨강(양) — 상단 */}
      <Path
        d="M 6 50 A 44 44 0 0 0 94 50 A 22 22 0 0 1 50 50 A 22 22 0 0 1 6 50 Z"
        fill="#D42B3A"
      />
    </Svg>
  );
}
