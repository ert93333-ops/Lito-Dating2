import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CountryFlag } from "@/components/CountryFlag";
import { ProfileImage } from "@/components/ProfileImage";
import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

function ProfileRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  const colors = useColors();
  return (
    <View style={[styles.row, { borderBottomColor: colors.border }]}>
      <View style={[styles.rowIcon, { backgroundColor: colors.roseLight }]}>
        <Feather name={icon as any} size={16} color={colors.rose} />
      </View>
      <View style={styles.rowContent}>
        <Text style={[styles.rowLabel, { color: colors.charcoalLight }]}>{label}</Text>
        <Text style={[styles.rowValue, { color: colors.charcoal }]}>{value}</Text>
      </View>
      <Feather name="edit-2" size={16} color={colors.charcoalLight} />
    </View>
  );
}

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { profile, logout } = useApp();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingBottom: bottomPad + 100 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.header, { paddingTop: topPad + 16 }]}>
        <Text style={[styles.title, { color: colors.charcoal }]}>My Profile</Text>
        <TouchableOpacity onPress={() => router.push("/settings" as any)}>
          <Feather name="settings" size={22} color={colors.charcoalLight} />
        </TouchableOpacity>
      </View>

      <View style={styles.profileCard}>
        <View style={styles.photoSection}>
          <ProfileImage photoKey={profile.photos[0]} size={96} />
          <TouchableOpacity style={[styles.editPhotoBtn, { backgroundColor: colors.rose }]}>
            <Feather name="camera" size={16} color={colors.white} />
          </TouchableOpacity>
        </View>
        <Text style={[styles.name, { color: colors.charcoal }]}>{profile.nickname}</Text>
        <View style={styles.countryRow}>
          <CountryFlag country={profile.country} size={16} />
          <Text style={[styles.countryText, { color: colors.charcoalLight }]}>
            {profile.country === "KR" ? "Korea" : "Japan"} · {profile.age}
          </Text>
        </View>
      </View>

      <View style={[styles.aiCard, { backgroundColor: colors.roseLight, borderColor: colors.roseSoft }]}>
        <View style={styles.aiCardHeader}>
          <Feather name="cpu" size={16} color={colors.rose} />
          <Text style={[styles.aiCardTitle, { color: colors.rose }]}>AI Style Summary</Text>
        </View>
        <Text style={[styles.aiCardBody, { color: colors.charcoalMid }]}>
          {profile.aiStyleSummary}
        </Text>
        {/* TODO: Connect to OpenAI to generate real AI profile analysis */}
      </View>

      <View style={[styles.section, { backgroundColor: colors.white, borderColor: colors.border }]}>
        <ProfileRow icon="user" label="Nickname" value={profile.nickname} />
        <ProfileRow icon="calendar" label="Age" value={`${profile.age} years old`} />
        <ProfileRow
          icon="flag"
          label="Country"
          value={profile.country === "KR" ? "🇰🇷 Korea" : "🇯🇵 Japan"}
        />
        <ProfileRow
          icon="message-square"
          label="Language"
          value={profile.language === "ko" ? "한국어 (Korean)" : "日本語 (Japanese)"}
        />
        <ProfileRow icon="instagram" label="Instagram" value={profile.instagramHandle || "Not set"} />
      </View>

      <View style={styles.bioSection}>
        <Text style={[styles.bioLabel, { color: colors.charcoalMid }]}>Bio</Text>
        <View style={[styles.bioCard, { backgroundColor: colors.white, borderColor: colors.border }]}>
          <Text style={[styles.bioText, { color: colors.charcoal }]}>
            {profile.bio || "Share a bit about yourself..."}
          </Text>
          <TouchableOpacity style={styles.editBioBtn}>
            <Feather name="edit-2" size={14} color={colors.rose} />
            <Text style={[styles.editBioText, { color: colors.rose }]}>Edit</Text>
          </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.logoutBtn, { borderColor: colors.border }]}
        onPress={logout}
      >
        <Feather name="log-out" size={16} color={colors.charcoalLight} />
        <Text style={[styles.logoutText, { color: colors.charcoalLight }]}>Sign Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  title: {
    fontFamily: "Inter_700Bold",
    fontSize: 30,
  },
  profileCard: {
    alignItems: "center",
    paddingBottom: 24,
    paddingHorizontal: 24,
  },
  photoSection: { position: "relative", marginBottom: 14 },
  editPhotoBtn: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  name: {
    fontFamily: "Inter_700Bold",
    fontSize: 24,
    marginBottom: 6,
  },
  countryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  countryText: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
  },
  aiCard: {
    marginHorizontal: 24,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
  },
  aiCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  aiCardTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  aiCardBody: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    lineHeight: 22,
  },
  section: {
    marginHorizontal: 24,
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: 16,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    gap: 14,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  rowContent: { flex: 1 },
  rowLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  rowValue: {
    fontFamily: "Inter_500Medium",
    fontSize: 15,
  },
  bioSection: { marginHorizontal: 24, marginBottom: 16 },
  bioLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  bioCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
  },
  bioText: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 12,
  },
  editBioBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-end",
  },
  editBioText: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
  },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 16,
  },
  logoutText: {
    fontFamily: "Inter_500Medium",
    fontSize: 15,
  },
});
