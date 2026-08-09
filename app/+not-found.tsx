import { Unmatched, useGlobalSearchParams, usePathname } from "expo-router";
import ResetPasswordScreen from "./(auth)/reset-password";

/**
 * Some development-client versions surface custom-scheme URLs through the
 * unmatched route before their native-intent rewrite is applied. Recover only
 * the exact Appwrite password-reset shape; all other unknown links keep the
 * standard unmatched screen.
 */
export default function NotFound() {
  const pathname = usePathname();
  const parameters = useGlobalSearchParams<{ userId?: string; secret?: string }>();
  const userId = Array.isArray(parameters.userId) ? parameters.userId[0] : parameters.userId;
  const secret = Array.isArray(parameters.secret) ? parameters.secret[0] : parameters.secret;

  if (pathname.includes("reset-password") && userId && secret) {
    return <ResetPasswordScreen />;
  }

  return <Unmatched />;
}
