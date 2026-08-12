import { OnboardingOption, OnboardingScaffold } from "@/components/onboarding/OnboardingScaffold";
import { router } from "expo-router";
import React, { useState } from "react";
import { StyleSheet, View } from "react-native";

type AthleteStatus = "current" | "former";

export default function AthleteStatusScreen() {
  const [status, setStatus] = useState<AthleteStatus | null>(null);
  return (
    <OnboardingScaffold
      step={1}
      title="Where are you in the game?"
      subtitle="This is a verified athlete community built for identity, transition, and the working life after sport."
      primaryLabel="Continue"
      primaryDisabled={!status}
      onPrimary={() =>
        status &&
        router.push({ pathname: "/(onboarding)/sport-select", params: { athleteStatus: status } })
      }
    >
      <View style={styles.options}>
        <OnboardingOption selected={status === "current"} title="Current athlete" description="I'm currently competing or training in my sport." icon="fitness-outline" onPress={() => setStatus("current")} />
        <OnboardingOption selected={status === "former"} title="Former athlete" description="I've transitioned or am transitioning out of competitive sport." icon="medal-outline" onPress={() => setStatus("former")} />
      </View>
    </OnboardingScaffold>
  );
}

const styles = StyleSheet.create({ options: { gap: 12 } });
