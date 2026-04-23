import { useEffect, useRef, useState } from "react";
import * as Device from "expo-device";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useApp } from "@/context/AppContext";

// expo-notifications was removed from Expo Go (SDK 53+).
// Use try/require so the module load doesn't crash in Expo Go.
let Notifications: typeof import("expo-notifications") | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  Notifications = require("expo-notifications");
} catch {
  // Running in Expo Go — push notifications unavailable
}

if (Notifications) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
}

const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? "";
const STORAGE_KEY = "push_token_registered";

async function registerAndroidChannels() {
  if (!Notifications || Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync("messages", {
    name: "메시지",
    importance: Notifications.AndroidImportance.HIGH,
    sound: "default",
  });
  await Notifications.setNotificationChannelAsync("matches_likes", {
    name: "매칭 / 좋아요",
    importance: Notifications.AndroidImportance.DEFAULT,
    sound: "default",
  });
  await Notifications.setNotificationChannelAsync("safety_security", {
    name: "안전 / 보안",
    importance: Notifications.AndroidImportance.HIGH,
    sound: "default",
  });
  await Notifications.setNotificationChannelAsync("ai_insights", {
    name: "AI 인사이트",
    importance: Notifications.AndroidImportance.LOW,
  });
  await Notifications.setNotificationChannelAsync("promotions", {
    name: "프로모션",
    importance: Notifications.AndroidImportance.LOW,
  });
}

async function registerTokenWithServer(token: string, jwt: string) {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const locale = Platform.OS === "ios" ? "ko" : "ko";
  const platform = Platform.OS;

  try {
    const res = await fetch(`${API_BASE}/api/notifications/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${jwt}`,
      },
      body: JSON.stringify({ pushToken: token, platform, locale, timezone }),
    });
    if (!res.ok) {
      console.warn("[push] token registration failed:", res.status);
    } else {
      await AsyncStorage.setItem(STORAGE_KEY, token);
    }
  } catch (err) {
    console.error("[push] token registration error:", err);
  }
}

export function usePushNotifications() {
  const { token: jwt } = useApp();
  const [permissionStatus, setPermissionStatus] = useState<"unknown" | "granted" | "denied">("unknown");
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const notificationListener = useRef<any>(null);
  const responseListener = useRef<any>(null);

  useEffect(() => {
    if (!Notifications) return; // Expo Go — skip

    registerAndroidChannels();

    const checkPermission = async () => {
      const { status } = await Notifications!.getPermissionsAsync();
      if (status === "granted") {
        setPermissionStatus("granted");
        await ensureTokenRegistered();
      } else if (status === "denied") {
        setPermissionStatus("denied");
      }
    };

    checkPermission();

    notificationListener.current = Notifications.addNotificationReceivedListener(
      (notification: any) => {
        console.log("[push] notification received:", notification.request.content.title);
      }
    );

    responseListener.current = Notifications!.addNotificationResponseReceivedListener(
      (_response: any) => {
        console.log("[push] notification tapped");
      }
    );

    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function ensureTokenRegistered() {
    if (!Notifications || !Device.isDevice || !jwt) return;
    try {
      const tokenData = await Notifications.getExpoPushTokenAsync();
      const token = tokenData.data;
      setExpoPushToken(token);
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored !== token) {
        await registerTokenWithServer(token, jwt);
      }
    } catch (err) {
      console.warn("[push] token fetch error:", err);
    }
  }

  async function requestPermission(): Promise<boolean> {
    if (!Notifications || !Device.isDevice) return false;

    const { status: existing } = await Notifications.getPermissionsAsync();
    if (existing === "granted") {
      setPermissionStatus("granted");
      await ensureTokenRegistered();
      return true;
    }

    const { status } = await Notifications.requestPermissionsAsync();
    if (status === "granted") {
      setPermissionStatus("granted");
      await ensureTokenRegistered();
      return true;
    }

    setPermissionStatus("denied");
    return false;
  }

  async function deregisterToken() {
    const token = expoPushToken;
    if (!token || !jwt) return;
    try {
      await fetch(`${API_BASE}/api/notifications/token`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${jwt}`,
        },
        body: JSON.stringify({ pushToken: token }),
      });
      await AsyncStorage.removeItem(STORAGE_KEY);
    } catch (err) {
      console.error("[push] deregister error:", err);
    }
  }

  return { permissionStatus, expoPushToken, requestPermission, deregisterToken };
}
