import FloatingTabBar from "@/components/FloatingTabBar";
import { Tabs } from "expo-router";
import React from "react";

export default function TabLayout() {
  return (
      <Tabs
        tabBar={(props) => <FloatingTabBar {...props} />}
        screenOptions={{
          headerShown: false,
          tabBarShowLabel: false,
          sceneStyle: { backgroundColor: "transparent" },
        }}
      >
        <Tabs.Screen name="index" />
        <Tabs.Screen name="community" />
        <Tabs.Screen name="check-in" />
        <Tabs.Screen name="game-plan" />
        <Tabs.Screen name="clipboard" />
        <Tabs.Screen name="path-detail" options={{ href: null }} />
        <Tabs.Screen name="profile" options={{ href: null }} />
        <Tabs.Screen name="progress" options={{ href: null }} />
        <Tabs.Screen name="notifications" options={{ href: null }} />
        <Tabs.Screen name="explore" options={{ href: null }} />
        <Tabs.Screen name="support" options={{ href: null }} />
        <Tabs.Screen name="perks" options={{ href: null }} />
      </Tabs>
  );
}
