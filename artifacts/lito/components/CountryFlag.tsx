import React from "react";
import { Text, View } from "react-native";

interface CountryFlagProps {
  country: "KR" | "JP";
  size?: number;
}

export function CountryFlag({ country, size = 20 }: CountryFlagProps) {
  const flag = country === "KR" ? "🇰🇷" : "🇯🇵";
  return (
    <View>
      <Text style={{ fontSize: size }}>{flag}</Text>
    </View>
  );
}
