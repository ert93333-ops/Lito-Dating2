import FIcon from "@/components/FIcon";
import { Image } from "expo-image";
import React from "react";
import { StyleSheet, View } from "react-native";

import { useColors } from "@/hooks/useColors";

const profileImages: Record<string, any> = {
  profile1: require("@/assets/images/profile1.png"),
  profile2: require("@/assets/images/profile2.png"),
  profile3: require("@/assets/images/profile3.png"),
  profile4: require("@/assets/images/profile4.png"),
  profile5: require("@/assets/images/profile5.png"),
  profile6: require("@/assets/images/profile6.png"),
};

interface ProfileImageProps {
  photoKey?: string;
  size?: number;
  borderRadius?: number;
  style?: object;
}

export function ProfileImage({ photoKey, size = 60, borderRadius, style }: ProfileImageProps) {
  const colors = useColors();
  const radius = borderRadius ?? size / 2;
  const source = photoKey ? profileImages[photoKey] : null;

  if (!source) {
    return (
      <View
        style={[
          styles.placeholder,
          {
            width: size,
            height: size,
            borderRadius: radius,
            backgroundColor: colors.roseSoft,
          },
          style,
        ]}
      >
        <FIcon name="user" size={size * 0.4} color={colors.rose} />
      </View>
    );
  }

  return (
    <Image
      source={source}
      style={[{ width: size, height: size, borderRadius: radius }, style]}
      contentFit="cover"
      transition={180}
    />
  );
}

const styles = StyleSheet.create({
  placeholder: {
    alignItems: "center",
    justifyContent: "center",
  },
});
