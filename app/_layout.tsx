import { useAppTheme, AppThemeProvider } from "@/context/app-theme";
import { useFonts } from "expo-font";
import {
  DefaultTheme,
  Slot,
  ThemeProvider,
  useRouter,
  useSegments,
} from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo } from "react";
import { ActivityIndicator, Text, TextInput, View } from "react-native";
import * as Linking from "expo-linking";
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
  const { colors } = useAppTheme();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    const handleRecoveryLink = (url: string | null) => {
      if (!url) return;

      try {
        const incoming = new URL(url, "thirdandmanageableapp://app");
        const isRecoveryLink =
          incoming.protocol === "thirdandmanageableapp:" &&
          (incoming.hostname === "reset-password" ||
            incoming.pathname === "/reset-password");

        if (!isRecoveryLink) return;

        const userId = incoming.searchParams.get("userId") || "";
        const secret = incoming.searchParams.get("secret") || "";
        router.replace({ pathname: "/reset-password", params: { userId, secret } });
      } catch {
        // Ignore malformed external URLs; the normal router fallback remains safe.
      }
    };

    void Linking.getInitialURL().then(handleRecoveryLink);
    const subscription = Linking.addEventListener("url", ({ url }) => handleRecoveryLink(url));
    return () => subscription.remove();
  }, [router]);

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === "(auth)";
    const inOnboardingGroup = segments[0] === "(onboarding)";
    const inLegalGroup = segments[0] === "(legal)";
    const inPasswordRecovery = segments[0] === "reset-password";

    // Profile must have required onboarding fields to be considered complete
    const isOnboardingComplete =
      Boolean(profile?.sport) &&
      Boolean(profile?.athlete_status) &&
      Boolean(profile?.school) &&
      Boolean(profile?.display_name) &&
      typeof profile?.group_interest === "boolean";

    if (!user) {
      if (!inAuthGroup && !inLegalGroup && !inPasswordRecovery) {
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
  }, [user, profile, isLoading, segments, router]);

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
      <View className="flex-1 justify-center items-center bg-transparent">
        <ActivityIndicator size="large" color={colors.signal} />
      </View>
    );
  }

  return (
    <>
      <Slot />
      <StatusBar
        style={
          segments[0] === "(auth)" && segments[1] === "welcome"
            ? "light"
            : "dark"
        }
      />
    </>
  );
}

function ThemedApplication() {
  const { colors } = useAppTheme();
  const navigationTheme = useMemo(
    () => ({
      ...DefaultTheme,
      colors: {
        ...DefaultTheme.colors,
        primary: colors.signal,
        background: "transparent",
        card: "transparent",
        text: colors.textPrimary,
        border: colors.borderStrong,
        notification: colors.danger,
      },
    }),
    [colors],
  );

  return (
    <ThemeProvider value={navigationTheme}>
      <RootNavigator />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    "Raleway-Regular": require("@expo-google-fonts/raleway/400Regular/Raleway_400Regular.ttf"),
    "Raleway-Medium": require("@expo-google-fonts/raleway/500Medium/Raleway_500Medium.ttf"),
    "Raleway-SemiBold": require("@expo-google-fonts/raleway/600SemiBold/Raleway_600SemiBold.ttf"),
    "Raleway-Bold": require("@expo-google-fonts/raleway/700Bold/Raleway_700Bold.ttf"),
    "Raleway-ExtraBold": require("@expo-google-fonts/raleway/800ExtraBold/Raleway_800ExtraBold.ttf"),
    "InstrumentSerif-Regular": require("@expo-google-fonts/instrument-serif/400Regular/InstrumentSerif_400Regular.ttf"),
    "InstrumentSerif-Italic": require("@expo-google-fonts/instrument-serif/400Regular_Italic/InstrumentSerif_400Regular_Italic.ttf"),
    "DMMono-Regular": require("@expo-google-fonts/dm-mono/400Regular/DMMono_400Regular.ttf"),
    "DMMono-Medium": require("@expo-google-fonts/dm-mono/500Medium/DMMono_500Medium.ttf"),
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
      <AuthProvider>
        <AppThemeProvider>
          <ThemedApplication />
        </AppThemeProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
