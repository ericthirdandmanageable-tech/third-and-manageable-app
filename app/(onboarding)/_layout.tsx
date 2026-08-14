import { Stack } from 'expo-router';
import { useAppTheme } from '@/context/app-theme';

export default function OnboardingLayout() {
  const { reduceMotion } = useAppTheme();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: reduceMotion ? 'none' : 'slide_from_right',
      }}
    />
  );
}
