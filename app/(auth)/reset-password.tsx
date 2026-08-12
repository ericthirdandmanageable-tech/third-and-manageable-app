import { AuthField, AuthScaffold } from "@/components/auth/AuthScaffold";
import { GlassButton } from "@/components/ui/liquid-glass";
import { resetPassword } from "@/services/auth";
import { router, useGlobalSearchParams, useLocalSearchParams } from "expo-router";
import React, { useMemo, useState } from "react";
import { Alert } from "react-native";

function firstParameter(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] || "" : value || "";
}

export default function ResetPasswordScreen() {
  const parameters = useLocalSearchParams<{ userId?: string; secret?: string }>();
  const globalParameters = useGlobalSearchParams<{ userId?: string; secret?: string }>();
  const userId = useMemo(
    () => firstParameter(parameters.userId || globalParameters.userId),
    [parameters.userId, globalParameters.userId],
  );
  const secret = useMemo(
    () => firstParameter(parameters.secret || globalParameters.secret),
    [parameters.secret, globalParameters.secret],
  );
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const hasValidLink = Boolean(userId && secret);

  const handleReset = async () => {
    if (password.length < 8) {
      Alert.alert("Choose a longer password", "Use at least 8 characters.");
      return;
    }
    if (password !== confirmation) {
      Alert.alert("Passwords do not match", "Enter the same password twice.");
      return;
    }

    setSubmitting(true);
    try {
      await resetPassword(userId, secret, password);
      Alert.alert("Password updated", "You can now sign in with your new password.", [
        { text: "Sign in", onPress: () => router.replace("/(auth)/login") },
      ]);
    } catch (error: any) {
      Alert.alert(
        "Reset link unavailable",
        error?.message || "Request a new reset link and try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthScaffold
      eyebrow="Account recovery"
      title={hasValidLink ? "Choose a new password." : "This link is incomplete."}
      subtitle={
        hasValidLink
          ? "Use at least eight characters, then return to your next chapter."
          : "Request a fresh reset link to continue securely."
      }
    >
      {hasValidLink ? (
        <>
          <AuthField
            label="New password"
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
            value={confirmation}
            onChangeText={setConfirmation}
            onSubmitEditing={() => void handleReset()}
            returnKeyType="done"
          />
        </>
      ) : null}

      <GlassButton
        label={hasValidLink ? (submitting ? "Updating…" : "Update password") : "Request a new link"}
        icon={hasValidLink ? "lock-closed-outline" : "refresh-outline"}
        disabled={submitting}
        onPress={hasValidLink ? () => void handleReset() : () => router.replace("/(auth)/forgot-password")}
      />
    </AuthScaffold>
  );
}
