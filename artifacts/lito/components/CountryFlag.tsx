import React from "react";
import { View, Text } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

interface CountryFlagProps {
  country: "KR" | "JP";
  size?: number;
}

export function CountryFlag({ country, size = 22 }: CountryFlagProps) {
  const radius = Math.round(size * 0.28);
  const fontSize = Math.round(size * 0.52);

  if (country === "JP") {
    return (
      <View
        style={{
          width: size,
          height: size,
          borderRadius: radius,
          overflow: "hidden",
        }}
      >
        <LinearGradient
          colors={["#3B6FD4", "#6A4FC8", "#C04472"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
        >
          <Text
            style={{
              fontFamily: "Inter_700Bold",
              fontSize,
              color: "rgba(255,255,255,0.95)",
              lineHeight: size,
              includeFontPadding: false,
            }}
          >
            日
          </Text>
        </LinearGradient>
      </View>
    );
  }

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        overflow: "hidden",
      }}
    >
      <LinearGradient
        colors={["#D8324A", "#8B2FC9", "#1C4F9C"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
      >
        <Text
          style={{
            fontFamily: "Inter_700Bold",
            fontSize,
            color: "rgba(255,255,255,0.95)",
            lineHeight: size,
            includeFontPadding: false,
          }}
        >
          한
        </Text>
      </LinearGradient>
    </View>
  );
}
