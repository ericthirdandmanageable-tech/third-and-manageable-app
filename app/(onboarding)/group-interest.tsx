import { OnboardingOption, OnboardingScaffold } from "@/components/onboarding/OnboardingScaffold";
import { useAuth } from "@/context/auth";
import { upsertProfile } from "@/services/auth";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import { Alert, StyleSheet, View } from "react-native";

export default function GroupInterestScreen() {
  const params = useLocalSearchParams<{ sport: string; displayName: string; athleteStatus: string; school: string }>();
  const { user, refreshProfile } = useAuth();
  const [interest, setInterest] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);

  const finish = async () => {
    if (!user || interest === null) return;
    setLoading(true);
    try {
      await upsertProfile({
        id: user.$id,
        sport: params.sport,
        display_name: params.displayName,
        athlete_status: params.athleteStatus as "current" | "former",
        school: params.school,
        group_interest: interest,
      });
      await refreshProfile();
    } catch (error: any) {
      Alert.alert("Could not finish", error.message || "Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <OnboardingScaffold
      step={4}
      title="Want a smaller huddle?"
      subtitle="Private Circles are moderated groups where athletes can support one another. Tell us if you'd like an invite when they launch."
      primaryLabel="Enter the app"
      primaryDisabled={interest === null}
      loading={loading}
      onBack={() => router.back()}
      onPrimary={() => void finish()}
    >
      <View style={styles.options}>
        <OnboardingOption selected={interest === true} title="Yes, keep me posted" description="Notify me when Private Circles launch." icon="people-outline" onPress={() => setInterest(true)} />
        <OnboardingOption selected={interest === false} title="Not right now" description="I'll use the broader community and private tools for now." icon="person-outline" onPress={() => setInterest(false)} />
      </View>
    </OnboardingScaffold>
  );
}

const styles = StyleSheet.create({ options: { gap: 12 } });
