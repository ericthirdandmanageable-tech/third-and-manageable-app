import { OnboardingScaffold } from "@/components/onboarding/OnboardingScaffold";
import { GlassSurface } from "@/components/ui/liquid-glass";
import { SPORT_LIST } from "@/constants/sports";
import { useAppTheme } from "@/context/app-theme";
import type { SportKey } from "@/types";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import { FlatList, Image, Pressable, StyleSheet, Text } from "react-native";

export default function SportSelectScreen() {
  const { athleteStatus } = useLocalSearchParams<{ athleteStatus: string }>();
  const { colors } = useAppTheme();
  const [selected, setSelected] = useState<SportKey | null>(null);
  return (
    <OnboardingScaffold
      step={2}
      title="What's your sport?"
      subtitle="We'll translate the language of your game into skills, routines, and work structures that fit."
      primaryLabel="Next"
      primaryDisabled={!selected}
      onBack={() => router.back()}
      onPrimary={() => selected && router.push({ pathname: "/(onboarding)/profile-setup", params: { sport: selected, athleteStatus } })}
      scroll={false}
    >
      <FlatList
        data={SPORT_LIST}
        keyExtractor={(item) => item.key}
        numColumns={3}
        contentContainerStyle={styles.grid}
        columnWrapperStyle={styles.row}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => {
          const active = selected === item.key;
          return (
            <Pressable style={styles.cell} onPress={() => setSelected(item.key)}>
              <GlassSurface tone={active ? "signal" : "regular"} style={[styles.sport, active ? { borderColor: colors.signal } : undefined]}>
                <Image source={item.icon} style={[styles.icon, { tintColor: active ? colors.signal : colors.textSecondary }]} resizeMode="contain" />
                <Text style={[styles.label, { color: active ? colors.signal : colors.textPrimary }]} numberOfLines={2}>{item.label}</Text>
              </GlassSurface>
            </Pressable>
          );
        }}
      />
    </OnboardingScaffold>
  );
}

const styles = StyleSheet.create({
  grid: { paddingBottom: 110 },
  row: { gap: 8, marginBottom: 8 },
  cell: { flex: 1 },
  sport: { minHeight: 96, alignItems: "center", justifyContent: "center", padding: 10 },
  icon: { width: 30, height: 30, marginBottom: 8 },
  label: { fontFamily: "Raleway-SemiBold", fontSize: 10, textAlign: "center" },
});
