import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button } from "@/components/Button";
import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

export default function ProfileSetupScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { updateProfile } = useApp();
  const [nickname, setNickname] = useState("");
  const [age, setAge] = useState("");
  const [country, setCountry] = useState<"KR" | "JP">("JP");
  const [language, setLanguage] = useState<"ko" | "ja">("ja");
  const [bio, setBio] = useState("");
  const [instagram, setInstagram] = useState("");

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const handleSave = () => {
    updateProfile({
      nickname: nickname || "Alex",
      age: parseInt(age) || 27,
      country,
      language,
      bio,
      instagramHandle: instagram,
    });
    router.replace("/(tabs)/discover");
  };

  const InputField = ({
    label,
    value,
    onChangeText,
    placeholder,
    multiline = false,
    keyboardType = "default" as any,
  }: any) => (
    <View style={styles.fieldGroup}>
      <Text style={[styles.label, { color: colors.charcoalMid }]}>{label}</Text>
      <TextInput
        style={[
          styles.textInput,
          {
            backgroundColor: colors.muted,
            borderColor: colors.border,
            color: colors.charcoal,
            minHeight: multiline ? 100 : 52,
            textAlignVertical: multiline ? "top" : "center",
            paddingTop: multiline ? 14 : 0,
          },
        ]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.charcoalLight}
        multiline={multiline}
        keyboardType={keyboardType}
        numberOfLines={multiline ? 4 : 1}
      />
    </View>
  );

  const SegmentControl = ({
    label,
    options,
    selected,
    onSelect,
  }: {
    label: string;
    options: { value: string; display: string }[];
    selected: string;
    onSelect: (v: any) => void;
  }) => (
    <View style={styles.fieldGroup}>
      <Text style={[styles.label, { color: colors.charcoalMid }]}>{label}</Text>
      <View style={styles.segmentRow}>
        {options.map((opt) => (
          <TouchableOpacity
            key={opt.value}
            style={[
              styles.segment,
              {
                backgroundColor: selected === opt.value ? colors.rose : colors.muted,
                borderColor: selected === opt.value ? colors.rose : colors.border,
              },
            ]}
            onPress={() => onSelect(opt.value)}
          >
            <Text
              style={[
                styles.segmentText,
                { color: selected === opt.value ? colors.white : colors.charcoalMid },
              ]}
            >
              {opt.display}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.white }]}>
      <View style={[styles.header, { paddingTop: topPad + 16 }]}>
        <Text style={[styles.headerTitle, { color: colors.charcoal }]}>Set Up Profile</Text>
        <Text style={[styles.headerSub, { color: colors.charcoalLight }]}>
          프로필 설정 · プロフィール設定
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: bottomPad + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.photoSection}>
          <Text style={[styles.label, { color: colors.charcoalMid }]}>Photos</Text>
          <View style={styles.photoRow}>
            {[0, 1, 2].map((i) => (
              <TouchableOpacity
                key={i}
                style={[styles.photoSlot, { backgroundColor: colors.roseLight, borderColor: colors.roseSoft }]}
              >
                {i === 0 ? (
                  <>
                    <Feather name="camera" size={24} color={colors.rose} />
                    <Text style={[styles.addPhotoText, { color: colors.rose }]}>Add Photo</Text>
                  </>
                ) : (
                  <Feather name="plus" size={24} color={colors.roseSoft} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <InputField
          label="Nickname"
          value={nickname}
          onChangeText={setNickname}
          placeholder="Your nickname"
        />
        <InputField
          label="Age"
          value={age}
          onChangeText={setAge}
          placeholder="Your age"
          keyboardType="numeric"
        />
        <SegmentControl
          label="Country"
          options={[
            { value: "KR", display: "🇰🇷 Korea" },
            { value: "JP", display: "🇯🇵 Japan" },
          ]}
          selected={country}
          onSelect={setCountry}
        />
        <SegmentControl
          label="Language"
          options={[
            { value: "ko", display: "한국어" },
            { value: "ja", display: "日本語" },
          ]}
          selected={language}
          onSelect={setLanguage}
        />
        <InputField
          label="Short Bio"
          value={bio}
          onChangeText={setBio}
          placeholder="Tell people about yourself... (Korean or Japanese welcome!)"
          multiline
        />
        <InputField
          label="Instagram Handle (optional)"
          value={instagram}
          onChangeText={setInstagram}
          placeholder="@yourhandle"
        />
      </ScrollView>

      <View
        style={[
          styles.footer,
          { paddingBottom: bottomPad + 16, backgroundColor: colors.white },
        ]}
      >
        <Button label="Save & Continue" onPress={handleSave} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  headerTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 28,
    marginBottom: 4,
  },
  headerSub: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
  },
  scroll: { paddingHorizontal: 24 },
  fieldGroup: { marginBottom: 20 },
  label: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  textInput: {
    borderRadius: 14,
    borderWidth: 1.5,
    paddingHorizontal: 16,
    fontFamily: "Inter_400Regular",
    fontSize: 15,
  },
  segmentRow: { flexDirection: "row", gap: 10 },
  segment: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1.5,
  },
  segmentText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
  },
  photoSection: { marginBottom: 20 },
  photoRow: { flexDirection: "row", gap: 12 },
  photoSlot: {
    flex: 1,
    aspectRatio: 0.8,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderStyle: "dashed",
  },
  addPhotoText: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    marginTop: 6,
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F0E0E4",
  },
});
