import { GlassSurface } from "@/components/ui/liquid-glass";
import { requestPasswordRecovery } from "@/services/auth";
import { router } from "expo-router";
import React, { useState } from "react";
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

export default function ForgotPasswordScreen() {
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
      // Do not disclose whether an account exists for the supplied address.
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
    <SafeAreaView className="flex-1 bg-transparent">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <GlassSurface tone="strong" className="flex-1 mx-5 my-8 px-7 justify-center">
          <Text className="text-3xl font-raleway-extrabold text-silver-900 mb-2">
            Reset password
          </Text>
          <Text className="text-base text-silver-400 mb-8 leading-6">
            Enter your email and we&apos;ll send a one-hour reset link.
          </Text>

          {requested ? (
            <View className="bg-dp-50 rounded-2xl p-5">
              <Text className="text-base font-raleway-bold text-dp-700 mb-2">
                Check your email
              </Text>
              <Text className="text-sm text-silver-600 leading-5 mb-5">
                If an account exists for that address, a reset link is on its
                way. Open it on this device to choose a new password.
              </Text>
              <TouchableOpacity
                className="bg-dp-600 py-4 rounded-2xl items-center"
                onPress={() => router.replace("/(auth)/login")}
              >
                <Text className="text-white text-base font-raleway-bold">
                  Back to sign in
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <Text className="text-xs font-raleway-semibold text-silver-500 uppercase tracking-wider mb-2">
                Email
              </Text>
              <TextInput
                className="bg-silver-50 border border-silver-200 rounded-2xl px-4 py-4 text-base text-silver-900 mb-6"
                placeholder="you@example.com"
                placeholderTextColor="#AEAEB2"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                value={email}
                onChangeText={setEmail}
                onSubmitEditing={handleRequest}
                returnKeyType="send"
              />
              <TouchableOpacity
                className={`bg-dp-600 py-4 rounded-2xl items-center ${submitting ? "opacity-60" : ""}`}
                onPress={handleRequest}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text className="text-white text-base font-raleway-bold">
                    Send reset link
                  </Text>
                )}
              </TouchableOpacity>
            </>
          )}

          <TouchableOpacity
            className="items-center mt-6"
            onPress={() => router.back()}
          >
            <Text className="text-sm font-raleway-semibold text-dp-600">
              Back
            </Text>
          </TouchableOpacity>
        </GlassSurface>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
