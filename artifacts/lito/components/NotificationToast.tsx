import React, { useEffect, useRef } from "react";
import { Animated, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import FIcon from "@/components/FIcon";
import { useColors } from "@/hooks/useColors";

export interface ToastNotification {
  id: string;
  title: string;
  body: string;
  type: "match" | "message";
  onPress?: () => void;
}

interface Props {
  notification: ToastNotification | null;
  onDismiss: () => void;
}

export function NotificationToast({ notification, onDismiss }: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(-120)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (notification) {
      if (dismissTimer.current) clearTimeout(dismissTimer.current);

      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          damping: 20,
          stiffness: 220,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start();

      dismissTimer.current = setTimeout(() => {
        hide();
      }, 3800);
    }

    return () => {
      if (dismissTimer.current) clearTimeout(dismissTimer.current);
    };
  }, [notification?.id]);

  const hide = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -120,
        duration: 260,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => onDismiss());
  };

  if (!notification) return null;

  const isMatch = notification.type === "match";
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          top: topPad + 12,
          transform: [{ translateY }],
          opacity,
          backgroundColor: colors.white,
          borderColor: isMatch ? colors.roseSoft : colors.border,
          shadowColor: isMatch ? colors.rose : "#000",
        },
      ]}
      pointerEvents="box-none"
    >
      <Pressable
        style={styles.inner}
        onPress={() => {
          notification.onPress?.();
          hide();
        }}
      >
        <View
          style={[
            styles.iconWrap,
            { backgroundColor: isMatch ? colors.roseLight : "#EFF6FF" },
          ]}
        >
          <FIcon
            name={isMatch ? "heart" : "message-circle"}
            size={16}
            color={isMatch ? colors.rose : "#3B82F6"}
          />
        </View>
        <View style={styles.textWrap}>
          <Text style={[styles.title, { color: colors.charcoal }]} numberOfLines={1}>
            {notification.title}
          </Text>
          <Text style={[styles.body, { color: colors.charcoalLight }]} numberOfLines={1}>
            {notification.body}
          </Text>
        </View>
        <Pressable onPress={hide} hitSlop={10}>
          <FIcon name="x" size={14} color={colors.charcoalLight} />
        </Pressable>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 12,
    right: 12,
    zIndex: 9999,
    borderRadius: 18,
    borderWidth: 1.5,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.13,
    shadowRadius: 16,
    elevation: 10,
  },
  inner: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 12,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  textWrap: { flex: 1, gap: 2 },
  title: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13.5,
  },
  body: {
    fontFamily: "Inter_400Regular",
    fontSize: 12.5,
  },
});
