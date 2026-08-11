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

const isAppTheme = (value: string | null): value is AppTheme =>
    value === "legacy" || value === "dusk" || value === "school";

/** `null` means "no explicit choice yet" — the caller should apply a smart default. */
export const readStoredAppTheme = (): AppTheme | null => {
    if (typeof window === "undefined") return null;
    try {
        const stored = window.localStorage.getItem(APP_THEME_STORAGE_KEY);
        return isAppTheme(stored) ? stored : null;
    } catch {
        return null;
    }
};

type Listener = () => void;
const listeners = new Set<Listener>();

/**
 * `useSyncExternalStore`'s subscribe function — localStorage itself has no
 * change event within the tab that wrote it, so `writeStoredAppTheme`
 * notifies these listeners directly instead of relying on the cross-tab
 * `storage` event (which never fires for same-tab writes).
 */
export const subscribeAppTheme = (listener: Listener): (() => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
};

export const writeStoredAppTheme = (theme: AppTheme): void => {
    try {
        window.localStorage.setItem(APP_THEME_STORAGE_KEY, theme);
    } catch {
        // Private browsing or storage disabled — the choice just won't persist.
    }
    listeners.forEach((listener) => listener());
};
