import { useState, useEffect, type ReactNode } from 'react';
import { api, authStorage, type ApiUser } from './api';
import { AuthContext } from './auth-context';

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<ApiUser | null>(authStorage.getUser());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Validate any stored token on mount
    (async () => {
      if (authStorage.getToken()) {
        const me = await api.me();
        if (me) {
          setUser(me);
          authStorage.setUser(me);
        } else {
          authStorage.clear();
          setUser(null);
        }
      }
      setLoading(false);
    })();
  }, []);

  const signIn = async (email: string, password: string) => {
    const res = await api.login(email, password);
    if (!res) return false;
    authStorage.setToken(res.access_token);
    authStorage.setUser(res.user);
    setUser(res.user);
    return true;
  };

  const register = async (email: string, password: string, displayName: string, school?: string, status?: string) => {
    const res = await api.register(email, password, displayName, school, status);
    if (!res) return false;
    authStorage.setToken(res.access_token);
    authStorage.setUser(res.user);
    setUser(res.user);
    return true;
  };

  const signOut = () => {
    authStorage.clear();
    setUser(null);
  };

  const refreshUser = async () => {
    if (!authStorage.getToken()) return;
    const me = await api.me();
    if (me) {
      setUser(me);
      authStorage.setUser(me);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, register, signOut, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};
