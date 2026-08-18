"use client";

import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useSyncExternalStore,
    type ReactNode,
} from "react";

import {
    getDefaultAppTheme,
    readStoredAppTheme,
    subscribeAppTheme,
    writeStoredAppTheme,
    type AppTheme,
} from "@/lib/core/app-theme";
import { getCommunityTheme } from "@/lib/core/community-theme";
import { useAuth } from "./auth";

export interface AppThemeState {
    theme: AppTheme;
    setTheme: (next: AppTheme) => void;
}

const AppThemeContext = createContext<AppThemeState>({} as AppThemeState);

export const useAppTheme = () => useContext(AppThemeContext);

const getServerSnapshot = () => null;

/*
 * One provider, mounted once in the athlete shell (below AuthProvider,
 * since the smart default depends on `user.school`), so every consumer —
 * ShellLayout's `data-app-theme` attribute and Profile's Appearance switcher
 * — reads and writes the same state instead of racing two independent
 * localStorage copies.
 *
 * `useSyncExternalStore` reads the athlete's explicit choice, if any — the
 * correct primitive for a value that lives outside React (localStorage),
 * rather than copying it into `useState` inside an effect. When there is no
 * explicit choice yet, `theme` derives straight from render: School Colors
 * when the verified school has a real palette, Sideline Dusk otherwise.
 * `legacy` (today's dark/volt shell) is never defaulted to — opt-in only.
 */
export const AppThemeProvider = ({ children }: { children: ReactNode }) => {
    const { user } = useAuth();
    const stored = useSyncExternalStore(subscribeAppTheme, readStoredAppTheme, getServerSnapshot);
    const hasVerifiedSchoolMatch =
        Boolean(user?.verified) && getCommunityTheme(user?.school).key !== "tm";
    const theme: AppTheme = stored ?? getDefaultAppTheme(hasVerifiedSchoolMatch);

    useEffect(() => {
        document.documentElement.setAttribute("data-app-theme", theme);
        // On unmount — leaving the shell for `/login` or `/onboarding`,
        // which keep their own hand-authored dark design and never mount
        // this provider — drop the attribute so those pages don't inherit
        // glass tokens their hardcoded backgrounds weren't built for.
        return () => {
            document.documentElement.removeAttribute("data-app-theme");
        };
    }, [theme]);

    const setTheme = useCallback((next: AppTheme) => {
        writeStoredAppTheme(next);
    }, []);

    return (
        <AppThemeContext.Provider value={{ theme, setTheme }}>
            {children}
        </AppThemeContext.Provider>
    );
};
