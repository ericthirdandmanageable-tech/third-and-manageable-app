import { useAuth } from "@/context/auth";
import { signIn, signInWithApple, signInWithGoogle } from "@/services/auth";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function LoginScreen() {
  const { refreshUser } = useAuth();
  const scrollRef = useRef<ScrollView>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert("Error", "Please fill in all fields.");
      return;
    }
    setLoading(true);
    try {
      await signIn(email.trim(), password);
      await refreshUser();
    } catch (err: any) {
      Alert.alert("Login Failed", err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    Alert.alert(
      "Coming Soon",
      "Continue with Google is coming soon. Please use email and password for now.",
    );
    return;

    setGoogleLoading(true);
    try {
      await signInWithGoogle();
      await refreshUser();
    } catch (err: any) {
      if (!err.message?.includes("cancelled")) {
        Alert.alert(
          "Google Sign-In Failed",
          err.message || "Something went wrong.",
        );
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    setAppleLoading(true);
    try {
      await signInWithApple();
      await refreshUser();
    } catch (err: any) {
      if (!err.message?.includes("cancelled")) {
        Alert.alert(
          "Apple Sign-In Failed",
          err.message || "Something went wrong.",
        );
      }
    } finally {
      setAppleLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 10 : 0}
      >
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={{ flexGrow: 1, paddingBottom: 60 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View className="px-7 pt-8 pb-8">
            {/* Logo */}
            <View className="items-center mb-6">
              <Image
                source={require("@/assets/images/logo.png")}
                className="w-16 h-16"
                resizeMode="contain"
              />
            </View>

            {/* Header */}
            <Text className="text-3xl font-raleway-extrabold text-silver-900 mb-1">
              Welcome Back
            </Text>
            <Text className="text-base text-silver-400 mb-8">
              Sign in to continue your journey
            </Text>

            {/* Form */}
            <View className="gap-4 mb-3">
              <View>
                <Text className="text-xs font-raleway-semibold text-silver-500 uppercase tracking-wider mb-2">
                  Email
                </Text>
                <TextInput
                  className="bg-silver-50 border border-silver-200 rounded-2xl px-4 py-4 text-base text-silver-900"
                  placeholder="you@example.com"
                  placeholderTextColor="#AEAEB2"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  value={email}
                  onChangeText={setEmail}
                  onFocus={() =>
                    setTimeout(
                      () =>
                        scrollRef.current?.scrollTo({ y: 100, animated: true }),
                      300,
                    )
                  }
                />
              </View>
              <View>
                <Text className="text-xs font-raleway-semibold text-silver-500 uppercase tracking-wider mb-2">
                  Password
                </Text>
                <TextInput
                  className="bg-silver-50 border border-silver-200 rounded-2xl px-4 py-4 text-base text-silver-900"
                  placeholder="Enter your password"
                  placeholderTextColor="#AEAEB2"
                  secureTextEntry
                  value={password}
                  onChangeText={setPassword}
                  onFocus={() =>
                    setTimeout(
                      () =>
                        scrollRef.current?.scrollTo({ y: 150, animated: true }),
                      300,
                    )
                  }
                  onSubmitEditing={handleLogin}
                  returnKeyType="done"
                />
              </View>
            </View>

            {/* Forgot Password */}
            <TouchableOpacity className="self-end mb-6">
              <Text className="text-sm font-raleway-semibold text-dp-600">
                Forgot Password?
              </Text>
            </TouchableOpacity>

            {/* Sign In Button */}
            <TouchableOpacity
              className={`bg-dp-600 py-4 rounded-2xl items-center mb-5 ${loading ? "opacity-60" : ""}`}
              style={{
                shadowColor: "#040485",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
                elevation: 6,
              }}
              onPress={handleLogin}
              disabled={loading || googleLoading || appleLoading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="text-white text-base font-raleway-bold tracking-wide">
                  Sign In
                </Text>
              )}
            </TouchableOpacity>

            {/* Divider */}
            <View className="flex-row items-center mb-5">
              <View className="flex-1 h-px bg-silver-200" />
              <Text className="mx-4 text-sm text-silver-400">or</Text>
              <View className="flex-1 h-px bg-silver-200" />
            </View>

            {/* Google Button */}
            <TouchableOpacity
              className={`flex-row items-center justify-center bg-silver-50 border border-silver-200 rounded-2xl py-4 ${googleLoading ? "opacity-60" : ""}`}
              onPress={handleGoogleSignIn}
              disabled={loading || googleLoading || appleLoading}
              activeOpacity={0.7}
            >
              {googleLoading ? (
                <ActivityIndicator size="small" color="#040485" />
              ) : (
                <>
                  <Text className="text-lg font-raleway-bold text-dp-500 mr-2">
                    G
                  </Text>
                  <Text className="text-base text-silver-700 font-raleway-semibold">
                    Continue with Google
                  </Text>
                </>
              )}
            </TouchableOpacity>

            {Platform.OS === "ios" && (
              <TouchableOpacity
                className={`flex-row items-center justify-center bg-black rounded-2xl py-4 mb-8 mt-3 ${appleLoading ? "opacity-60" : ""}`}
                onPress={handleAppleSignIn}
                disabled={loading || googleLoading || appleLoading}
                activeOpacity={0.7}
              >
                {appleLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="logo-apple" size={18} color="#fff" />
                    <Text className="text-base text-white font-raleway-semibold ml-2">
                      Continue with Apple
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            )}

            <View className="items-center mb-5 px-2">
              <Text className="text-xs text-silver-400 text-center leading-5">
                By continuing, you agree to our{" "}
                <Text
                  className="text-dp-600 font-raleway-bold"
                  onPress={() => router.push("/(legal)/terms")}
                >
                  Terms & Conditions
                </Text>{" "}
                and{" "}
                <Text
                  className="text-dp-600 font-raleway-bold"
                  onPress={() => router.push("/(legal)/privacy")}
                >
                  Privacy Policy
                </Text>
                .
              </Text>
            </View>

            {/* Register Link */}
            <View className="items-center">
              <Text className="text-sm text-silver-400">
                Don&apos;t have an account?{" "}
                <Text
                  className="text-dp-600 font-raleway-bold"
                  onPress={() => router.push("/(auth)/register")}
                >
                  Register Now
                </Text>
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
