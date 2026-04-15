import FIcon from "@/components/FIcon";
import { Image, ImageLoadEventData } from "expo-image";
import React, { useCallback, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";

import { useColors } from "@/hooks/useColors";

const profileImages: Record<string, any> = {
  profile1: require("@/assets/images/profile1.png"),
  profile2: require("@/assets/images/profile2.png"),
  profile3: require("@/assets/images/profile3.png"),
  profile4: require("@/assets/images/profile4.png"),
  profile5: require("@/assets/images/profile5.png"),
  profile6: require("@/assets/images/profile6.png"),
};

function isUriString(key: string): boolean {
  return (
    key.startsWith("file://") ||
    key.startsWith("http://") ||
    key.startsWith("https://") ||
    key.startsWith("content://") ||
    key.startsWith("ph://") ||
    key.startsWith("data:")
  );
}

interface ProfileImageProps {
  photoKey?: string;
  size?: number;
  borderRadius?: number;
  style?: object;
  /** 로딩 인디케이터 표시 여부 (기본: true, 원격 이미지만) */
  showLoading?: boolean;
}

export function ProfileImage({
  photoKey,
  size = 60,
  borderRadius,
  style,
  showLoading = true,
}: ProfileImageProps) {
  const colors = useColors();
  const radius = borderRadius ?? size / 2;

  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const isRemote = !!photoKey && isUriString(photoKey);
  const staticSource = photoKey && !isUriString(photoKey) ? profileImages[photoKey] : null;
  const uriSource = isRemote && !hasError ? { uri: photoKey } : null;
  const source = staticSource ?? uriSource;

  const handleError = useCallback(() => {
    setHasError(true);
    setIsLoading(false);
  }, []);

  const handleLoadStart = useCallback(() => {
    if (isRemote) setIsLoading(true);
  }, [isRemote]);

  const handleLoad = useCallback((_e: ImageLoadEventData) => {
    setIsLoading(false);
  }, []);

  // 소스가 없거나 로드 실패 시 → placeholder
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
    <View style={[{ width: size, height: size, borderRadius: radius, overflow: "hidden" }, style]}>
      <Image
        source={source}
        style={{ width: size, height: size, borderRadius: radius }}
        contentFit="cover"
        transition={180}
        cachePolicy="memory-disk"
        onError={handleError}
        onLoadStart={handleLoadStart}
        onLoad={handleLoad}
      />
      {showLoading && isLoading && (
        <View style={[styles.loadingOverlay, { borderRadius: radius }]}>
          <ActivityIndicator size="small" color={colors.rose} />
        </View>
      )}
    </View>
  );
}

/**
 * 원격 이미지 URL 목록을 미리 캐시합니다.
 * Discover 카드 스와이프 시 다음 카드 이미지를 프리패치하는 데 사용합니다.
 */
export async function prefetchImages(urls: string[]): Promise<void> {
  const remoteUrls = urls.filter(
    (u) => u.startsWith("http://") || u.startsWith("https://")
  );
  if (remoteUrls.length === 0) return;
  try {
    await Promise.allSettled(
      remoteUrls.map((url) => Image.prefetch(url))
    );
  } catch {
    // 프리패치 실패는 무시 — 실제 렌더링 시 다시 로드됨
  }
}

const styles = StyleSheet.create({
  placeholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.08)",
  },
});
