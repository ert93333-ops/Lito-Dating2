import React from "react";
import { View } from "react-native";

interface CountryFlagProps {
  country: "KR" | "JP";
  size?: number;
}

/**
 * View-based flag badge — no emoji dependency.
 * Safe on all Android devices including Samsung (which often lacks flag emoji support).
 *
 * KR: white circle, red top half / blue bottom half, white center dot (simplified Taeguk)
 * JP: white circle, solid red inner circle (exact Japanese flag hi-no-maru pattern)
 */
export function CountryFlag({ country, size = 20 }: CountryFlagProps) {
  const r = size / 2;
  const isKR = country === "KR";

  if (!isKR) {
    return (
      <View
        style={{
          width: size, height: size, borderRadius: r,
          backgroundColor: "#FFFFFF",
          alignItems: "center", justifyContent: "center",
          borderWidth: Math.max(1, size * 0.06), borderColor: "#E0DADA",
          overflow: "hidden",
        }}
      >
        <View
          style={{
            width: size * 0.54, height: size * 0.54,
            borderRadius: size * 0.27,
            backgroundColor: "#BC002D",
          }}
        />
      </View>
    );
  }

  return (
    <View
      style={{
        width: size, height: size, borderRadius: r,
        backgroundColor: "#FFFFFF",
        overflow: "hidden",
        borderWidth: Math.max(1, size * 0.06), borderColor: "#E0DADA",
      }}
    >
      <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
        <View style={{ position: "absolute", top: 0, left: 0, right: 0, height: r, backgroundColor: "#C60C30" }} />
        <View style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: r, backgroundColor: "#003478" }} />
        <View
          style={{
            width: size * 0.38, height: size * 0.38,
            borderRadius: size * 0.19,
            backgroundColor: "#FFFFFF",
          }}
        />
      </View>
    </View>
  );
}
