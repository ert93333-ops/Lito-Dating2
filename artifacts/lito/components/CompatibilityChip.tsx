import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/useColors";

interface CompatibilityChipProps {
  label: string;
}

export function CompatibilityChip({ label }: CompatibilityChipProps) {
  const colors = useColors();
  return (
    <View style={[styles.chip, { backgroundColor: colors.roseLight, borderColor: colors.roseSoft }]}>
      <Text style={[styles.label, { color: colors.rose }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    borderRadius: 100,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    marginRight: 8,
    marginBottom: 8,
  },
  label: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
  },
});
