import { Ionicons } from "@expo/vector-icons";
import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import React from "react";
import { Platform, TouchableOpacity, View } from "react-native";

import { useAppTheme } from "@/context/app-theme";

const TAB_ICONS: Record<
  string,
  {
    outline: keyof typeof Ionicons.glyphMap;
    filled: keyof typeof Ionicons.glyphMap;
  }
> = {
  index: { outline: "home-outline", filled: "home" },
  community: { outline: "chatbubbles-outline", filled: "chatbubbles" },
  "check-in": { outline: "heart-outline", filled: "heart" },
  "game-plan": { outline: "clipboard-outline", filled: "clipboard" },
  profile: { outline: "person-outline", filled: "person" },
};

const CENTER_TAB = "check-in";

export default function FloatingTabBar({
  state,
  navigation,
}: BottomTabBarProps) {
  const { colors, theme } = useAppTheme();
  const isLegacy = theme === "legacy";

  return (
    <View
      style={{
        position: "absolute",
        bottom: Platform.OS === "ios" ? 28 : 16,
        left: 24,
        right: 24,
        backgroundColor: isLegacy
          ? "#040485"
          : "rgba(255, 255, 255, 0.9)",
        borderColor: isLegacy ? "transparent" : "rgba(22, 35, 62, 0.12)",
        borderWidth: isLegacy ? 0 : 1,
        borderRadius: 32,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-evenly",
        height: 70,
        paddingHorizontal: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 16,
        elevation: 12,
      }}
    >
      {state.routes.map((route, index) => {
        const isFocused = state.index === index;
        const isCenter = route.name === CENTER_TAB;
        const iconSet = TAB_ICONS[route.name];

        if (!iconSet) return null;

        const onPress = () => {
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
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
