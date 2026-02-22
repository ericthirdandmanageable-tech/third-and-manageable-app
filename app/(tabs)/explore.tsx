// This file is kept to avoid Expo Router errors but is hidden from tabs via _layout.tsx
import { Redirect } from "expo-router";

export default function ExploreRedirect() {
  return <Redirect href="/(tabs)" />;
}
