import React from "react";
import Svg, { Circle, G, Path } from "react-native-svg";

interface CountryFlagProps {
  country: "KR" | "JP";
  size?: number;
}

/**
 * SVG-based country flags — no emoji dependency, Android-safe.
 *
 * KR: Taeguk (태극) — rotating yin-yang in Korean red/blue on white
 * JP: Hi-no-maru (日の丸) — red circle on white
 */
export function CountryFlag({ country, size = 20 }: CountryFlagProps) {
  if (country === "JP") {
    return (
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Circle cx="50" cy="50" r="50" fill="#FFFFFF" />
        <Circle cx="50" cy="50" r="30" fill="#BC002D" />
        <Circle cx="50" cy="50" r="49" fill="none" stroke="#E0DADA" strokeWidth="1.5" />
      </Svg>
    );
  }

  // KR — Taeguk (simplified yin-yang, rotated -45° to match Korean flag orientation)
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      {/* White background */}
      <Circle cx="50" cy="50" r="50" fill="#FFFFFF" />

      <G rotation="-45" origin="50, 50">
        {/* Red yang — right semicircle with S-curve */}
        <Path
          d="M 50 10 A 40 40 0 0 1 50 90 A 20 20 0 0 1 50 50 A 20 20 0 0 0 50 10 Z"
          fill="#C60C30"
        />
        {/* Blue yin — left semicircle with S-curve */}
        <Path
          d="M 50 10 A 40 40 0 0 0 50 90 A 20 20 0 0 0 50 50 A 20 20 0 0 1 50 10 Z"
          fill="#003478"
        />
        {/* Blue dot in red area */}
        <Circle cx="50" cy="30" r="9" fill="#003478" />
        {/* Red dot in blue area */}
        <Circle cx="50" cy="70" r="9" fill="#C60C30" />
      </G>

      {/* Border */}
      <Circle cx="50" cy="50" r="49" fill="none" stroke="#D0C8CA" strokeWidth="1.5" />
    </Svg>
  );
}
