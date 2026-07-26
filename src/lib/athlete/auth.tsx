"use client";

import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useState,
    type ReactNode,
} from "react";

import { api, authStorage, type ApiUser } from "./api";

export interface AuthState {
    user: ApiUser | null;
    loading: boolean;
    signIn: (email: string, password: string) => Promise<boolean>;
    register: (
        email: string,
        password: string,
        displayName: string,
        school?: string,
        status?: string,
    ) => Promise<boolean>;
    signOut: () => Promise<void>;
    /* Re-fetch /auth/me after profile edits so nav + pages see fresh fields. */
    refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthState>({} as AuthState);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    /*
     * Starts signed-out and unresolved on purpose. This subtree is prerendered
     * on the server, where there is no `localStorage` to read — seeding state
     * from storage during render would both throw there and produce a
     * hydration mismatch for anyone actually signed in. The effect below is
     * the single point where stored state enters.
     */
    const [user, setUser] = useState<ApiUser | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        (async () => {
            if (!authStorage.getToken()) {
                setLoading(false);
                return;
            }
            // Show the cached user immediately, then confirm it against the
            // server — a revoked or expired token must not stay usable.
            setUser(authStorage.getUser());
            const me = await api.me();
            if (me) {
                setUser(me);
                authStorage.setUser(me);
            } else {
                authStorage.clear();
                setUser(null);
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

    const register = async (
        email: string,
        password: string,
        displayName: string,
        school?: string,
        status?: string,
    ) => {
        const res = await api.register(email, password, displayName, school, status);
        if (!res) return false;
        authStorage.setToken(res.access_token);
        authStorage.setUser(res.user);
        setUser(res.user);
        return true;
    };

    const signOut = useCallback(async () => {
        // Bump `auth_version` server-side first: clearing localStorage only
        // makes the token unreachable from this browser, it does not make it
        // invalid. Local state is cleared either way — a failed call must not
        // leave someone stuck looking signed in.
        await api.logout();
        authStorage.clear();
        setUser(null);
    }, []);

    const refreshUser = useCallback(async () => {
        if (!authStorage.getToken()) return;
        const me = await api.me();
        if (me) {
            setUser(me);
            authStorage.setUser(me);
        }
    }, []);

    return (
        <AuthContext.Provider
            value={{ user, loading, signIn, register, signOut, refreshUser }}
        >
            {children}
        </AuthContext.Provider>
    );
};
