type NativeIntentOptions = {
  path: string;
  initial: boolean;
};

/**
 * Appwrite's HTTPS recovery handoff enters the native app as
 * thirdandmanageableapp://reset-password?... . In a native URL that first
 * segment is an authority, not a pathname, so rewrite it before Expo Router
 * attempts its normal route match.
 */
export function redirectSystemPath({ path }: NativeIntentOptions): string {
  try {
    const incoming = new URL(path, "thirdandmanageableapp://app");
    const isRecoveryLink =
      incoming.protocol === "thirdandmanageableapp:" &&
      (incoming.hostname === "reset-password" || incoming.pathname === "/reset-password");

    if (!isRecoveryLink) {
      return path;
    }

    const parameters = new URLSearchParams();
    for (const key of ["userId", "secret"]) {
      const value = incoming.searchParams.get(key);
      if (value) parameters.set(key, value);
    }

    const query = parameters.toString();
    return query ? `/reset-password?${query}` : "/reset-password";
  } catch {
    // Never let malformed external links crash the native app.
    return "/reset-password";
  }
}
