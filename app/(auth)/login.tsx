import {
  AuthDivider,
  AuthField,
  AuthProviderButton,
  AuthScaffold,
} from "@/components/auth/AuthScaffold";
import { GlassButton } from "@/components/ui/liquid-glass";
import { useAppTheme } from "@/context/app-theme";
import { useAuth } from "@/context/auth";
import { signIn, signInWithApple, signInWithGoogle } from "@/services/auth";
import { router } from "expo-router";
import React, { useState } from "react";
import { Alert, Platform, Pressable, StyleSheet, Text, View } from "react-native";

export default function LoginScreen() {
  const { refreshUser } = useAuth();
  const { colors } = useAppTheme();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);
  const busy = loading || googleLoading || appleLoading;

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert("Error", "Please fill in all fields.");
      return;
    }
    setLoading(true);
    try {
      await signIn(email.trim(), password);
      await refreshUser();
    } catch (error: any) {
      Alert.alert("Login Failed", error.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
      await refreshUser();
    } catch (error: any) {
      if (!error.message?.includes("cancelled")) {
        Alert.alert("Google Sign-In Failed", error.message || "Something went wrong.");
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
    } catch (error: any) {
      if (!error.message?.includes("cancelled")) {
        Alert.alert("Apple Sign-In Failed", error.message || "Something went wrong.");
      }
    } finally {
      setAppleLoading(false);
    }
  };

  return (
    <AuthScaffold
      eyebrow="Welcome back"
      title="Pick up where you left off."
      subtitle="Sign in to return to your team, plan, and private Clipboard coach."
    >
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
        placeholder="Enter your password"
        secureTextEntry
        autoComplete="current-password"
        value={password}
        onChangeText={setPassword}
        onSubmitEditing={() => void handleLogin()}
        returnKeyType="done"
      />

      <Pressable
        onPress={() => router.push("/(auth)/forgot-password")}
        style={styles.forgot}
      >
        <Text style={[styles.link, { color: colors.signal }]}>Forgot password?</Text>
      </Pressable>

      <GlassButton
        label={loading ? "Signing in…" : "Sign in"}
        icon="arrow-forward"
        disabled={busy}
        onPress={() => void handleLogin()}
      />

      <AuthDivider />
      <AuthProviderButton
        provider="google"
        loading={googleLoading}
        disabled={busy}
        onPress={() => void handleGoogleSignIn()}
      />
      {Platform.OS === "ios" ? (
        <AuthProviderButton
          provider="apple"
          loading={appleLoading}
          disabled={busy}
          onPress={() => void handleAppleSignIn()}
        />
      ) : null}

      <Text style={[styles.legal, { color: colors.textTertiary }]}>
        By continuing, you agree to our{" "}
        <Text style={[styles.link, { color: colors.signal }]} onPress={() => router.push("/(legal)/terms")}>Terms</Text>
        {" "}and{" "}
        <Text style={[styles.link, { color: colors.signal }]} onPress={() => router.push("/(legal)/privacy")}>Privacy Policy</Text>.
      </Text>

      <View style={styles.accountRow}>
        <Text style={[styles.accountCopy, { color: colors.textSecondary }]}>New to the team?</Text>
        <Text
          style={[styles.link, { color: colors.signal }]}
          onPress={() => router.push("/(auth)/register")}
        >
          Create an account
        </Text>
      </View>
    </AuthScaffold>
  );
}

const styles = StyleSheet.create({
  forgot: { alignSelf: "flex-end", paddingVertical: 2 },
  link: { fontFamily: "Raleway-Bold", fontSize: 12 },
  legal: { fontFamily: "Raleway-Medium", fontSize: 10, lineHeight: 16, textAlign: "center" },
  accountRow: { flexDirection: "row", justifyContent: "center", flexWrap: "wrap", gap: 5 },
  accountCopy: { fontFamily: "Raleway-Medium", fontSize: 12 },
});
