import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import type { Tabs } from "expo-router";
import React, { type ComponentProps } from "react";
import { Text, TouchableOpacity, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { GlassSurface } from "@/components/ui/liquid-glass";
import { TAB_BAR_MAX_WIDTH } from "@/constants/adaptive-layout";
import { isAuthenticatedTabRoute } from "@/constants/navigation";
import { useAppTheme } from "@/context/app-theme";

const TAB_ICONS: Record<
  string,
  {
    outline: keyof typeof Ionicons.glyphMap;
    filled: keyof typeof Ionicons.glyphMap;
    label: string;
  }
> = {
  index: { outline: "home-outline", filled: "home", label: "Home" },
  community: {
    outline: "people-outline",
    filled: "people",
    label: "Team",
  },
  "check-in": { outline: "heart-outline", filled: "heart", label: "Check in" },
  "game-plan": {
    outline: "map-outline",
    filled: "map",
    label: "Plan",
  },
  clipboard: {
    outline: "sparkles-outline",
    filled: "sparkles",
    label: "Coach",
  },
  profile: {
    outline: "settings-outline",
    filled: "settings",
    label: "Settings",
  },
};

const CENTER_TAB = "check-in";

type FloatingTabBarProps = Parameters<
  NonNullable<ComponentProps<typeof Tabs>["tabBar"]>
>[0];

export default function FloatingTabBar({
  state,
  navigation,
}: FloatingTabBarProps) {
  const { colors, theme } = useAppTheme();
  const { width } = useWindowDimensions();
  const { bottom } = useSafeAreaInsets();
  const isLegacy = theme === "legacy";
  const sideInset = width < 390 ? 12 : 24;
  const barWidth = Math.min(width - sideInset * 2, TAB_BAR_MAX_WIDTH);

  return (
    <GlassSurface
      tone="strong"
      radius={36}
      style={{
        position: "absolute",
        bottom: Math.max(bottom + 8, 16),
        left: (width - barWidth) / 2,
        width: barWidth,
        backgroundColor: isLegacy ? colors.signalDark : undefined,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-evenly",
        height: 70,
        paddingHorizontal: width < 390 ? 4 : 10,
      }}
    >
      {state.routes.map((route, index) => {
        if (!isAuthenticatedTabRoute(route.name)) return null;
        const isFocused = state.index === index;
        const isCenter = route.name === CENTER_TAB;
        const iconSet = TAB_ICONS[route.name];

        const onPress = () => {
          void Haptics.selectionAsync();
          const event = navigation.emit({
            type: "tabPress",
            target: route.key,
            canPreventDefault: true,
          });
          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        if (isCenter) {
          return (
            <TouchableOpacity
              key={route.key}
              onPress={onPress}
              accessibilityRole="tab"
              accessibilityLabel={iconSet.label}
              accessibilityState={{ selected: isFocused }}
              activeOpacity={0.8}
              style={{
                width: 50,
                height: 50,
                borderRadius: 25,
                backgroundColor: colors.signal,
                alignItems: "center",
                justifyContent: "center",
                marginTop: -12,
                shadowColor: colors.signal,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.4,
                shadowRadius: 8,
                elevation: 6,
              }}
            >
              <Ionicons
                name={isFocused ? iconSet.filled : iconSet.outline}
                size={26}
                color={colors.signalInk}
              />
            </TouchableOpacity>
          );
        }

        return (
          <TouchableOpacity
            key={route.key}
            onPress={onPress}
            accessibilityRole="tab"
            accessibilityLabel={iconSet.label}
            accessibilityState={{ selected: isFocused }}
            activeOpacity={0.7}
            style={{
              flex: 1,
              alignItems: "center",
              justifyContent: "center",
              height: 70,
            }}
          >
            <Ionicons
              name={isFocused ? iconSet.filled : iconSet.outline}
              size={24}
              color={
                isLegacy
                  ? isFocused
                    ? colors.inverseText
                    : colors.textTertiary
                  : isFocused
                    ? colors.signal
                    : colors.textSecondary
              }
            />
            {isFocused ? (
              <View style={{ alignItems: "center", marginTop: 3 }}>
                <Text
                  style={{
                    color: isLegacy ? colors.inverseText : colors.signal,
                    fontFamily: "DMMono-Medium",
                    fontSize: 8,
                    letterSpacing: 0.4,
                  }}
                >
                  {iconSet.label}
                </Text>
              </View>
            ) : null}
          </TouchableOpacity>
        );
      })}
    </GlassSurface>
  );
}
