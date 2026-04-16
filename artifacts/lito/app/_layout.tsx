import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { setBaseUrl } from "@workspace/api-client-react";
import { Stack, router } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { API_BASE } from "@/config";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { NotificationToast } from "@/components/NotificationToast";
import { AppProvider, useApp } from "@/context/AppContext";
import { GrowthProvider } from "@/context/GrowthContext";

SplashScreen.preventAutoHideAsync();

// API 클라이언트 기본 URL 설정 (config.ts에서 중앙 관리)
setBaseUrl(API_BASE);

const queryClient = new QueryClient();

function RootNavigator() {
  const { hasCompletedOnboarding, isLoggedIn, hasCompletedProfileSetup, hasSeenDiagnosisPrompt, toast, dismissToast } = useApp();

  useEffect(() => {
    if (!hasCompletedOnboarding) {
      router.replace("/onboarding");
    } else if (!isLoggedIn) {
      router.replace("/login");
    } else if (!hasCompletedProfileSetup) {
      router.replace("/profile-setup");
    } else if (!hasSeenDiagnosisPrompt) {
      router.replace("/diagnosis");
    } else {
      router.replace("/(tabs)/discover");
    }
  }, [hasCompletedOnboarding, isLoggedIn, hasCompletedProfileSetup, hasSeenDiagnosisPrompt]);

  return (
    <View style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="onboarding" options={{ headerShown: false, gestureEnabled: false }} />
        <Stack.Screen name="login" options={{ headerShown: false, gestureEnabled: false }} />
        <Stack.Screen name="profile-setup" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="chat/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="settings" options={{ headerShown: false }} />
        <Stack.Screen name="paywall" options={{ headerShown: false, presentation: "modal" }} />
        <Stack.Screen name="profile-coach" options={{ headerShown: false }} />
        <Stack.Screen name="referral" options={{ headerShown: false }} />
        <Stack.Screen name="trust-center" options={{ headerShown: false }} />
        <Stack.Screen name="verify-id" options={{ headerShown: false }} />
        <Stack.Screen name="report-user" options={{ headerShown: false, presentation: "modal" }} />
        <Stack.Screen name="profile-edit" options={{ headerShown: false }} />
        <Stack.Screen name="diagnosis" options={{ headerShown: false }} />
        <Stack.Screen name="ai-photo" options={{ headerShown: false }} />
      </Stack>
      <NotificationToast notification={toast} onDismiss={dismissToast} />
    </View>
  );
}

function FontLoader({ children }: { children: React.ReactNode }) {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    // Load Feather font from local assets — prevents Metro bundler resolution
    // issues with require() calls from inside node_modules (Expo SDK 54 + new arch)
    // Must match fontName used by @expo/vector-icons createIconSet: 'feather' (lowercase)
    "feather": require("../assets/fonts/Feather.ttf"),
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return <>{children}</>;
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <AppProvider>
            <GrowthProvider>
              <GestureHandlerRootView style={{ flex: 1 }}>
                <KeyboardProvider>
                  <FontLoader>
                    <RootNavigator />
                  </FontLoader>
                </KeyboardProvider>
              </GestureHandlerRootView>
            </GrowthProvider>
          </AppProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
