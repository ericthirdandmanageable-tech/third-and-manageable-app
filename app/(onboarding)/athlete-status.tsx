import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type AthleteStatus = "current" | "former";

export default function AthleteStatusScreen() {
  const [status, setStatus] = useState<AthleteStatus | null>(null);

  const handleNext = () => {
    if (!status) return;
    router.push({
      pathname: "/(onboarding)/sport-select",
      params: { athleteStatus: status },
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.inner}>
        <View style={styles.header}>
          <View style={styles.headerCard}>
            <Text style={styles.step}>Step 1 of 4</Text>
            <Text style={styles.title}>Are you a Current or Former Athlete?</Text>
            <Text style={styles.subtitle}>
              This is a verified, athlete-only community built to help with
              transition and identity beyond the game.
            </Text>
          </View>
        </View>

        <View style={styles.options}>
          <TouchableOpacity
            style={[
              styles.optionCard,
              status === "current" && styles.optionCardSelected,
            ]}
            onPress={() => setStatus("current")}
            activeOpacity={0.7}
          >
            <View style={styles.optionIconWrap}>
              <Ionicons
                name="fitness"
                size={28}
                color={status === "current" ? "#040485" : "#757575"}
              />
            </View>
            <Text style={styles.optionTitle}>Current Athlete</Text>
            <Text style={styles.optionDesc}>
              I&apos;m currently competing or training in my sport.
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.optionCard,
              status === "former" && styles.optionCardSelected,
            ]}
            onPress={() => setStatus("former")}
            activeOpacity={0.7}
          >
            <View style={styles.optionIconWrap}>
              <Ionicons
                name="medal"
                size={28}
                color={status === "former" ? "#040485" : "#757575"}
              />
            </View>
            <Text style={styles.optionTitle}>Former Athlete</Text>
            <Text style={styles.optionDesc}>
              I&apos;ve transitioned or am transitioning out of competitive sport.
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.button, !status && styles.buttonDisabled]}
          onPress={handleNext}
          disabled={!status}
        >
          <Text style={styles.buttonText}>Continue</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FAF8F5",
  },
  inner: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  header: {
    marginBottom: 16,
  },
  headerCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  step: {
    fontSize: 12,
    color: "#0618A8",
    fontFamily: "Raleway-Bold",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  title: {
    fontSize: 28,
    fontFamily: "Raleway-ExtraBold",
    color: "#212121",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    fontFamily: "Raleway-Medium",
    color: "#616161",
    lineHeight: 21,
  },
  options: {
    gap: 12,
  },
  optionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 20,
    borderWidth: 1.5,
    borderColor: "#EEEEEE",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  optionCardSelected: {
    borderColor: "#0618A8",
    backgroundColor: "#ECEEFB",
    shadowColor: "#0618A8",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 6,
  },
  optionIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "#F5F5F5",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  optionTitle: {
    fontSize: 17,
    fontFamily: "Raleway-Bold",
    color: "#212121",
    marginBottom: 4,
  },
  optionDesc: {
    fontSize: 14,
    fontFamily: "Raleway-Medium",
    color: "#616161",
    lineHeight: 20,
  },
  footer: {
    paddingHorizontal: 20,
    paddingBottom: 22,
    paddingTop: 12,
  },
  button: {
    backgroundColor: "#040485",
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    shadowColor: "#040485",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 12,
    elevation: 8,
  },
  buttonDisabled: {
    opacity: 0.45,
  },
  buttonText: {
    color: "#fff",
    fontSize: 17,
    fontFamily: "Raleway-Bold",
  },
});
