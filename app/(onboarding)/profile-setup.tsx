import { OnboardingScaffold } from "@/components/onboarding/OnboardingScaffold";
import { GlassSurface, SectionLabel } from "@/components/ui/liquid-glass";
import UniversityFinder from "@/components/UniversityFinder";
import { useAppTheme } from "@/context/app-theme";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";

export default function ProfileSetupScreen() {
  const { sport, athleteStatus } = useLocalSearchParams<{ sport: string; athleteStatus: string }>();
  const { colors } = useAppTheme();
  const [displayName, setDisplayName] = useState("");
  const [school, setSchool] = useState("");
  const ready = Boolean(displayName.trim() && school.trim());

  return (
    <OnboardingScaffold
      step={3}
      title="Build your athlete identity"
      subtitle="Your display name and university connect you with the right private community and campus colors."
      primaryLabel="Next"
      primaryDisabled={!ready}
      onBack={() => router.back()}
      onPrimary={() => ready && router.push({ pathname: "/(onboarding)/group-interest", params: { sport, athleteStatus, displayName: displayName.trim(), school: school.trim() } })}
    >
      <GlassSurface style={styles.card}>
        <SectionLabel>Display name</SectionLabel>
        <Text style={[styles.hint, { color: colors.textSecondary }]}>This appears on your dashboard and inside the community.</Text>
        <TextInput
          accessibilityLabel="Display name"
          value={displayName}
          onChangeText={setDisplayName}
          placeholder="Your name"
          placeholderTextColor={colors.textTertiary}
          autoCapitalize="words"
          maxLength={30}
          style={[styles.input, { color: colors.textPrimary, backgroundColor: colors.surfaceStrong, borderColor: colors.borderStrong }]}
        />
      </GlassSurface>
      <GlassSurface style={[styles.card, styles.universityCard]}>
        <SectionLabel>School / university</SectionLabel>
        <Text style={[styles.hint, { color: colors.textSecondary }]}>Search the on-device directory or type the full name. Supported partners unlock verified campus colors.</Text>
        <UniversityFinder value={school} onChange={setSchool} />
        <View style={styles.freeformNote}>
          <Text style={[styles.note, { color: colors.textTertiary }]}>Can’t find it? The field is free-form—your school never blocks onboarding.</Text>
        </View>
      </GlassSurface>
    </OnboardingScaffold>
  );
}

const styles = StyleSheet.create({
  card: { padding: 18 },
  universityCard: { zIndex: 10 },
  hint: { fontFamily: "Raleway-Medium", fontSize: 12, lineHeight: 18, marginBottom: 12 },
  input: { minHeight: 54, borderRadius: 18, borderWidth: 1, paddingHorizontal: 15, fontFamily: "Raleway-SemiBold", fontSize: 14 },
  freeformNote: { marginTop: 10 },
  note: { fontFamily: "DMMono-Regular", fontSize: 8, lineHeight: 13 },
});
