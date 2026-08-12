import { getCurrentUser, getProfile } from "@/services/auth";
import { Profile } from "@/types";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { Models } from "react-native-appwrite";

interface AuthContextType {
  user: Models.User<Models.Preferences> | null;
  profile: Profile | null;
  isLoading: boolean;
  refreshUser: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  isLoading: true,
  refreshUser: async () => {},
  refreshProfile: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Models.User<Models.Preferences> | null>(
    null,
  );
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const currentUser = await getCurrentUser();
      setUser(currentUser);
      if (currentUser) {
        const p = await getProfile(currentUser.$id);
        setProfile(p);
      } else {
        setProfile(null);
      }
    } catch {
      setUser(null);
      setProfile(null);
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!user?.$id) {
      setProfile(null);
      return;
    }
    try {
      const p = await getProfile(user.$id);
      setProfile(p);
    } catch (err) {
      console.error("Error fetching profile:", err);
    }
  }, [user?.$id]);

  useEffect(() => {
    refreshUser().finally(() => setIsLoading(false));
  }, [refreshUser]);

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        isLoading,
        refreshUser,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
