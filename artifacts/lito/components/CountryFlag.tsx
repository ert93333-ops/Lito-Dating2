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

  // KR — 태극 심볼만 (배경 없음)
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      {/* 빨강(양) */}
      <Path
        d="M 50 12 A 38 38 0 0 1 50 88 A 19 19 0 0 1 50 50 A 19 19 0 0 0 50 12 Z"
        fill="#C60C30"
        transform="rotate(-45, 50, 50)"
      />
      {/* 파랑(음) */}
      <Path
        d="M 50 12 A 38 38 0 0 0 50 88 A 19 19 0 0 0 50 50 A 19 19 0 0 1 50 12 Z"
        fill="#003478"
        transform="rotate(-45, 50, 50)"
      />
      {/* 양 속 음점 */}
      <Circle cx="50" cy="31" r="8" fill="#003478" transform="rotate(-45, 50, 50)" />
      {/* 음 속 양점 */}
      <Circle cx="50" cy="69" r="8" fill="#C60C30" transform="rotate(-45, 50, 50)" />
    </Svg>
  );
}
