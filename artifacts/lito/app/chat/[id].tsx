import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import React, { useRef, useState } from "react";
import {
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CountryFlag } from "@/components/CountryFlag";
import { ProfileImage } from "@/components/ProfileImage";
import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import { Message } from "@/types";

const CURRENT_USER_ID = "me";

function MessageBubble({ msg, showTranslation }: { msg: Message; showTranslation: boolean }) {
  const colors = useColors();
  const isMe = msg.senderId === CURRENT_USER_ID;
  const [expanded, setExpanded] = useState(false);

  return (
    <View style={[styles.bubbleWrap, { alignSelf: isMe ? "flex-end" : "flex-start" }]}>
      <TouchableOpacity
        style={[
          styles.bubble,
          {
            backgroundColor: isMe ? colors.rose : colors.white,
            borderColor: isMe ? colors.rose : colors.border,
          },
        ]}
        onPress={() => setExpanded(!expanded)}
      >
        <Text style={[styles.bubbleText, { color: isMe ? colors.white : colors.charcoal }]}>
          {msg.text}
        </Text>
        {showTranslation && msg.textTranslated && (
          <View style={[styles.translationWrap, { borderTopColor: isMe ? "rgba(255,255,255,0.3)" : colors.border }]}>
            <Feather name="globe" size={10} color={isMe ? "rgba(255,255,255,0.7)" : colors.charcoalLight} />
            <Text style={[styles.translationText, { color: isMe ? "rgba(255,255,255,0.85)" : colors.charcoalLight }]}>
              {msg.textTranslated}
            </Text>
          </View>
        )}
      </TouchableOpacity>
      <Text style={[styles.timestamp, { color: colors.charcoalLight, alignSelf: isMe ? "flex-end" : "flex-start" }]}>
        {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
      </Text>
    </View>
  );
}

export default function ChatDetailScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { conversations, messages, sendMessage, toggleTranslation, unlockExternalContact } = useApp();
  const [inputText, setInputText] = useState("");
  const flatRef = useRef<FlatList>(null);

  const conversation = conversations.find((c) => c.id === id);
  const convMessages = messages[id || "conv1"] || [];
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  if (!conversation) {
    return (
      <View style={[styles.container, { backgroundColor: colors.white, paddingTop: topPad }]}>
        <Text style={{ color: colors.charcoal }}>Conversation not found</Text>
      </View>
    );
  }

  const handleSend = () => {
    if (!inputText.trim() || !id) return;
    sendMessage(id, inputText.trim());
    setInputText("");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // TODO: Connect to OpenAI to get AI reply suggestions and translations
  };

  const handleAiSuggest = () => {
    // TODO: Connect to OpenAI API to generate context-aware reply suggestion
    setInputText("素敵ですね！もっと教えてください 😊");
  };

  const handleUnlock = () => {
    if (!id) return;
    unlockExternalContact(id);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 12, borderBottomColor: colors.border, backgroundColor: colors.white }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="chevron-left" size={24} color={colors.charcoal} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.headerUser}>
          <ProfileImage photoKey={conversation.user.photos[0]} size={38} />
          <View style={styles.headerInfo}>
            <View style={styles.headerNameRow}>
              <Text style={[styles.headerName, { color: colors.charcoal }]}>{conversation.user.nickname}</Text>
              <CountryFlag country={conversation.user.country} size={13} />
            </View>
            <Text style={[styles.headerStatus, { color: colors.charcoalLight }]}>
              {conversation.user.lastActive}
            </Text>
          </View>
        </TouchableOpacity>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[
              styles.translateToggle,
              {
                backgroundColor: conversation.translationEnabled ? colors.rose : colors.muted,
                borderColor: conversation.translationEnabled ? colors.rose : colors.border,
              },
            ]}
            onPress={() => id && toggleTranslation(id)}
          >
            <Feather name="globe" size={14} color={conversation.translationEnabled ? colors.white : colors.charcoalLight} />
          </TouchableOpacity>
        </View>
      </View>

      {!conversation.externalUnlocked && (
        <TouchableOpacity
          style={[styles.unlockBanner, { backgroundColor: colors.roseLight, borderColor: colors.roseSoft }]}
          onPress={handleUnlock}
        >
          <Feather name="unlock" size={14} color={colors.rose} />
          <Text style={[styles.unlockText, { color: colors.rose }]}>
            Request external contact unlock · 외부 연락처 잠금 해제
          </Text>
        </TouchableOpacity>
      )}

      {conversation.externalUnlocked && (
        <View style={[styles.unlockedBanner, { backgroundColor: "#D9FFE6" }]}>
          <Feather name="check-circle" size={14} color="#34C759" />
          <Text style={[styles.unlockText, { color: "#1D8A3A" }]}>
            External contact unlocked! 인스타그램을 공유해보세요 ✨
          </Text>
        </View>
      )}

      <FlatList
        ref={flatRef}
        data={convMessages}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <MessageBubble msg={item} showTranslation={!!conversation.translationEnabled} />
        )}
        contentContainerStyle={[styles.messageList, { paddingBottom: 12 }]}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => flatRef.current?.scrollToEnd({ animated: true })}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={0}
      >
        <View
          style={[
            styles.inputArea,
            {
              backgroundColor: colors.white,
              borderTopColor: colors.border,
              paddingBottom: bottomPad + 8,
            },
          ]}
        >
          <TouchableOpacity
            style={[styles.aiBtn, { backgroundColor: colors.roseLight }]}
            onPress={handleAiSuggest}
          >
            <Feather name="zap" size={16} color={colors.rose} />
          </TouchableOpacity>
          <TextInput
            style={[styles.input, { backgroundColor: colors.muted, borderColor: colors.border, color: colors.charcoal }]}
            placeholder="Message... 메시지... メッセージ..."
            placeholderTextColor={colors.charcoalLight}
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[styles.sendBtn, { backgroundColor: inputText.trim() ? colors.rose : colors.muted }]}
            onPress={handleSend}
            disabled={!inputText.trim()}
          >
            <Feather name="send" size={18} color={inputText.trim() ? colors.white : colors.charcoalLight} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  backBtn: { padding: 4, marginRight: 8 },
  headerUser: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10 },
  headerInfo: {},
  headerNameRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  headerName: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
  },
  headerStatus: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
  },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  translateToggle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  unlockBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  unlockedBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  unlockText: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    flex: 1,
  },
  messageList: {
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 4,
  },
  bubbleWrap: {
    maxWidth: "78%",
    marginBottom: 8,
  },
  bubble: {
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
  },
  bubbleText: {
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    lineHeight: 22,
  },
  translationWrap: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 4,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
  },
  translationText: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    lineHeight: 18,
    flex: 1,
  },
  timestamp: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    marginTop: 4,
    opacity: 0.6,
  },
  inputArea: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    gap: 8,
  },
  aiBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  input: {
    flex: 1,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    maxHeight: 100,
    borderWidth: 1,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
});
