import { Stack } from "expo-router";

export default function LegalLayout() {
  return (
    <Stack
      screenOptions={{
        headerBackTitle: "Back",
        headerTintColor: "#040485",
        headerTitleStyle: { fontFamily: "Raleway-Bold" },
      }}
    />
  );
}
