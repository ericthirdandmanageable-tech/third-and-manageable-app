import { useAppTheme } from "@/context/app-theme";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

export function DayCounterArtifact({
  day,
  total = 90,
  phase,
  streak,
  athlete,
}: {
  day: number;
  total?: number;
  phase: string;
  streak: number;
  athlete: string;
}) {
  const { colors, schoolTheme } = useAppTheme();
  return (
    <View style={[styles.artifact, { backgroundColor: colors.signalDark }]}>
      <LinearGradient
        colors={[colors.signalDark, colors.signal, `${colors.signal}CC`]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.topline}>
        <Text style={styles.brand}>THIRD & MANAGEABLE</Text>
        <Text style={styles.school}>{schoolTheme.initials}</Text>
      </View>
      <View style={styles.rule} />
      <Text style={styles.eyebrow}>THE NEXT CHAPTER · {phase.toUpperCase()}</Text>
      <Text style={styles.day}>{String(day).padStart(2, "0")}</Text>
      <Text style={styles.total}>/ {total} DAYS</Text>
      <View style={styles.bottomline}>
        <Text style={styles.athlete}>{athlete}</Text>
        <Text style={styles.streak}>{streak} DAY STREAK</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  artifact: {
    aspectRatio: 1,
    borderRadius: 28,
    padding: 24,
    overflow: "hidden",
    justifyContent: "space-between",
  },
  topline: { flexDirection: "row", justifyContent: "space-between" },
  brand: { color: "rgba(255,255,255,0.82)", fontFamily: "DMMono-Medium", fontSize: 9, letterSpacing: 1.5 },
  school: { color: "white", fontFamily: "DMMono-Medium", fontSize: 10 },
  rule: { height: 1, backgroundColor: "rgba(255,255,255,0.26)", marginTop: 13 },
  eyebrow: { color: "rgba(255,255,255,0.68)", fontFamily: "DMMono-Medium", fontSize: 8, letterSpacing: 1.3, marginTop: 28 },
  day: { color: "white", fontFamily: "InstrumentSerif-Regular", fontSize: 120, lineHeight: 124, marginTop: -2 },
  total: { color: "rgba(255,255,255,0.72)", fontFamily: "DMMono-Medium", fontSize: 13, letterSpacing: 1.5, marginTop: -8 },
  bottomline: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginTop: "auto" },
  athlete: { color: "white", fontFamily: "Raleway-Bold", fontSize: 12 },
  streak: { color: "rgba(255,255,255,0.68)", fontFamily: "DMMono-Medium", fontSize: 8 },
});
