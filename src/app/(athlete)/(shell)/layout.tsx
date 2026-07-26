"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
    CheckSquare,
    ClipboardList,
    LifeBuoy,
    LogIn,
    Target,
    TrendingUp,
    UserRound,
    Users,
} from "lucide-react";
import clsx from "clsx";

import AuthModal from "@/components/athlete/AuthModal";
import { useAuth } from "@/lib/athlete/auth";

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

export default function ShellLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const { user } = useAuth();
    const [authOpen, setAuthOpen] = useState(false);

    return (
        <div className="flex h-screen bg-bg-base overflow-hidden">
            {/* Sidebar for Desktop */}
            <aside className="hidden md:flex flex-col w-64 border-r border-border-subtle bg-bg-surface">
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
                        href="/progress"
                        className="flex items-center gap-3 px-4 py-3 rounded-lg w-full text-text-secondary hover:bg-bg-elevated hover:text-text-primary transition-all duration-200 text-[15px]"
                    >
                        <TrendingUp className="w-5 h-5" />
                        Progress
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
                    {user ? (
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
                    ) : (
                        <button
                            onClick={() => setAuthOpen(true)}
                            className="flex items-center gap-3 px-4 py-3 rounded-lg w-full bg-volt/10 text-volt font-semibold text-[15px] hover:bg-volt/20 transition-all"
                        >
                            <LogIn className="w-5 h-5" /> Sign in
                        </button>
                    )}
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 flex flex-col relative">
                {/* Mobile sign-in banner — takes layout space, so it never overlaps content */}
                {!user && (
                    <div className="md:hidden flex items-center justify-between gap-3 px-4 py-2.5 bg-bg-surface border-b border-border-subtle">
                        <p className="font-mono text-[11px] uppercase tracking-widest text-text-tertiary">
                            You&apos;re browsing offline
                        </p>
                        <button
                            onClick={() => setAuthOpen(true)}
                            className="flex items-center gap-1.5 bg-volt/10 text-volt text-[12px] font-semibold px-3 py-1.5 rounded-full shrink-0"
                        >
                            <LogIn className="w-3.5 h-3.5" /> Sign in
                        </button>
                    </div>
                )}
                <div className="flex-1 overflow-y-auto pb-20 md:pb-0">{children}</div>

                {/* Bottom Navigation for Mobile */}
                <nav className="md:hidden absolute bottom-0 w-full bg-bg-surface border-t border-border-subtle flex justify-around p-2 z-40">
                    {mobileNavItems.map((item) => (
                        <Link
                            key={item.to}
                            href={item.to}
                            aria-current={isActive(pathname, item.to) ? "page" : undefined}
                            className={clsx(
                                "flex flex-col items-center gap-1 p-2 rounded-lg transition-colors",
                                isActive(pathname, item.to) ? "text-volt" : "text-text-tertiary",
                            )}
                        >
                            <item.icon className="w-6 h-6" />
                            <span className="text-[10px] font-medium">{item.label}</span>
                        </Link>
                    ))}
                </nav>
            </main>

            {authOpen && <AuthModal onClose={() => setAuthOpen(false)} />}
        </div>
    );
}
