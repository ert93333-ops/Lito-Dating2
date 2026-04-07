import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

interface LitoMarkProps {
  size?: number;
}

/**
 * Lito — the official app symbol.
 *
 * A circle with rose gradient.
 * Inside: two overlapping white teardrop petal shapes, tips pointing down,
 * forming a pair of arching petals that together suggest two people
 * drawing close — a quiet visual metaphor for Korean-Japanese connection.
 *
 * At small sizes (≤ 40px) it collapses to a simple rose circle with
 * a white "L" so it remains legible at tab-bar / header scale.
 */
export function LitoMark({ size = 80 }: LitoMarkProps) {
  const radius = size / 2;
  const isSmall = size <= 44;

  return (
    <LinearGradient
      colors={["#E8607A", "#B83058"]}
      start={{ x: 0.15, y: 0 }}
      end={{ x: 0.85, y: 1 }}
      style={[
        styles.circle,
        {
          width: size,
          height: size,
          borderRadius: radius,
        },
      ]}
    >
      {isSmall ? (
        // Small: clean white "L" lettermark
        <Text
          style={[
            styles.letterSmall,
            { fontSize: size * 0.52, lineHeight: size * 0.62 },
          ]}
        >
          L
        </Text>
      ) : (
        // Full: two petal shapes forming the connection symbol
        <PetalMark size={size} />
      )}
    </LinearGradient>
  );
}

// ── Two-petal connection mark ─────────────────────────────────────────────────
function PetalMark({ size }: { size: number }) {
  // Each petal is a tall oval. They overlap at the center.
  const petalW = size * 0.28;
  const petalH = size * 0.46;
  const overlap = size * 0.07;
  const gap = size * 0.02; // gap between petal edges at widest
  const totalW = petalW * 2 - overlap + gap;
  const offsetY = size * 0.04; // push petals slightly upward from center

  return (
    <View
      style={{
        position: "relative",
        width: totalW,
        height: petalH,
        marginTop: -offsetY,
      }}
    >
      {/* Left petal */}
      <View
        style={[
          styles.petal,
          {
            width: petalW,
            height: petalH,
            borderRadius: petalW / 2,
            backgroundColor: "rgba(255,255,255,0.82)",
            position: "absolute",
            left: 0,
          },
        ]}
      />
      {/* Right petal */}
      <View
        style={[
          styles.petal,
          {
            width: petalW,
            height: petalH,
            borderRadius: petalW / 2,
            backgroundColor: "rgba(255,255,255,0.82)",
            position: "absolute",
            right: 0,
          },
        ]}
      />
      {/* Center overlap — brighter white, creates an intersection highlight */}
      <View
        style={{
          position: "absolute",
          width: overlap + 2,
          height: petalH * 0.62,
          borderRadius: (overlap + 2) / 2,
          backgroundColor: "rgba(255,255,255,0.40)",
          alignSelf: "center",
          top: petalH * 0.12,
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  circle: {
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#B83058",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.38,
    shadowRadius: 16,
    elevation: 8,
  },
  letterSmall: {
    fontFamily: "Inter_700Bold",
    color: "#ffffff",
    includeFontPadding: false,
    textAlignVertical: "center",
  },
  petal: {
    // petals point downward — tall and narrow
  },
});
