import React from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, ViewStyle } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

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
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    if (disabled || loading) return;
    scale.value = withSpring(0.96, { damping: 22, stiffness: 420 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 16, stiffness: 300 });
  };

  const bg =
    variant === "primary"
      ? colors.rose
      : variant === "secondary"
      ? colors.roseLight
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
    <Animated.View style={[animStyle, style]}>
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled || loading}
        style={[
          styles.button,
          {
            backgroundColor: bg,
            borderColor,
            borderWidth: variant === "outline" ? 1.5 : 0,
            height,
            opacity: disabled ? 0.5 : 1,
          },
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
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 100,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    paddingHorizontal: 24,
    width: "100%",
  },
  label: {
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.2,
  },
});
