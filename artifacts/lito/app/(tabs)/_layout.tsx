import { BlurView } from "expo-blur";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Tabs } from "expo-router";
import { Icon, Label, NativeTabs } from "expo-router/unstable-native-tabs";
import { SymbolView } from "expo-symbols";
import FIcon from "@/components/FIcon";
import React from "react";
import { Platform, StyleSheet, View, useColorScheme } from "react-native";

import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import { useLocale } from "@/hooks/useLocale";

function NativeTabLayout() {
  const { lang } = useLocale();
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="discover">
        <Icon sf={{ default: "flame", selected: "flame.fill" }} />
        <Label>{lang === "ko" ? "발견" : "発見"}</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="matches">
        <Icon sf={{ default: "heart", selected: "heart.fill" }} />
        <Label>{lang === "ko" ? "매칭" : "マッチ"}</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="chats">
        <Icon sf={{ default: "message", selected: "message.fill" }} />
        <Label>{lang === "ko" ? "채팅" : "チャット"}</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="profile">
        <Icon sf={{ default: "person.circle", selected: "person.circle.fill" }} />
        <Label>{lang === "ko" ? "프로필" : "プロフィール"}</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

function ClassicTabLayout() {
  const colors = useColors();
  const { lang } = useLocale();
  const { conversations, matches } = useApp();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const isIOS = Platform.OS === "ios";
  const isWeb = Platform.OS === "web";

  const chatsBadge = conversations.reduce((sum, c) => {
    const fromLock = c.unlockRequestState === "received" ? 1 : 0;
    return sum + c.unreadCount + fromLock;
  }, 0);

  const matchesBadge = matches.filter((m) => m.isNew).length;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.rose,
        tabBarInactiveTintColor: colors.charcoalLight,
        headerShown: false,
        tabBarStyle: {
          position: "absolute",
          backgroundColor: isIOS ? "transparent" : colors.white,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          elevation: 0,
          height: isWeb ? 84 : 70,
        },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView
              intensity={80}
              tint={isDark ? "dark" : "light"}
              style={StyleSheet.absoluteFill}
            />
          ) : (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.white }]} />
          ),
        tabBarLabelStyle: {
          fontFamily: "Inter_500Medium",
          fontSize: 11,
          marginBottom: isWeb ? 10 : 4,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="discover"
        options={{
          title: lang === "ko" ? "발견" : "発見",
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="flame" tintColor={color} size={24} />
            ) : (
              <FIcon name="compass" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="matches"
        options={{
          title: lang === "ko" ? "매칭" : "マッチ",
          tabBarBadge: matchesBadge > 0 ? matchesBadge : undefined,
          tabBarBadgeStyle: { backgroundColor: colors.rose, fontSize: 10 },
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="heart" tintColor={color} size={24} />
            ) : (
              <FIcon name="heart" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="chats"
        options={{
          title: lang === "ko" ? "채팅" : "チャット",
          tabBarBadge: chatsBadge > 0 ? chatsBadge : undefined,
          tabBarBadgeStyle: { backgroundColor: colors.rose, fontSize: 10 },
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="message" tintColor={color} size={24} />
            ) : (
              <FIcon name="message-circle" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: lang === "ko" ? "프로필" : "プロフィール",
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="person.circle" tintColor={color} size={24} />
            ) : (
              <FIcon name="user" size={22} color={color} />
            ),
        }}
      />
    </Tabs>
  );
}

export default function TabLayout() {
  if (isLiquidGlassAvailable()) {
    return <NativeTabLayout />;
  }
  return <ClassicTabLayout />;
}
