import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import {
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const SCHOOLS = ["Case Western Reserve University", "Other", "N/A"];

export default function ProfileSetupScreen() {
  const { sport, athleteStatus } = useLocalSearchParams<{
    sport: string;
    athleteStatus: string;
  }>();
  const [displayName, setDisplayName] = useState("");
  const [school, setSchool] = useState<string | null>(null);

  const handleNext = () => {
    if (!displayName.trim()) {
      Alert.alert("Error", "Please enter your name.");
      return;
    }
    if (!school) {
      Alert.alert("Error", "Please select your school.");
      return;
    }
    router.push({
      pathname: "/(onboarding)/group-interest",
      params: { sport, athleteStatus, displayName: displayName.trim(), school },
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={styles.inner}>
          <View style={styles.header}>
            <View style={styles.headerCard}>
              <Text style={styles.step}>Step 3 of 4</Text>
              <Text style={styles.title}>Tell us about yourself</Text>
              <Text style={styles.subtitle}>
                Your display name and school help us connect you with the right
                athlete community.
              </Text>
            </View>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.inputCard}>
              <Text style={styles.inputLabel}>Display Name</Text>
              <Text style={styles.inputHint}>
                This appears on your dashboard and in the community.
              </Text>
              <TextInput
                style={[
                  styles.input,
                  !!displayName.trim() && styles.inputFilled,
                ]}
                placeholder="Your name"
                placeholderTextColor="#9E9E9E"
                autoCapitalize="words"
                autoCorrect={false}
                value={displayName}
                onChangeText={setDisplayName}
                maxLength={30}
              />
            </View>

            <View style={[styles.inputCard, { marginTop: 12 }]}>
              <Text style={styles.inputLabel}>School / University</Text>
              <Text style={styles.inputHint}>
                Select your school to join your private athlete room.
              </Text>
              {SCHOOLS.map((s) => (
                <TouchableOpacity
                  key={s}
                  style={[
                    styles.schoolOption,
                    school === s && styles.schoolOptionSelected,
                  ]}
                  onPress={() => setSchool(s)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.schoolOptionText,
                      school === s && styles.schoolOptionTextSelected,
                    ]}
                  >
                    {s}
                  </Text>
                  {school === s && (
                    <Ionicons
                      name="checkmark-circle"
                      size={20}
                      color="#040485"
                    />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
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
              (!displayName.trim() || !school) && styles.buttonDisabled,
            ]}
            onPress={handleNext}
            disabled={!displayName.trim() || !school}
          >
            <Text style={styles.buttonText}>Next</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FAF8F5",
  },
  flex: {
    flex: 1,
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
  inputCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  inputLabel: {
    fontSize: 13,
    color: "#424242",
    fontFamily: "Raleway-Bold",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  inputHint: {
    fontSize: 13,
    fontFamily: "Raleway-Medium",
    color: "#757575",
    marginBottom: 12,
  },
  input: {
    backgroundColor: "#FAFAFA",
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 16,
    fontSize: 18,
    fontFamily: "Raleway-SemiBold",
    color: "#212121",
    borderWidth: 1.5,
    borderColor: "#E0E0E0",
  },
  inputFilled: {
    borderColor: "#6E78D9",
    backgroundColor: "#FFFFFF",
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
  schoolOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FAFAFA",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginTop: 8,
    borderWidth: 1.5,
    borderColor: "#E0E0E0",
  },
  schoolOptionSelected: {
    borderColor: "#0618A8",
    backgroundColor: "#ECEEFB",
  },
  schoolOptionText: {
    fontSize: 15,
    fontFamily: "Raleway-SemiBold",
    color: "#424242",
  },
  schoolOptionTextSelected: {
    color: "#030366",
  },
});
