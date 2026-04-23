import { useFocusEffect } from "expo-router";
import React, { useCallback, useRef } from "react";
import { Animated, StyleProp, ViewStyle } from "react-native";

interface FadeScreenProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  duration?: number;
}

/**
 * Wraps a tab screen's root container and fades it in every time
 * the tab is focused.  Drop-in replacement for the outermost View/ScrollView
 * wrapper — passes flex:1 down by default.
 */
export function FadeScreen({ children, style, duration = 200 }: FadeScreenProps) {
  const opacity = useRef(new Animated.Value(0)).current;

  useFocusEffect(
    useCallback(() => {
      opacity.setValue(0);
      const anim = Animated.timing(opacity, {
        toValue: 1,
        duration,
        useNativeDriver: true,
      });
      anim.start();
      return () => anim.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [duration])
  );

  return (
    <Animated.View style={[{ flex: 1, opacity }, style]}>
      {children}
    </Animated.View>
  );
}
