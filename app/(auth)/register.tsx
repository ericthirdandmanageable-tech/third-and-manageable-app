import {
  AuthDivider,
  AuthField,
  AuthProviderButton,
  AuthScaffold,
} from "@/components/auth/AuthScaffold";
import { GlassButton } from "@/components/ui/liquid-glass";
import { useAppTheme } from "@/context/app-theme";
import { useAuth } from "@/context/auth";
import { signInWithApple, signInWithGoogle, signUp } from "@/services/auth";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";

export default function RegisterScreen() {
  const { refreshUser } = useAuth();
  const { colors } = useAppTheme();
  const { width } = useWindowDimensions();
  const compact = width < 400;
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);
  const [acceptedLegal, setAcceptedLegal] = useState(false);
  const busy = loading || googleLoading || appleLoading;

  const validateLegal = () => {
    if (acceptedLegal) return true;
    Alert.alert(
      "Legal Agreement Required",
      "Please accept the Terms and Privacy Policy to continue.",
    );
    return false;
  };

  const handleRegister = async () => {
    if (![firstName, lastName, email, password, confirmPassword].every((value) => value.trim())) {
      Alert.alert("Error", "Please fill in all fields.");
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match.");
      return;
    }
    if (password.length < 8) {
      Alert.alert("Error", "Password must be at least 8 characters.");
      return;
    }
    if (!validateLegal()) return;

    setLoading(true);
    try {
      await signUp(email.trim(), password, firstName.trim(), lastName.trim());
      await refreshUser();
    } catch (error: any) {
      Alert.alert("Registration Failed", error.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    if (!validateLegal()) return;
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
      await refreshUser();
    } catch (error: any) {
      if (!error.message?.includes("cancelled")) {
        Alert.alert("Google Sign-Up Failed", error.message || "Something went wrong.");
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleAppleSignUp = async () => {
    if (!validateLegal()) return;
    setAppleLoading(true);
    try {
      await signInWithApple();
      await refreshUser();
    } catch (error: any) {
      if (!error.message?.includes("cancelled")) {
        Alert.alert("Apple Sign-Up Failed", error.message || "Something went wrong.");
      }
    } finally {
      setAppleLoading(false);
    }
  };

  return (
    <AuthScaffold
      eyebrow="Join the team"
      title="Build what comes after sport."
      subtitle="Create a private athlete profile, then shape the experience around your university and next chapter."
    >
      <View style={[styles.nameRow, compact && styles.nameStack]}>
        <View style={styles.nameField}>
          <AuthField
            label="First name"
            placeholder="First name"
            autoCapitalize="words"
            autoCorrect={false}
            value={firstName}
            onChangeText={setFirstName}
          />
        </View>
        <View style={styles.nameField}>
          <AuthField
            label="Last name"
            placeholder="Last name"
            autoCapitalize="words"
            autoCorrect={false}
            value={lastName}
            onChangeText={setLastName}
          />
        </View>
      </View>
      <AuthField
        label="Email"
        placeholder="you@example.com"
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        value={email}
        onChangeText={setEmail}
      />
      <AuthField
        label="Password"
        placeholder="At least 8 characters"
        secureTextEntry
        autoComplete="new-password"
        value={password}
        onChangeText={setPassword}
      />
      <AuthField
        label="Confirm password"
        placeholder="Repeat your password"
        secureTextEntry
        autoComplete="new-password"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        onSubmitEditing={() => void handleRegister()}
        returnKeyType="done"
      />

      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: acceptedLegal }}
        onPress={() => setAcceptedLegal((value) => !value)}
        style={styles.legalRow}
      >
        <View
          style={[
            styles.checkbox,
            {
              backgroundColor: acceptedLegal ? colors.signal : colors.surfaceStrong,
              borderColor: acceptedLegal ? colors.signal : colors.borderStrong,
            },
          ]}
        >
          {acceptedLegal ? (
            <Ionicons name="checkmark" size={14} color={colors.signalInk} />
          ) : null}
        </View>
        <Text style={[styles.legal, { color: colors.textSecondary }]}>I agree to the <Text style={[styles.link, { color: colors.signal }]} onPress={() => router.push("/(legal)/terms")}>Terms</Text> and <Text style={[styles.link, { color: colors.signal }]} onPress={() => router.push("/(legal)/privacy")}>Privacy Policy</Text>.</Text>
      </Pressable>

      <GlassButton
        label={loading ? "Creating account…" : "Create account"}
        icon="arrow-forward"
        disabled={busy}
        onPress={() => void handleRegister()}
      />
      <AuthDivider />
      <AuthProviderButton
        provider="google"
        loading={googleLoading}
        disabled={busy}
        onPress={() => void handleGoogleSignUp()}
      />
      {Platform.OS === "ios" ? (
        <AuthProviderButton
          provider="apple"
          loading={appleLoading}
          disabled={busy}
          onPress={() => void handleAppleSignUp()}
        />
      ) : null}

      <View style={styles.accountRow}>
        <Text style={[styles.accountCopy, { color: colors.textSecondary }]}>Already have an account?</Text>
        <Text style={[styles.link, { color: colors.signal }]} onPress={() => router.replace("/(auth)/login")}>Sign in</Text>
      </View>
    </AuthScaffold>
  );
}

const styles = StyleSheet.create({
  nameRow: { flexDirection: "row", gap: 10 },
  nameStack: { flexDirection: "column", gap: 14 },
  nameField: { flex: 1 },
  legalRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  checkbox: { width: 22, height: 22, borderRadius: 7, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  legal: { flex: 1, fontFamily: "Raleway-Medium", fontSize: 11, lineHeight: 17 },
  link: { fontFamily: "Raleway-Bold", fontSize: 12 },
  accountRow: { flexDirection: "row", justifyContent: "center", flexWrap: "wrap", gap: 5 },
  accountCopy: { fontFamily: "Raleway-Medium", fontSize: 12 },
});
