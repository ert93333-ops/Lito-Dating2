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
import { Match } from "@/types";

function MatchCard({ match }: { match: Match }) {
  const colors = useColors();

  const goToChat = () => {
    router.push(`/chat/conv1`);
  };

  return (
    <TouchableOpacity
      style={[styles.matchCard, { backgroundColor: colors.white, borderColor: colors.border }]}
      onPress={goToChat}
    >
      <View style={styles.photoWrap}>
        <ProfileImage photoKey={match.user.photos[0]} size={72} />
        {match.isNew && (
          <View style={[styles.newBadge, { backgroundColor: colors.rose }]}>
            <Text style={styles.newBadgeText}>NEW</Text>
          </View>
        )}
      </View>
      <View style={styles.matchInfo}>
        <View style={styles.matchNameRow}>
          <Text style={[styles.matchName, { color: colors.charcoal }]}>{match.user.nickname}</Text>
          <CountryFlag country={match.user.country} size={16} />
        </View>
        <View style={[styles.scoreRow, { backgroundColor: colors.roseLight }]}>
          <Feather name="cpu" size={10} color={colors.rose} />
          <Text style={[styles.scoreLabel, { color: colors.rose }]}>
            {match.user.compatibilityScore}% match
          </Text>
        </View>
        <Text style={[styles.matchBio, { color: colors.charcoalLight }]} numberOfLines={1}>
          {match.user.bio.split("\n")[0]}
        </Text>
      </View>
      <Feather name="message-circle" size={20} color={colors.rose} style={styles.chatIcon} />
    </TouchableOpacity>
  );
}

export default function MatchesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { matches } = useApp();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const newMatches = matches.filter((m) => m.isNew);
  const pastMatches = matches.filter((m) => !m.isNew);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingBottom: bottomPad + 100 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.header, { paddingTop: topPad + 16 }]}>
        <Text style={[styles.title, { color: colors.charcoal }]}>Matches</Text>
        <Text style={[styles.subtitle, { color: colors.charcoalLight }]}>
          매칭 · マッチング
        </Text>
      </View>

      {newMatches.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.rose }]}>New Matches ✨</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.newMatchRow}>
            {newMatches.map((m) => (
              <TouchableOpacity
                key={m.id}
                style={styles.newMatchBubble}
                onPress={() => router.push(`/chat/conv${m.id.replace("match", "")}` as any)}
              >
                <View style={[styles.newMatchRing, { borderColor: colors.rose }]}>
                  <ProfileImage photoKey={m.user.photos[0]} size={64} />
                </View>
                <Text style={[styles.newMatchName, { color: colors.charcoal }]} numberOfLines={1}>
                  {m.user.nickname.split(" ")[0]}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {pastMatches.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.charcoalMid }]}>Previous Matches</Text>
          {pastMatches.map((m) => (
            <MatchCard key={m.id} match={m} />
          ))}
        </View>
      )}

      {matches.length === 0 && (
        <View style={styles.empty}>
          <View style={[styles.emptyIcon, { backgroundColor: colors.roseLight }]}>
            <Feather name="heart" size={36} color={colors.rose} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.charcoal }]}>No matches yet</Text>
          <Text style={[styles.emptySub, { color: colors.charcoalLight }]}>
            Start discovering to find your match!
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 24, paddingBottom: 8 },
  title: {
    fontFamily: "Inter_700Bold",
    fontSize: 30,
    marginBottom: 2,
  },
  subtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
  },
  section: { marginTop: 24, paddingHorizontal: 24 },
  sectionTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    marginBottom: 14,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  newMatchRow: { marginHorizontal: -24, paddingHorizontal: 24 },
  newMatchBubble: {
    alignItems: "center",
    marginRight: 16,
    width: 80,
  },
  newMatchRing: {
    borderWidth: 2.5,
    borderRadius: 40,
    padding: 2,
    marginBottom: 6,
  },
  newMatchName: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    textAlign: "center",
  },
  matchCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  photoWrap: { position: "relative", marginRight: 14 },
  newBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  newBadgeText: {
    fontFamily: "Inter_700Bold",
    fontSize: 8,
    color: "#FFF",
  },
  matchInfo: { flex: 1 },
  matchNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
  },
  matchName: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
  },
  scoreRow: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginBottom: 6,
    gap: 4,
  },
  scoreLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
  },
  matchBio: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
  },
  chatIcon: { marginLeft: 8 },
  empty: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 100,
    paddingHorizontal: 40,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  emptyTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 22,
    marginBottom: 8,
    textAlign: "center",
  },
  emptySub: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    textAlign: "center",
  },
});
