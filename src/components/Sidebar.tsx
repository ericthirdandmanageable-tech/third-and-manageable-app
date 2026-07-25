"use client";
import {
    BarChart3,
    ClipboardList,
    Heart,
    LifeBuoy,
    LogOut,
    Menu,
    MessageCircle,
    Users,
    X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const NAV_ITEMS = [
    { href: "/", label: "Overview", icon: BarChart3 },
    { href: "/users", label: "Users", icon: Users },
    { href: "/support", label: "Support", icon: LifeBuoy },
    { href: "/community", label: "Community", icon: MessageCircle },
    { href: "/checkins", label: "Check-Ins", icon: Heart },
    { href: "/gameplans", label: "Game Plans", icon: ClipboardList },
];

export default function Sidebar() {
    const pathname = usePathname();
    const [open, setOpen] = useState(false);

    const navContent = (
        <>
            <div className="p-6 border-b border-gray-800 flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-bold text-white">T&M Admin</h1>
                    <p className="text-xs text-gray-400 mt-1">Third & Manageable</p>
                </div>
                <button onClick={() => setOpen(false)} className="lg:hidden text-gray-400 hover:text-white">
                    <X size={20} />
                </button>
            </div>
            <nav className="flex-1 p-4 space-y-1">
                {NAV_ITEMS.map((item) => {
                    const isActive = pathname === item.href;
                    const Icon = item.icon;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => setOpen(false)}
                            className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${isActive
                                    ? "bg-blue-600/20 text-blue-400 border border-blue-500/30"
                                    : "text-gray-400 hover:bg-gray-800/50 hover:text-white"
                                }`}
                        >
                            <Icon size={18} />
                            {item.label}
                        </Link>
                    );
                })}
            </nav>
            <div className="p-4 border-t border-gray-800">
                <form action="/api/logout" method="POST">
                    <button
                        type="submit"
                        className="w-full flex items-center gap-3 text-left px-4 py-2 text-sm text-gray-500 hover:text-red-400 transition-colors"
                    >
                        <LogOut size={16} />
                        Sign Out
                    </button>
                </form>
            </div>
        </>
    );

    return (
        <>
            {/* Mobile header bar */}
            <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-gray-950 border-b border-gray-800 px-4 py-3 flex items-center justify-between">
                <h1 className="text-lg font-bold text-white">T&M Admin</h1>
                <button onClick={() => setOpen(true)} className="text-gray-400 hover:text-white p-1">
                    <Menu size={22} />
                </button>
            </div>

            {/* Mobile overlay */}
            {open && (
                <div
                    className="lg:hidden fixed inset-0 bg-black/60 z-40"
                    onClick={() => setOpen(false)}
                />
            )}

            {/* Mobile slide-out drawer */}
            <aside
                className={`lg:hidden fixed top-0 left-0 bottom-0 w-64 bg-gray-950 border-r border-gray-800 z-50 flex flex-col transform transition-transform duration-200 ${open ? "translate-x-0" : "-translate-x-full"
                    }`}
            >
                {navContent}
            </aside>

            {/* Desktop sidebar */}
            <aside className="hidden lg:flex w-64 bg-gray-950 border-r border-gray-800 flex-col min-h-screen shrink-0">
                {navContent}
            </aside>
        </>
    );
}
