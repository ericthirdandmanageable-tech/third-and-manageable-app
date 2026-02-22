import { DarkTheme, ThemeProvider } from "@react-navigation/native";
import { useFonts } from "expo-font";
import { Slot, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { ActivityIndicator, Text, TextInput, View } from "react-native";
import "react-native-reanimated";
import "../global.css";

import ErrorBoundary from "@/components/ErrorBoundary";
import { AuthProvider, useAuth } from "@/context/auth";
import {
  registerForPushNotifications,
  scheduleDailyReminder,
} from "@/lib/notifications";
import { storePushToken } from "@/services/notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";

SplashScreen.preventAutoHideAsync();

// Apply Raleway as default font for all Text and TextInput
(Text as any).defaultProps = (Text as any).defaultProps || {};
(Text as any).defaultProps.style = { fontFamily: "Raleway-Regular" };
(TextInput as any).defaultProps = (TextInput as any).defaultProps || {};
(TextInput as any).defaultProps.style = { fontFamily: "Raleway-Regular" };

function RootNavigator() {
  const { user, profile, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === "(auth)";
    const inOnboardingGroup = segments[0] === "(onboarding)";
    const inLegalGroup = segments[0] === "(legal)";

    // Profile must have required onboarding fields to be considered complete
    const isOnboardingComplete =
      Boolean(profile?.sport) &&
      Boolean(profile?.athlete_status) &&
      Boolean(profile?.school) &&
      Boolean(profile?.display_name) &&
      typeof profile?.group_interest === "boolean";

    if (!user) {
      if (!inAuthGroup && !inLegalGroup) {
        router.replace("/(auth)/welcome");
      }
    } else if (!isOnboardingComplete) {
      if (!inOnboardingGroup && !inLegalGroup) {
        router.replace("/(onboarding)/athlete-status");
      }
    } else {
      if (inAuthGroup || inOnboardingGroup) {
        router.replace("/(tabs)");
      }
    }
  }, [user, profile, isLoading, segments]);

  // Register push notifications when user is authenticated
  useEffect(() => {
    if (!user?.$id || !profile) return;
    (async () => {
      try {
        const token = await registerForPushNotifications();
        if (token) {
          await storePushToken(user.$id, token);
        }
        // Auto-schedule daily reminder on first launch
        const hasScheduled = await AsyncStorage.getItem("daily_reminder_set");
        if (!hasScheduled) {
          await scheduleDailyReminder(9);
          await AsyncStorage.setItem("daily_reminder_set", "true");
        }
      } catch (err) {
        console.log("Notification setup skipped:", err);
      }
    })();
  }, [user?.$id, profile]);

  if (isLoading) {
    return (
      <View className="flex-1 justify-center items-center bg-white">
        <ActivityIndicator size="large" color="#040485" />
      </View>
    );
  }

  return (
    <>
      <Slot />
      <StatusBar style="dark" />
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    "Raleway-Regular": require("@expo-google-fonts/raleway/400Regular/Raleway_400Regular.ttf"),
    "Raleway-Medium": require("@expo-google-fonts/raleway/500Medium/Raleway_500Medium.ttf"),
    "Raleway-SemiBold": require("@expo-google-fonts/raleway/600SemiBold/Raleway_600SemiBold.ttf"),
    "Raleway-Bold": require("@expo-google-fonts/raleway/700Bold/Raleway_700Bold.ttf"),
    "Raleway-ExtraBold": require("@expo-google-fonts/raleway/800ExtraBold/Raleway_800ExtraBold.ttf"),
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <ErrorBoundary>
      <ThemeProvider value={DarkTheme}>
        <AuthProvider>
          <RootNavigator />
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
