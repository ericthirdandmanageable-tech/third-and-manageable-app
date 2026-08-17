import { ensureTextContrast, WCAG_AA_TEXT } from "./contrast";

/*
 * The three surface treatments an athlete can choose between (Profile →
 * Appearance). `legacy` is today's shipped dark/volt-neon shell, kept
 * pixel-identical as an explicit opt-in. `dusk` and `school` are the
 * liquid-glass reskin — see globals.css `[data-app-theme]` blocks — and
 * differ only in whether the "signal" accent (`--color-volt`) comes from
 * a fixed blue or the athlete's verified school (`community-theme.ts`).
 */
export type AppTheme = "legacy" | "dusk" | "school";

export const APP_THEME_STORAGE_KEY = "tm-app-theme";
export const APP_THEME_GLASS_BASE = "#eef4fc";

/** A school's authored primary, adjusted only when shell text/buttons need it. */
export const getSchoolAppThemeSignal = (primary: string): string =>
    ensureTextContrast(primary, APP_THEME_GLASS_BASE, WCAG_AA_TEXT);

/**
 * Public URL roots rendered with the athlete theme. Most live in
 * `(athlete)/(shell)`; `/onboarding` mounts its own provider so the original
 * flow can use the same Liquid Glass appearance without theming `/login`.
 * Keep this list explicit:
 * the root layout's pre-paint script runs before React knows which route group
 * is active, and treating every non-auth URL as athlete UI leaks its tokens
 * into `/admin` and the root 404 boundary.
 */
export const APP_SHELL_ROUTE_PREFIXES = [
    "/clipboard",
    "/community",
    "/game-plan",
    "/onboarding",
    "/notifications",
    "/perks",
    "/privacy",
    "/profile",
    "/progress",
    "/support",
    "/terms",
] as const;

export const isAppShellPath = (pathname: string): boolean =>
    pathname === "/" ||
    APP_SHELL_ROUTE_PREFIXES.some(
        (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
    );

export const getDefaultAppTheme = (hasVerifiedSchoolMatch: boolean): AppTheme =>
    hasVerifiedSchoolMatch ? "school" : "dusk";

const isAppTheme = (value: string | null): value is AppTheme =>
    value === "legacy" || value === "dusk" || value === "school";

/** `null` means "no explicit choice yet" — the caller should apply a smart default. */
export const readStoredAppTheme = (): AppTheme | null => {
    if (typeof window === "undefined") return null;
    try {
        const stored = window.localStorage.getItem(APP_THEME_STORAGE_KEY);
        return isAppTheme(stored) ? stored : inMemoryTheme;
    } catch {
        return inMemoryTheme;
    }
};

type Listener = () => void;
const listeners = new Set<Listener>();
let inMemoryTheme: AppTheme | null = null;

const notifyListeners = () => listeners.forEach((listener) => listener());

const handleStorage = (event: StorageEvent) => {
    if (event.key !== APP_THEME_STORAGE_KEY && event.key !== null) return;
    inMemoryTheme = isAppTheme(event.newValue) ? event.newValue : null;
    notifyListeners();
};

/**
 * `useSyncExternalStore`'s subscribe function — localStorage itself has no
 * change event within the tab that wrote it, so `writeStoredAppTheme`
 * notifies these listeners directly instead of relying on the cross-tab
 * `storage` event (which never fires for same-tab writes).
 */
export const subscribeAppTheme = (listener: Listener): (() => void) => {
    if (listeners.size === 0 && typeof window !== "undefined") {
        window.addEventListener("storage", handleStorage);
    }
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
        if (listeners.size === 0 && typeof window !== "undefined") {
            window.removeEventListener("storage", handleStorage);
        }
    };
};

export const writeStoredAppTheme = (theme: AppTheme): void => {
    // Keep the switcher functional even when browser storage is unavailable.
    // `localStorage` is persistence, not the React store's only backing value.
    inMemoryTheme = theme;
    try {
        window.localStorage.setItem(APP_THEME_STORAGE_KEY, theme);
    } catch {
        // Private browsing or storage disabled — the in-tab choice still works.
    }
    notifyListeners();
};
