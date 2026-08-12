import { Ionicons } from "@expo/vector-icons";
import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import * as Haptics from "expo-haptics";
import React from "react";
import { Platform, Text, TouchableOpacity, View } from "react-native";

import { GlassSurface } from "@/components/ui/liquid-glass";
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
};

const CENTER_TAB = "check-in";

export default function FloatingTabBar({
  state,
  navigation,
}: BottomTabBarProps) {
  const { colors, theme } = useAppTheme();
  const isLegacy = theme === "legacy";

  return (
    <GlassSurface
      tone="strong"
      radius={36}
      style={{
        position: "absolute",
        bottom: Platform.OS === "ios" ? 28 : 16,
        left: 24,
        right: 24,
        backgroundColor: isLegacy ? "#040485" : undefined,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-evenly",
        height: 70,
        paddingHorizontal: 10,
      }}
    >
      {state.routes.map((route, index) => {
        const isFocused = state.index === index;
        const isCenter = route.name === CENTER_TAB;
        const iconSet = TAB_ICONS[route.name];

        if (!iconSet) return null;

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
                    ? "#FFFFFF"
                    : "#6B6B80"
                  : isFocused
                    ? colors.signal
                    : colors.textSecondary
              }
            />
            {isFocused ? (
              <View style={{ alignItems: "center", marginTop: 3 }}>
                <Text
                  style={{
                    color: isLegacy ? "#FFFFFF" : colors.signal,
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
