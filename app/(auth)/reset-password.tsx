import { resetPassword } from "@/services/auth";
import { router, useGlobalSearchParams, useLocalSearchParams } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

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

  const hasValidLink = Boolean(userId && secret);

  return (
    <SafeAreaView className="flex-1 bg-white">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View className="flex-1 px-7 justify-center">
          <Text className="text-3xl font-raleway-extrabold text-silver-900 mb-2">
            Choose a new password
          </Text>
          <Text className="text-base text-silver-400 mb-8 leading-6">
            {hasValidLink
              ? "Choose a password with at least 8 characters."
              : "This reset link is incomplete or has expired. Request a new one to continue."}
          </Text>

          {hasValidLink && (
            <>
              <Text className="text-xs font-raleway-semibold text-silver-500 uppercase tracking-wider mb-2">
                New password
              </Text>
              <TextInput
                className="bg-silver-50 border border-silver-200 rounded-2xl px-4 py-4 text-base text-silver-900 mb-4"
                placeholder="New password"
                placeholderTextColor="#AEAEB2"
                secureTextEntry
                autoComplete="new-password"
                value={password}
                onChangeText={setPassword}
              />
              <Text className="text-xs font-raleway-semibold text-silver-500 uppercase tracking-wider mb-2">
                Confirm password
              </Text>
              <TextInput
                className="bg-silver-50 border border-silver-200 rounded-2xl px-4 py-4 text-base text-silver-900 mb-6"
                placeholder="Repeat new password"
                placeholderTextColor="#AEAEB2"
                secureTextEntry
                autoComplete="new-password"
                value={confirmation}
                onChangeText={setConfirmation}
                onSubmitEditing={handleReset}
                returnKeyType="done"
              />
            </>
          )}

          <TouchableOpacity
            className={`bg-dp-600 py-4 rounded-2xl items-center ${submitting ? "opacity-60" : ""}`}
            onPress={hasValidLink ? handleReset : () => router.replace("/(auth)/forgot-password")}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-white text-base font-raleway-bold">
                {hasValidLink ? "Update password" : "Request a new link"}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
