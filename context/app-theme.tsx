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
import { StyleSheet, View } from "react-native";

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

interface ThemeColors {
  signal: string;
  signalInk: string;
  textSecondary: string;
  backgroundGradient: readonly [string, string, string];
}

interface AppThemeContextValue {
  theme: AppTheme;
  setTheme: (theme: AppTheme) => void;
  colors: ThemeColors;
  hasVerifiedSchoolMatch: boolean;
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

  const theme = storedTheme ?? getDefaultAppTheme(hasVerifiedSchoolMatch);
  const signal = theme === "school" ? schoolTheme.signal : "#2f6fed";
  const accent = useMemo(
    () => (theme === "legacy" ? LEGACY_ACCENT : accentScale(signal)),
    [signal, theme],
  );
  const neutral = theme === "legacy" ? LEGACY_NEUTRAL : GLASS_NEUTRAL;
  const isGlass = theme !== "legacy";

  const colors = useMemo<ThemeColors>(
    () => ({
      signal: theme === "legacy" ? LEGACY_ACCENT[600] : signal,
      signalInk: "#ffffff",
      textSecondary: neutral[500],
      backgroundGradient: isGlass
        ? ["#EEF4FC", "#DCE8FB", "#EEF4FC"]
        : ["#FAF8F5", "#FAF8F5", "#FAF8F5"],
    }),
    [isGlass, neutral, signal, theme],
  );

  const themeVariables = useMemo(
    () =>
      vars({
        "--color-cream": rgbToken(isGlass ? "#EEF4FC" : "#FAF8F5"),
        "--color-app-surface": rgbToken("#FFFFFF"),
        "--color-app-surface-alpha": isGlass ? 0.72 : 1,
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
    [accent, isGlass, neutral],
  );

  const setTheme = useCallback((nextTheme: AppTheme) => {
    setStoredTheme(nextTheme);
    void AsyncStorage.setItem(APP_THEME_STORAGE_KEY, nextTheme).catch(() => {
      // Persistence is best-effort; the in-memory selection remains active.
    });
  }, []);

  const value = useMemo(
    () => ({ theme, setTheme, colors, hasVerifiedSchoolMatch }),
    [colors, hasVerifiedSchoolMatch, setTheme, theme],
  );

  return (
    <AppThemeContext.Provider value={value}>
      <View className="flex-1" style={themeVariables}>
        <LinearGradient
          colors={[...colors.backgroundGradient]}
          locations={[0, 0.55, 1]}
          start={{ x: 0.85, y: 0 }}
          end={{ x: 0.15, y: 1 }}
          pointerEvents="none"
          style={StyleSheet.absoluteFill}
        />
        {children}
      </View>
    </AppThemeContext.Provider>
  );
};
