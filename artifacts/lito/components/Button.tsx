import React from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, ViewStyle } from "react-native";

import { useColors } from "@/hooks/useColors";

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  icon?: React.ReactNode;
}

export function Button({
  label,
  onPress,
  variant = "primary",
  size = "md",
  loading = false,
  disabled = false,
  style,
  icon,
}: ButtonProps) {
  const colors = useColors();

  const bg =
    variant === "primary"
      ? colors.rose
      : variant === "secondary"
      ? colors.roseLight
      : variant === "outline"
      ? "transparent"
      : "transparent";

  const textColor =
    variant === "primary"
      ? colors.white
      : variant === "secondary"
      ? colors.rose
      : variant === "outline"
      ? colors.rose
      : colors.charcoal;

  const borderColor = variant === "outline" ? colors.rose : "transparent";

  const height = size === "sm" ? 40 : size === "md" ? 52 : 58;
  const fontSize = size === "sm" ? 14 : size === "md" ? 16 : 18;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: bg,
          borderColor,
          borderWidth: variant === "outline" ? 1.5 : 0,
          height,
          opacity: pressed ? 0.85 : disabled ? 0.5 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={textColor} size="small" />
      ) : (
        <>
          {icon}
          <Text style={[styles.label, { color: textColor, fontSize, marginLeft: icon ? 8 : 0 }]}>
            {label}
          </Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 100,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    paddingHorizontal: 24,
  },
  label: {
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.2,
  },
});
