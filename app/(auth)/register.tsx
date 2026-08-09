import { useAuth } from "@/context/auth";
import { signInWithApple, signInWithGoogle, signUp } from "@/services/auth";
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

export default function RegisterScreen() {
  const { refreshUser } = useAuth();
  const scrollRef = useRef<ScrollView>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);
  const [acceptedLegal, setAcceptedLegal] = useState(false);

  const handleRegister = async () => {
    if (
      !firstName.trim() ||
      !lastName.trim() ||
      !email.trim() ||
      !password.trim() ||
      !confirmPassword.trim()
    ) {
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
    if (!acceptedLegal) {
      Alert.alert(
        "Legal Agreement Required",
        "Please accept the Terms & Conditions and Privacy Policy to continue.",
      );
      return;
    }

    setLoading(true);
    try {
      await signUp(email.trim(), password, firstName.trim(), lastName.trim());
      await refreshUser();
    } catch (err: any) {
      Alert.alert(
        "Registration Failed",
        err.message || "Something went wrong.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    if (!acceptedLegal) {
      Alert.alert(
        "Legal Agreement Required",
        "Please accept the Terms & Conditions and Privacy Policy to continue.",
      );
      return;
    }
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
      await refreshUser();
    } catch (err: any) {
      if (!err.message?.includes("cancelled")) {
        Alert.alert(
          "Google Sign-Up Failed",
          err.message || "Something went wrong.",
        );
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleAppleSignUp = async () => {
    if (!acceptedLegal) {
      Alert.alert(
        "Legal Agreement Required",
        "Please accept the Terms & Conditions and Privacy Policy to continue.",
      );
      return;
    }
    setAppleLoading(true);
    try {
      await signInWithApple();
      await refreshUser();
    } catch (err: any) {
      if (!err.message?.includes("cancelled")) {
        Alert.alert(
          "Apple Sign-Up Failed",
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
          contentContainerStyle={{ flexGrow: 1, paddingBottom: 80 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View className="px-7 pt-6 pb-8">
            {/* Logo */}
            <View className="items-center mb-4">
              <Image
                source={require("@/assets/images/logo.png")}
                className="w-14 h-14"
                resizeMode="contain"
              />
            </View>

            {/* Header */}
            <Text className="text-3xl font-raleway-extrabold text-silver-900 mb-1">
              Create Account
            </Text>
            <Text className="text-base text-silver-400 mb-6">
              Join thousands of athletes on their next chapter
            </Text>

            {/* Form */}
            <View className="gap-3 mb-6">
              <View className="flex-row gap-3">
                <View className="flex-1">
                  <Text className="text-xs font-raleway-semibold text-silver-500 uppercase tracking-wider mb-1.5">
                    First Name
                  </Text>
                  <TextInput
                    className="bg-silver-50 border border-silver-200 rounded-2xl px-4 py-3.5 text-base text-silver-900"
                    placeholder="John"
                    placeholderTextColor="#AEAEB2"
                    autoCapitalize="words"
                    autoCorrect={false}
                    value={firstName}
                    onChangeText={setFirstName}
                    onFocus={() =>
                      setTimeout(
                        () =>
                          scrollRef.current?.scrollTo({
                            y: 50,
                            animated: true,
                          }),
                        300,
                      )
                    }
                  />
                </View>
                <View className="flex-1">
                  <Text className="text-xs font-raleway-semibold text-silver-500 uppercase tracking-wider mb-1.5">
                    Last Name
                  </Text>
                  <TextInput
                    className="bg-silver-50 border border-silver-200 rounded-2xl px-4 py-3.5 text-base text-silver-900"
                    placeholder="Doe"
                    placeholderTextColor="#AEAEB2"
                    autoCapitalize="words"
                    autoCorrect={false}
                    value={lastName}
                    onChangeText={setLastName}
                    onFocus={() =>
                      setTimeout(
                        () =>
                          scrollRef.current?.scrollTo({
                            y: 50,
                            animated: true,
                          }),
                        300,
                      )
                    }
                  />
                </View>
              </View>
              <View>
                <Text className="text-xs font-raleway-semibold text-silver-500 uppercase tracking-wider mb-1.5">
                  Email
                </Text>
                <TextInput
                  className="bg-silver-50 border border-silver-200 rounded-2xl px-4 py-3.5 text-base text-silver-900"
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
                        scrollRef.current?.scrollTo({ y: 150, animated: true }),
                      300,
                    )
                  }
                />
              </View>
              <View>
                <Text className="text-xs font-raleway-semibold text-silver-500 uppercase tracking-wider mb-1.5">
                  Password
                </Text>
                <TextInput
                  className="bg-silver-50 border border-silver-200 rounded-2xl px-4 py-3.5 text-base text-silver-900"
                  placeholder="Min. 8 characters"
                  placeholderTextColor="#AEAEB2"
                  secureTextEntry
                  value={password}
                  onChangeText={setPassword}
                  onFocus={() =>
                    setTimeout(
                      () =>
                        scrollRef.current?.scrollTo({ y: 250, animated: true }),
                      300,
                    )
                  }
                />
              </View>
              <View>
                <Text className="text-xs font-raleway-semibold text-silver-500 uppercase tracking-wider mb-1.5">
                  Confirm Password
                </Text>
                <TextInput
                  className="bg-silver-50 border border-silver-200 rounded-2xl px-4 py-3.5 text-base text-silver-900"
                  placeholder="Repeat your password"
                  placeholderTextColor="#AEAEB2"
                  secureTextEntry
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  onFocus={() =>
                    setTimeout(
                      () =>
                        scrollRef.current?.scrollTo({ y: 350, animated: true }),
                      300,
                    )
                  }
                  onSubmitEditing={handleRegister}
                  returnKeyType="done"
                />
              </View>
            </View>

            <TouchableOpacity
              className="flex-row items-start mb-5"
              onPress={() => setAcceptedLegal((prev) => !prev)}
              activeOpacity={0.8}
            >
              <View
                className={`w-5 h-5 rounded-md border items-center justify-center mr-3 mt-0.5 ${acceptedLegal ? "bg-dp-600 border-dp-600" : "border-silver-300"
                  }`}
              >
                {acceptedLegal && (
                  <Ionicons name="checkmark" size={13} color="#fff" />
                )}
              </View>
              <Text className="text-xs text-silver-500 flex-1 leading-5">
                I agree to the{" "}
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
            </TouchableOpacity>

            {/* Sign Up Button */}
            <TouchableOpacity
              className={`bg-dp-600 py-4 rounded-2xl items-center mb-5 ${loading ? "opacity-60" : ""}`}
              style={{
                shadowColor: "#040485",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
                elevation: 6,
              }}
              onPress={handleRegister}
              disabled={loading || googleLoading || appleLoading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="text-white text-base font-raleway-bold tracking-wide">
                  Create Account
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
              className={`flex-row items-center justify-center bg-silver-50 border border-silver-200 rounded-2xl py-4 mb-6 ${googleLoading ? "opacity-60" : ""}`}
              onPress={handleGoogleSignUp}
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
                className={`flex-row items-center justify-center bg-black rounded-2xl py-4 mb-6 ${appleLoading ? "opacity-60" : ""}`}
                onPress={handleAppleSignUp}
                disabled={
                  loading || googleLoading || appleLoading
                }
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

            {/* Login Link */}
            <View className="items-center">
              <Text className="text-sm text-silver-400">
                Already have an account?{" "}
                <Text
                  className="text-dp-600 font-raleway-bold"
                  onPress={() => router.back()}
                >
                  Sign In
                </Text>
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
