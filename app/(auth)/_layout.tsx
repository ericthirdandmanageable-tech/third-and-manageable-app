import { Stack } from 'expo-router';
import { useAppTheme } from '@/context/app-theme';

export default function AuthLayout() {
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
