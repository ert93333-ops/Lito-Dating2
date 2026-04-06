import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useRef, useState } from "react";
import {
  Dimensions,
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button } from "@/components/Button";
import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

const { width } = Dimensions.get("window");

const slides = [
  {
    id: "1",
    icon: "cpu" as const,
    title: "AI Culture Matching",
    titleKo: "AI 문화 매칭",
    titleJa: "AI カルチャーマッチング",
    body: "Our AI understands both Korean and Japanese culture — matching you with someone whose values, interests, and lifestyle truly align.",
    bodyKo: "AI가 한국과 일본 문화를 깊이 이해하여 가치관, 관심사, 라이프스타일이 진정으로 맞는 사람을 찾아드려요.",
    color: "#FFD9E1",
  },
  {
    id: "2",
    icon: "message-circle" as const,
    title: "Translation Help",
    titleKo: "번역 도움",
    titleJa: "翻訳サポート",
    body: "Chat naturally across language barriers. Real-time Korean ↔ Japanese translation lets genuine connections happen without the awkwardness.",
    bodyKo: "언어 장벽을 넘어 자연스럽게 대화하세요. 실시간 한국어 ↔ 일본어 번역으로 진정한 연결이 가능합니다.",
    color: "#D9F0FF",
  },
  {
    id: "3",
    icon: "shield" as const,
    title: "Safe Trust Building",
    titleKo: "안전한 신뢰 쌓기",
    titleJa: "安全な信頼構築",
    body: "Share personal contact only when you're ready. Lito's trust system ensures meaningful connections before anything moves outside the app.",
    bodyKo: "준비가 됐을 때만 연락처를 공유하세요. Lito의 신뢰 시스템이 앱 밖으로 나가기 전 의미 있는 연결을 보장합니다.",
    color: "#D9FFE6",
  },
];

export default function OnboardingScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { completeOnboarding } = useApp();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatRef = useRef<FlatList>(null);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const goNext = () => {
    if (currentIndex < slides.length - 1) {
      flatRef.current?.scrollToIndex({ index: currentIndex + 1, animated: true });
      setCurrentIndex(currentIndex + 1);
    } else {
      completeOnboarding();
      router.replace("/login");
    }
  };

  const skip = () => {
    completeOnboarding();
    router.replace("/login");
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.white }]}>
      <View style={[styles.header, { paddingTop: topPad + 16 }]}>
        <Text style={[styles.logo, { color: colors.rose }]}>lito</Text>
        <TouchableOpacity onPress={skip}>
          <Text style={[styles.skip, { color: colors.charcoalLight }]}>Skip</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        ref={flatRef}
        data={slides}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEnabled={false}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={[styles.slide, { width }]}>
            <View style={[styles.iconWrap, { backgroundColor: item.color }]}>
              <Feather name={item.icon} size={48} color={colors.charcoal} />
            </View>
            <Text style={[styles.title, { color: colors.charcoal }]}>{item.title}</Text>
            <Text style={[styles.titleNative, { color: colors.rose }]}>
              {item.titleKo} · {item.titleJa}
            </Text>
            <Text style={[styles.body, { color: colors.charcoalLight }]}>{item.body}</Text>
            <Text style={[styles.bodyKo, { color: colors.charcoalMid }]}>{item.bodyKo}</Text>
          </View>
        )}
      />

      <View style={[styles.footer, { paddingBottom: bottomPad + 24 }]}>
        <View style={styles.dots}>
          {slides.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                {
                  backgroundColor: i === currentIndex ? colors.rose : colors.roseSoft,
                  width: i === currentIndex ? 20 : 8,
                },
              ]}
            />
          ))}
        </View>
        <Button
          label={currentIndex === slides.length - 1 ? "Get Started" : "Next"}
          onPress={goNext}
          style={{ marginTop: 24 }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingBottom: 8,
  },
  logo: {
    fontFamily: "Inter_700Bold",
    fontSize: 28,
    letterSpacing: -1,
  },
  skip: {
    fontFamily: "Inter_500Medium",
    fontSize: 15,
  },
  slide: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    paddingBottom: 40,
  },
  iconWrap: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 36,
  },
  title: {
    fontFamily: "Inter_700Bold",
    fontSize: 28,
    textAlign: "center",
    marginBottom: 4,
  },
  titleNative: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    textAlign: "center",
    marginBottom: 24,
  },
  body: {
    fontFamily: "Inter_400Regular",
    fontSize: 16,
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 12,
  },
  bodyKo: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    textAlign: "center",
    lineHeight: 20,
    opacity: 0.7,
  },
  footer: {
    paddingHorizontal: 24,
    alignItems: "center",
  },
  dots: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
});
