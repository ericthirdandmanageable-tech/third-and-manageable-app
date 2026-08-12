import { AuthField, AuthScaffold } from "@/components/auth/AuthScaffold";
import { GlassButton, GlassSurface, SectionLabel } from "@/components/ui/liquid-glass";
import { useAppTheme } from "@/context/app-theme";
import { requestPasswordRecovery } from "@/services/auth";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";

export default function ForgotPasswordScreen() {
  const { colors } = useAppTheme();
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [requested, setRequested] = useState(false);

  const handleRequest = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
      Alert.alert("Enter your email", "Please enter a valid email address.");
      return;
    }

    setSubmitting(true);
    try {
      await requestPasswordRecovery(normalizedEmail);
      setRequested(true);
    } catch (error: any) {
      Alert.alert(
        "Unable to send reset email",
        error?.message || "Please try again later or contact support.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthScaffold
      eyebrow="Account recovery"
      title={requested ? "Check your email." : "Reset your password."}
      subtitle={
        requested
          ? "If an account exists for that address, a one-hour reset link is on its way."
          : "Enter the email attached to your athlete profile."
      }
    >
      {requested ? (
        <GlassSurface tone="signal" style={styles.confirmation}>
          <View style={[styles.confirmationIcon, { backgroundColor: colors.signalSoft }]}>
            <Ionicons name="mail-outline" size={22} color={colors.signal} />
          </View>
          <View style={styles.confirmationCopy}>
            <SectionLabel style={styles.confirmationLabel}>Link requested</SectionLabel>
            <Text style={[styles.confirmationText, { color: colors.textSecondary }]}>Open the email on this device to choose a new password.</Text>
          </View>
        </GlassSurface>
      ) : (
        <AuthField
          label="Email"
          placeholder="you@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          value={email}
          onChangeText={setEmail}
          onSubmitEditing={() => void handleRequest()}
          returnKeyType="send"
        />
      )}

      <GlassButton
        label={requested ? "Back to sign in" : submitting ? "Sending…" : "Send reset link"}
        icon={requested ? "arrow-back" : "mail-outline"}
        disabled={submitting}
        onPress={requested ? () => router.replace("/(auth)/login") : () => void handleRequest()}
      />
      {!requested ? (
        <GlassButton label="Back" variant="glass" onPress={() => router.back()} />
      ) : null}
    </AuthScaffold>
  );
}

const styles = StyleSheet.create({
  confirmation: { padding: 16, flexDirection: "row", alignItems: "center", gap: 12 },
  confirmationIcon: { width: 44, height: 44, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  confirmationCopy: { flex: 1 },
  confirmationLabel: { marginBottom: 3 },
  confirmationText: { fontFamily: "Raleway-Medium", fontSize: 12, lineHeight: 18 },
});
