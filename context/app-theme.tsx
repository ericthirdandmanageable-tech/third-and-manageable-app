import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { vars } from "nativewind";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { AccessibilityInfo, StyleSheet, View } from "react-native";

import {
  APP_THEME_STORAGE_KEY,
  getDefaultAppTheme,
  getSchoolTheme,
  isAppTheme,
  type AppTheme,
} from "@/constants/app-theme";
import { useAuth } from "@/context/auth";

interface Rgb {
  r: number;
  g: number;
  b: number;
}

const hexToRgb = (hex: string): Rgb => {
  const value = hex.replace("#", "");
  return {
    r: Number.parseInt(value.slice(0, 2), 16),
    g: Number.parseInt(value.slice(2, 4), 16),
    b: Number.parseInt(value.slice(4, 6), 16),
  };
};

const rgbToken = (hex: string): string => {
  const { r, g, b } = hexToRgb(hex);
  return `${r} ${g} ${b}`;
};

const mix = (hex: string, target: "white" | "black", amount: number): string => {
  const { r, g, b } = hexToRgb(hex);
  const endpoint = target === "white" ? 255 : 0;
  const channel = (value: number) => Math.round(value + (endpoint - value) * amount);
  return `#${[channel(r), channel(g), channel(b)]
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("")}`;
};

const accentScale = (signal: string) => ({
  50: mix(signal, "white", 0.9),
  100: mix(signal, "white", 0.8),
  200: mix(signal, "white", 0.65),
  300: mix(signal, "white", 0.45),
  400: mix(signal, "white", 0.25),
  500: mix(signal, "white", 0.1),
  600: signal,
  700: mix(signal, "black", 0.15),
  800: mix(signal, "black", 0.3),
  900: mix(signal, "black", 0.45),
});

const LEGACY_ACCENT = {
  50: "#ECEEFB",
  100: "#D0D4F5",
  200: "#A1A8EB",
  300: "#6E78D9",
  400: "#3940C9",
  500: "#0618A8",
  600: "#040485",
  700: "#030366",
  800: "#020247",
  900: "#01012E",
};

const LEGACY_NEUTRAL = {
  50: "#FAFAFA",
  100: "#F5F5F5",
  200: "#EEEEEE",
  300: "#E0E0E0",
  400: "#BDBDBD",
  500: "#9E9E9E",
  600: "#757575",
  700: "#616161",
  800: "#424242",
  900: "#212121",
};

const GLASS_NEUTRAL = {
  50: "#F7F9FC",
  100: "#E2E8F1",
  200: "#CED6E2",
  300: "#B6C0CF",
  400: "#8B97AA",
  500: "#6C7690",
  600: "#5A657C",
  700: "#46536D",
  800: "#2B3955",
  900: "#16233E",
};

export interface ThemeColors {
  signal: string;
  signalDark: string;
  signalSoft: string;
  signalInk: string;
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  surface: string;
  surfaceStrong: string;
  surfaceMuted: string;
  border: string;
  borderStrong: string;
  success: string;
  warning: string;
  danger: string;
  backgroundGradient: readonly [string, string, string];
  ambient: string;
}

interface AppThemeContextValue {
  theme: AppTheme;
  setTheme: (theme: AppTheme) => void;
  colors: ThemeColors;
  hasVerifiedSchoolMatch: boolean;
  reduceTransparency: boolean;
  isGlass: boolean;
  schoolTheme: ReturnType<typeof getSchoolTheme>;
}

const AppThemeContext = createContext<AppThemeContextValue | null>(null);

export const useAppTheme = (): AppThemeContextValue => {
  const context = useContext(AppThemeContext);
  if (!context) throw new Error("useAppTheme must be used within AppThemeProvider");
  return context;
};

export const AppThemeProvider = ({ children }: { children: ReactNode }) => {
  const { profile } = useAuth();
  const matchedSchoolTheme = getSchoolTheme(profile?.school);
  const hasVerifiedSchoolMatch =
    Boolean(profile?.verified) && matchedSchoolTheme.key !== "tm";
  const schoolTheme = hasVerifiedSchoolMatch
    ? matchedSchoolTheme
    : getSchoolTheme(null);
  const [storedTheme, setStoredTheme] = useState<AppTheme | null>(null);
  const [reduceTransparency, setReduceTransparency] = useState(false);

  useEffect(() => {
    let active = true;
    void AsyncStorage.getItem(APP_THEME_STORAGE_KEY)
      .then((value) => {
        if (active && isAppTheme(value)) setStoredTheme(value);
      })
      .catch(() => {
        // A storage failure must not prevent the safe default from rendering.
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const getReduceTransparency =
      AccessibilityInfo.isReduceTransparencyEnabled;
    if (typeof getReduceTransparency !== "function") return;

    let active = true;
    void getReduceTransparency.call(AccessibilityInfo).then((enabled) => {
      if (active) setReduceTransparency(enabled);
    });
    const subscription = AccessibilityInfo.addEventListener(
      "reduceTransparencyChanged",
      setReduceTransparency,
    );
    return () => {
      active = false;
      subscription.remove();
    };
  }, []);

  const theme = storedTheme ?? getDefaultAppTheme(hasVerifiedSchoolMatch);
  const signal = theme === "school" ? schoolTheme.signal : "#2F6FED";
  const accent = useMemo(
    () => (theme === "legacy" ? LEGACY_ACCENT : accentScale(signal)),
    [signal, theme],
  );
  const neutral = theme === "legacy" ? LEGACY_NEUTRAL : GLASS_NEUTRAL;
  const isGlass = theme !== "legacy";

  const colors = useMemo<ThemeColors>(
    () => ({
      signal: theme === "legacy" ? LEGACY_ACCENT[600] : signal,
      signalDark:
        theme === "school" ? schoolTheme.signalDark : theme === "legacy" ? "#030366" : "#173F9A",
      signalSoft:
        theme === "school" ? schoolTheme.soft : theme === "legacy" ? "#ECEEFB" : "#DCE8FB",
      signalInk: "#ffffff",
      textPrimary: neutral[900],
      textSecondary: neutral[500],
      textTertiary: neutral[400],
      surface: isGlass ? "rgba(255,255,255,0.62)" : "#FFFFFF",
      surfaceStrong: isGlass ? "rgba(255,255,255,0.84)" : "#FFFFFF",
      surfaceMuted: isGlass ? "rgba(238,244,252,0.58)" : "#F5F5F5",
      border: isGlass ? "rgba(255,255,255,0.7)" : "#EEEEEE",
      borderStrong: isGlass ? "rgba(22,35,62,0.14)" : "#E0E0E0",
      success: "#15805F",
      warning: "#B56A12",
      danger: "#C33D4D",
      backgroundGradient: isGlass
        ? [mix(signal, "white", 0.92), mix(signal, "white", 0.84), "#F8FAFD"]
        : ["#FAF8F5", "#FAF8F5", "#FAF8F5"],
      ambient: isGlass ? `${signal}2E` : "transparent",
    }),
    [isGlass, neutral, schoolTheme.signalDark, schoolTheme.soft, signal, theme],
  );

  const themeVariables = useMemo(
    () =>
      vars({
        "--color-cream": rgbToken(isGlass ? "#EEF4FC" : "#FAF8F5"),
        "--color-app-surface": rgbToken("#FFFFFF"),
        "--color-app-surface-alpha": isGlass && !reduceTransparency ? 0.68 : 0.94,
        ...Object.fromEntries(
          Object.entries(accent).map(([shade, value]) => [
            `--color-dp-${shade}`,
            rgbToken(value),
          ]),
        ),
        ...Object.fromEntries(
          Object.entries(neutral).map(([shade, value]) => [
            `--color-silver-${shade}`,
            rgbToken(value),
          ]),
        ),
      }),
    [accent, isGlass, neutral, reduceTransparency],
  );

  const setTheme = useCallback((nextTheme: AppTheme) => {
    setStoredTheme(nextTheme);
    void AsyncStorage.setItem(APP_THEME_STORAGE_KEY, nextTheme).catch(() => {
      // Persistence is best-effort; the in-memory selection remains active.
    });
  }, []);

  const value = useMemo(
    () => ({
      theme,
      setTheme,
      colors,
      hasVerifiedSchoolMatch,
      reduceTransparency,
      isGlass,
      schoolTheme,
    }),
    [
      colors,
      hasVerifiedSchoolMatch,
      isGlass,
      reduceTransparency,
      schoolTheme,
      setTheme,
      theme,
    ],
  );

  return (
    <AppThemeContext.Provider value={value}>
      <View className="flex-1" style={[styles.appRoot, themeVariables]}>
        <LinearGradient
          colors={[...colors.backgroundGradient]}
          locations={[0, 0.55, 1]}
          start={{ x: 0.85, y: 0 }}
          end={{ x: 0.15, y: 1 }}
          pointerEvents="none"
          style={StyleSheet.absoluteFill}
        />
        {isGlass && !reduceTransparency ? (
          <>
            <View
              pointerEvents="none"
              style={[
                styles.ambientOrb,
                styles.ambientOrbTop,
                { backgroundColor: colors.ambient },
              ]}
            />
            <View
              pointerEvents="none"
              style={[
                styles.ambientOrb,
                styles.ambientOrbBottom,
                { backgroundColor: `${colors.signalSoft}99` },
              ]}
            />
          </>
        ) : null}
        {children}
      </View>
    </AppThemeContext.Provider>
  );
};

const styles = StyleSheet.create({
  appRoot: {
    overflow: "hidden",
  },
  ambientOrb: {
    position: "absolute",
    width: 280,
    height: 280,
    borderRadius: 140,
  },
  ambientOrbTop: {
    right: -120,
    top: 90,
  },
  ambientOrbBottom: {
    bottom: 40,
    left: -150,
  },
});
