import { useAuth } from "@/context/auth";
import { upsertProfile } from "@/services/auth";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Image,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function GroupInterestScreen() {
  const { sport, displayName, athleteStatus, school } = useLocalSearchParams<{
    sport: string;
    displayName: string;
    athleteStatus: string;
    school: string;
  }>();
  const { user, refreshProfile } = useAuth();
  const [groupInterest, setGroupInterest] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);

  const handleFinish = async () => {
    if (!user) return;
    setLoading(true);
    try {
      await upsertProfile({
        id: user.$id,
        sport: sport!,
        display_name: displayName!,
        athlete_status: athleteStatus! as "current" | "former",
        school: school!,
        group_interest: groupInterest ?? false,
      });
      await refreshProfile();
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to save profile.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.inner}>
        <View style={styles.header}>
          <View style={styles.headerCard}>
            <Text style={styles.step}>Step 4 of 4</Text>
            <Text style={styles.title}>Interested in peer support?</Text>
            <Text style={styles.subtitle}>
              Private Circles are small, moderated groups where athletes support
              each other. This feature is coming soon - let us know if
              you&apos;re interested.
            </Text>
          </View>
        </View>

        <View style={styles.options}>
          <TouchableOpacity
            style={[
              styles.optionCard,
              groupInterest === true && styles.optionCardSelected,
            ]}
            onPress={() => setGroupInterest(true)}
            activeOpacity={0.7}
          >
            <Image
              source={require("../../assets/icons/onboarding-group-yes.png")}
              style={styles.optionIcon}
              resizeMode="contain"
            />
            <Text style={styles.optionTitle}>Yes, I&apos;m interested</Text>
            <Text style={styles.optionDesc}>
              Notify me when Private Circles launch.
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.optionCard,
              groupInterest === false && styles.optionCardSelected,
            ]}
            onPress={() => setGroupInterest(false)}
            activeOpacity={0.7}
          >
            <Image
              source={require("../../assets/icons/onboarding-group-not-now.png")}
              style={styles.optionIcon}
              resizeMode="contain"
            />
            <Text style={styles.optionTitle}>Not right now</Text>
            <Text style={styles.optionDesc}>
              I prefer to go through the program on my own for now.
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.button,
            (groupInterest === null || loading) && styles.buttonDisabled,
          ]}
          onPress={handleFinish}
          disabled={groupInterest === null || loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Get Started</Text>
          )}
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
    fontSize: 30,
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
  optionIcon: {
    width: 32,
    height: 32,
    marginBottom: 10,
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
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingBottom: 22,
    paddingTop: 12,
    gap: 12,
  },
  backButton: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "#E0E0E0",
    paddingVertical: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  backButtonText: {
    color: "#616161",
    fontSize: 17,
    fontFamily: "Raleway-Bold",
  },
  button: {
    flex: 2,
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
