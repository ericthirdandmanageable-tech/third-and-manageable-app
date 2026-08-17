"use client";

import { useEffect, useState, type CSSProperties } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
    Bell,
    CheckSquare,
    ClipboardList,
    LifeBuoy,
    Target,
    TrendingUp,
    Trophy,
    UserRound,
    Users,
} from "lucide-react";
import clsx from "clsx";

import { api } from "@/lib/athlete/api";
import { AppThemeProvider, useAppTheme } from "@/lib/athlete/app-theme";
import { useAuth } from "@/lib/athlete/auth";
import { getSchoolAppThemeSignal } from "@/lib/core/app-theme";
import { getCommunityTheme } from "@/lib/core/community-theme";

const navItems = [
    { to: "/", icon: CheckSquare, label: "Check-in" },
    { to: "/game-plan", icon: Target, label: "Game Plan" },
    { to: "/clipboard", icon: ClipboardList, label: "Clipboard" },
    { to: "/community", icon: Users, label: "Community" },
];

// Mobile gets a fifth tab: Profile — the account home (edits, sign-out,
// and the route to Progress + Support on small screens).
const mobileNavItems = [...navItems, { to: "/profile", icon: UserRound, label: "Profile" }];

/*
 * The app shell — sidebar on desktop, bottom tabs on mobile.
 *
 * react-router's `<NavLink end>` is `usePathname()` here: `/` has to match
 * exactly or every route would light it up, and the others match their own
 * subtree so `/community/path-gig` keeps Community active.
 */
const isActive = (pathname: string, to: string) =>
    to === "/" ? pathname === "/" : pathname === to || pathname.startsWith(`${to}/`);

/*
 * The liquid-glass reskin (Sideline Dusk / Campus Colors) is scoped to the
 * shell only — `AppThemeProvider` is mounted here, not up in the `(athlete)`
 * route group, because `/login` and `/onboarding` have their own
 * hand-authored dark design (hardcoded near-black backgrounds) that the
 * theme's light-surface text tokens would render illegibly against.
 */
export default function ShellLayout({ children }: { children: React.ReactNode }) {
    return (
        <AppThemeProvider>
            <ShellChrome>{children}</ShellChrome>
        </AppThemeProvider>
    );
}

function ShellChrome({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const { user, loading } = useAuth();
    const { theme: appTheme } = useAppTheme();
    const [intakeGate, setIntakeGate] = useState<{
        userId: string | null;
        state: "ready" | "needs-onboarding" | "unavailable";
    }>({ userId: null, state: "unavailable" });
    const [intakeAttempt, setIntakeAttempt] = useState(0);
    const intakeState =
        user && intakeGate.userId === user.id ? intakeGate.state : "loading";
    const inCommunity = pathname.startsWith("/community");
    const communityTheme = getCommunityTheme(user?.school);
    const schoolSignal = getSchoolAppThemeSignal(communityTheme.primary);
    /*
     * Campus Colors reuses the same glass base as Sideline Dusk (see
     * globals.css) and layers the athlete's verified school on top as an
     * inline var override — the "signal" tokens only, so the structural
     * liquid-glass system stays constant and just changes flavor. The signal
     * is the primary brand hue adjusted only as far as needed for small text on
     * a light surface; using the raw BGSU orange here would make both links
     * and white-on-orange buttons fail WCAG AA.
     */
    const shellStyle =
        appTheme === "school"
            ? ({
                  "--color-volt": schoolSignal,
                  "--color-volt-ink": "#ffffff",
                  "--color-sand": communityTheme.accent,
              } as CSSProperties)
            : undefined;

    useEffect(() => {
        if (loading || user) return;
        const next = pathname === "/" ? "" : `?next=${encodeURIComponent(pathname)}`;
        router.replace(`/login${next}`);
    }, [loading, pathname, router, user]);

    useEffect(() => {
        if (loading || !user) return;
        let cancelled = false;
        (async () => {
            const plan = await api.getGamePlan();
            if (cancelled) return;
            if (!plan) setIntakeGate({ userId: user.id, state: "unavailable" });
            else if (plan.intake_done) {
                setIntakeGate({ userId: user.id, state: "ready" });
            }
            else {
                setIntakeGate({ userId: user.id, state: "needs-onboarding" });
                router.replace("/onboarding");
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [intakeAttempt, loading, router, user]);

    if (loading || !user || intakeState !== "ready") {
        return (
            <div
                className="app-shell flex min-h-[100svh] items-center justify-center bg-bg-base"
                style={shellStyle}
            >
                <div className="text-center">
                    <p className="font-serif text-2xl italic text-sand">Third &amp; Manageable</p>
                    <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.2em] text-text-tertiary">
                        {loading || (user && intakeState === "loading")
                            ? "Loading your season…"
                            : !user
                              ? "Taking you to sign in…"
                              : intakeState === "needs-onboarding"
                                ? "Taking you to onboarding…"
                                : "Your season could not be loaded"}
                    </p>
                    {user && intakeState === "unavailable" && (
                        <button
                            onClick={() => {
                                setIntakeGate({ userId: null, state: "unavailable" });
                                setIntakeAttempt((attempt) => attempt + 1);
                            }}
                            className="mt-5 rounded-full bg-volt px-5 py-2.5 text-sm font-semibold text-volt-ink"
                        >
                            Try again
                        </button>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="app-shell flex h-[100svh] overflow-hidden bg-bg-base" style={shellStyle}>
            {/* Sidebar for Desktop */}
            <aside className="liquid-glass hidden w-64 flex-col border-r border-border-subtle bg-bg-surface md:flex">
                <div className="p-6 pb-4">
                    <h1 className="font-serif text-2xl text-sand italic">Third &amp; Manageable</h1>
                    <div className="yard-line mt-4" />
                </div>
                <nav className="flex-1 px-4 space-y-1 mt-2">
                    {navItems.map((item) => (
                        <Link
                            key={item.to}
                            href={item.to}
                            aria-current={isActive(pathname, item.to) ? "page" : undefined}
                            className={clsx(
                                "flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 text-[15px]",
                                isActive(pathname, item.to)
                                    ? "bg-volt/10 text-volt font-semibold"
                                    : "text-text-secondary hover:bg-bg-elevated hover:text-text-primary",
                            )}
                        >
                            <item.icon className="w-5 h-5" />
                            {item.label}
                        </Link>
                    ))}
                </nav>
                <div className="p-4 border-t border-border-subtle space-y-1">
                    <Link
                        href="/notifications"
                        className="flex items-center gap-3 px-4 py-3 rounded-lg w-full text-text-secondary hover:bg-bg-elevated hover:text-text-primary transition-all duration-200 text-[15px]"
                    >
                        <Bell className="w-5 h-5" />
                        Notifications
                    </Link>
                    <Link
                        href="/progress"
                        className="flex items-center gap-3 px-4 py-3 rounded-lg w-full text-text-secondary hover:bg-bg-elevated hover:text-text-primary transition-all duration-200 text-[15px]"
                    >
                        <TrendingUp className="w-5 h-5" />
                        Progress
                    </Link>
                    <Link
                        href="/perks"
                        className="flex items-center gap-3 px-4 py-3 rounded-lg w-full text-text-secondary hover:bg-bg-elevated hover:text-text-primary transition-all duration-200 text-[15px]"
                    >
                        <Trophy className="w-5 h-5" />
                        Perks
                    </Link>
                    <Link
                        href="/support"
                        className="flex items-center gap-3 px-4 py-3 rounded-lg w-full text-text-secondary hover:bg-bg-elevated hover:text-text-primary transition-all duration-200 text-[15px]"
                    >
                        <LifeBuoy className="w-5 h-5 text-danger" />
                        Support
                    </Link>
                </div>
                {/* Account — the whole block opens the Profile page */}
                <div className="p-4 border-t border-border-subtle">
                    <button
                        onClick={() => router.push("/profile")}
                        className="flex items-center gap-3 w-full text-left rounded-lg hover:bg-bg-elevated p-1 -m-1 transition-colors group"
                    >
                        <div className="w-9 h-9 rounded-full bg-volt/10 flex items-center justify-center font-mono text-[12px] text-volt shrink-0">
                            {user.display_name.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-[14px] font-semibold text-text-primary truncate group-hover:text-volt transition-colors">
                                {user.display_name}
                            </p>
                            <p className="text-[12px] text-text-tertiary truncate">
                                {user.headline ?? "View profile"}
                            </p>
                        </div>
                    </button>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="relative flex min-w-0 flex-1 flex-col">
                <div className="flex-1 overflow-y-auto pb-28 md:pb-0">{children}</div>

                {/* Bottom Navigation for Mobile */}
                <nav
                    className={clsx(
                        "mobile-tab-bar liquid-glass absolute z-40 flex justify-around rounded-[30px] border px-1.5 py-1.5 transition-colors md:hidden",
                        inCommunity
                            ? "border-white/20 shadow-[0_16px_40px_rgba(7,28,79,0.24)]"
                            : "border-border-subtle bg-bg-surface/90",
                    )}
                    style={
                        inCommunity
                            ? {
                                  backgroundColor: `color-mix(in srgb, ${communityTheme.text} 88%, transparent)`,
                              }
                            : undefined
                    }
                >
                    {mobileNavItems.map((item) => (
                        <Link
                            key={item.to}
                            href={item.to}
                            aria-current={isActive(pathname, item.to) ? "page" : undefined}
                            className={clsx(
                                "flex min-h-14 min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-[22px] px-1 py-1.5 transition-colors",
                                inCommunity
                                    ? isActive(pathname, item.to)
                                        ? "bg-white/14 text-white"
                                        : "text-white/60 hover:bg-white/8 hover:text-white"
                                    : isActive(pathname, item.to)
                                      ? "bg-volt/12 text-volt"
                                      : "text-text-tertiary hover:bg-bg-elevated hover:text-text-secondary",
                            )}
                        >
                            <item.icon className="h-5.5 w-5.5" />
                            <span className="text-[10px] font-medium">{item.label}</span>
                        </Link>
                    ))}
                </nav>
            </main>
        </div>
    );
}
