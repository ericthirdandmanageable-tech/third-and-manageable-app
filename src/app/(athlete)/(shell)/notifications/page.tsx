"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
    ArrowLeft,
    Bell,
    CheckCheck,
    ClipboardCheck,
    Flame,
    Heart,
    ShieldCheck,
    Sparkles,
    Users,
    type LucideIcon,
} from "lucide-react";
import clsx from "clsx";

import { api, type ApiNotification } from "@/lib/athlete/api";

const ICONS: Record<string, LucideIcon> = {
    heart: Heart,
    clipboard: ClipboardCheck,
    flame: Flame,
    sparkles: Sparkles,
    shield: ShieldCheck,
    at: Users,
};

const DESTINATIONS: Record<ApiNotification["type"], string | null> = {
    checkin: "/",
    gameplan: "/game-plan",
    streak: "/progress",
    milestone: "/progress",
    welcome: null,
    mention: "/community",
};

export function formatNotificationTime(value: string, now = new Date()): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    const minutes = Math.max(0, Math.floor((now.getTime() - date.getTime()) / 60_000));
    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function NotificationsPage() {
    const router = useRouter();
    const [notifications, setNotifications] = useState<ApiNotification[]>([]);
    const [loading, setLoading] = useState(true);
    const [unavailable, setUnavailable] = useState(false);

    const load = useCallback(async () => {
        const rows = await api.notifications();
        if (rows) {
            setNotifications(rows);
            setUnavailable(false);
        } else {
            setUnavailable(true);
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            const rows = await api.notifications();
            if (cancelled) return;
            if (rows) {
                setNotifications(rows);
                setUnavailable(false);
            } else {
                setUnavailable(true);
            }
            setLoading(false);
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    const unreadCount = useMemo(
        () => notifications.filter((notification) => !notification.read).length,
        [notifications],
    );

    const openNotification = async (notification: ApiNotification) => {
        if (!notification.read) {
            const result = await api.markNotificationRead(notification.id);
            if (result) {
                setNotifications((current) =>
                    current.map((item) =>
                        item.id === notification.id ? { ...item, read: true } : item,
                    ),
                );
            }
        }
        const destination = DESTINATIONS[notification.type];
        if (destination) router.push(destination);
    };

    const markAllRead = async () => {
        const result = await api.markAllNotificationsRead();
        if (result) {
            setNotifications((current) => current.map((item) => ({ ...item, read: true })));
        }
    };

    return (
        <div className="p-6 md:p-10 max-w-3xl mx-auto animate-rise">
            <header className="mb-8">
                <div className="flex items-start gap-3">
                    <button
                        type="button"
                        onClick={() => router.back()}
                        aria-label="Go back"
                        className="mt-1 rounded-full border border-border-subtle p-2 text-text-tertiary transition hover:border-volt/50 hover:text-volt"
                    >
                        <ArrowLeft className="h-4 w-4" />
                    </button>
                    <div className="min-w-0 flex-1">
                        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-text-tertiary">
                            Activity
                        </p>
                        <h1 className="font-serif text-4xl italic text-sand">Notifications</h1>
                    </div>
                    {unreadCount > 0 && (
                        <button
                            type="button"
                            onClick={markAllRead}
                            className="inline-flex items-center gap-2 rounded-full border border-volt/35 bg-volt/10 px-3 py-2 text-[12px] font-semibold text-volt transition hover:bg-volt/15"
                        >
                            <CheckCheck className="h-4 w-4" /> Mark all read
                        </button>
                    )}
                </div>
                <div className="yard-line mt-4" />
            </header>

            {loading ? (
                <div className="rounded-[20px] border border-border-subtle bg-bg-surface p-10 text-center">
                    <p className="font-mono text-[11px] uppercase tracking-widest text-text-tertiary animate-pulse">
                        Loading activity…
                    </p>
                </div>
            ) : unavailable ? (
                <div className="rounded-[20px] border border-border-subtle bg-bg-surface p-8 text-center">
                    <Bell className="mx-auto h-9 w-9 text-text-tertiary" />
                    <h2 className="mt-4 text-lg font-semibold text-text-primary">Activity is unavailable</h2>
                    <p className="mt-1 text-sm text-text-secondary">Your notifications are still safe. Try again in a moment.</p>
                    <button type="button" onClick={() => { setLoading(true); void load(); }} className="mt-5 rounded-full bg-volt px-5 py-2.5 text-sm font-semibold text-volt-ink">Try again</button>
                </div>
            ) : notifications.length === 0 ? (
                <div className="rounded-[20px] border border-border-subtle bg-bg-surface p-10 text-center">
                    <Bell className="mx-auto h-10 w-10 text-text-tertiary" />
                    <h2 className="mt-4 text-lg font-semibold text-text-primary">No notifications yet</h2>
                    <p className="mt-1 text-sm text-text-secondary">Check in and complete your Game Plan to see activity here.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {notifications.map((notification) => {
                        const Icon = ICONS[notification.icon] ?? Bell;
                        return (
                            <button
                                type="button"
                                key={notification.id}
                                onClick={() => openNotification(notification)}
                                className={clsx(
                                    "flex w-full items-start gap-4 rounded-[20px] border p-5 text-left transition",
                                    notification.read
                                        ? "border-border-subtle bg-bg-surface hover:border-text-tertiary"
                                        : "border-volt/35 bg-volt/10 hover:border-volt/60",
                                )}
                            >
                                <span className={clsx("flex h-10 w-10 shrink-0 items-center justify-center rounded-full", notification.read ? "bg-bg-elevated text-text-secondary" : "bg-volt text-volt-ink")}>
                                    <Icon className="h-4.5 w-4.5" />
                                </span>
                                <span className="min-w-0 flex-1">
                                    <span className="flex items-center gap-2">
                                        <span className="font-semibold text-text-primary">{notification.title}</span>
                                        {!notification.read && <span className="h-2 w-2 rounded-full bg-volt" aria-label="Unread" />}
                                    </span>
                                    <span className="mt-1 block text-[13px] leading-relaxed text-text-secondary">{notification.body}</span>
                                    <span className="mt-2 block font-mono text-[10px] uppercase tracking-wider text-text-tertiary">{formatNotificationTime(notification.timestamp)}</span>
                                </span>
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
