"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
    Check,
    ChevronRight,
    Flame,
    LifeBuoy,
    LogOut,
    Pencil,
    RefreshCw,
    Route,
    Sparkles,
    Target,
    TrendingUp,
    Watch,
    X,
} from "lucide-react";
import clsx from "clsx";

import AccountVerification from "@/components/athlete/AccountVerification";
import { api } from "@/lib/athlete/api";
import { useAuth } from "@/lib/athlete/auth";
import { useCheckIns } from "@/lib/athlete/use-checkins";
import { useGamePlan } from "@/lib/athlete/use-game-plan";
import { getPath } from "@/lib/core/paths";

/*
 * Profile — the career-defining page. Who you were (sport, role, years),
 * who you're becoming (the headline: one line you'd put on a jersey), and
 * the direction you've committed to. Also the account home: edits, intake
 * retake, sign-out — reachable from every screen via the bottom tab.
 */

const STATUS_LABELS: Record<string, string> = {
    competing: "Currently competing",
    transitioning: "Transitioning out",
    transitioned: "Transitioned",
};

const ACCOUNT_ROWS = [
    { icon: TrendingUp, label: "Progress & artifacts", to: "/progress", danger: false },
    { icon: RefreshCw, label: "Retake the skill intake", to: "/game-plan?retake=1", danger: false },
    { icon: LifeBuoy, label: "Support — crisis lines & help", to: "/support", danger: true },
];

export default function ProfilePage() {
    const router = useRouter();
    const { user, signOut, refreshUser } = useAuth();
    const { data } = useGamePlan();
    const { streak, dayNumber, history } = useCheckIns();

    /*
     * The edit form is one nullable piece of state, seeded from `user` when
     * editing opens and thrown away when it closes. Keeping four independent
     * fields in sync with `user` needed an effect that reassigned them on
     * every change to the user object — which also silently discarded whatever
     * the athlete had typed if a background `/auth/me` refresh landed
     * mid-edit. `null` here means "not editing", so there is nothing to sync.
     */
    const [form, setForm] = useState<{
        name: string;
        school: string;
        status: string;
        headline: string;
    } | null>(null);
    const [busy, setBusy] = useState(false);

    const editing = form !== null;
    const startEditing = () =>
        setForm({
            name: user?.display_name ?? "",
            school: user?.school ?? "",
            status: user?.status ?? "transitioning",
            headline: user?.headline ?? "",
        });
    const status = form?.status ?? user?.status ?? "transitioning";

    // Intake summary (sport/role/years) — from the backend when authed, local
    // intake answers otherwise.
    const [intake, setIntake] = useState<Record<string, string>>(data.intakeAnswers ?? {});
    useEffect(() => {
        (async () => {
            if (!user) return;
            const p = await api.getProfile();
            if (p?.intake_answers) setIntake(p.intake_answers);
        })();
    }, [user]);

    const save = async () => {
        if (!form) return;
        setBusy(true);
        const res = await api.updateProfile({
            display_name: form.name.trim() || undefined,
            school: form.school.trim(),
            status: form.status,
            headline: form.headline.trim(),
        });
        setBusy(false);
        if (res) {
            await refreshUser();
            setForm(null);
        }
    };

    const committedPath = getPath(data.committedPathId ?? undefined);
    const sport = intake.sport;

    return (
        <div className="p-6 md:p-10 max-w-3xl mx-auto animate-rise">
            <header className="mb-8">
                <h1 className="font-serif text-4xl text-sand italic mb-2">Your Profile</h1>
                <p className="font-mono text-[11px] uppercase tracking-widest text-text-tertiary">
                    Who you were · who you&apos;re becoming
                </p>
                <div className="yard-line mt-4" />
            </header>

            {/* ——— The jersey card: identity + headline ——— */}
            <section className="bg-bg-surface rounded-[20px] border border-border-subtle p-6 md:p-8 mb-6 grain">
                <div className="flex items-start gap-4 mb-6">
                    <div className="w-14 h-14 rounded-full bg-volt/10 flex items-center justify-center font-mono text-lg text-volt shrink-0">
                        {(user?.display_name ?? "TM").slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                        {editing ? (
                            <input
                                value={form.name}
                                aria-label="Display name"
                                onChange={(e) => setForm({ ...form, name: e.target.value })}
                                maxLength={40}
                                className="w-full bg-bg-elevated border border-border-subtle rounded-xl px-3 py-2 text-[17px] font-semibold text-text-primary focus:outline-none focus:border-volt focus:ring-1 focus:ring-volt mb-1"
                            />
                        ) : (
                            <h2 className="text-[19px] font-semibold text-text-primary truncate">
                                {user?.display_name ?? "Guest athlete"}
                            </h2>
                        )}
                        {editing ? (
                            <input
                                value={form.school}
                                aria-label="School"
                                onChange={(e) => setForm({ ...form, school: e.target.value })}
                                placeholder="School"
                                className="w-full bg-bg-elevated border border-border-subtle rounded-xl px-3 py-2 text-[13px] text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-volt focus:ring-1 focus:ring-volt mt-1"
                            />
                        ) : (
                            <p className="text-[13px] text-text-tertiary">
                                {[user?.school, user?.email].filter(Boolean).join(" · ") ||
                                    "Browsing offline"}
                            </p>
                        )}
                    </div>
                    {user && !editing && (
                        <button
                            onClick={startEditing}
                            className="flex items-center gap-1.5 text-[12px] text-text-tertiary hover:text-volt border border-border-subtle hover:border-volt/50 px-3 py-1.5 rounded-full transition-all shrink-0"
                        >
                            <Pencil className="w-3.5 h-3.5" /> Edit
                        </button>
                    )}
                </div>

                {/* Status */}
                {editing ? (
                    <div className="flex flex-wrap gap-2 mb-6">
                        {Object.entries(STATUS_LABELS).map(([value, label]) => (
                            <button
                                key={value}
                                onClick={() => setForm({ ...form, status: value })}
                                aria-pressed={status === value}
                                className={clsx(
                                    "font-mono text-[11px] uppercase tracking-widest px-3 py-1.5 rounded-full border transition-all",
                                    status === value
                                        ? "bg-volt/10 border-volt text-volt"
                                        : "bg-bg-elevated border-border-subtle text-text-tertiary hover:text-text-secondary",
                                )}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-wrap gap-2 mb-6">
                        <span className="font-mono text-[11px] uppercase tracking-widest bg-volt/10 text-volt px-3 py-1.5 rounded-full">
                            {STATUS_LABELS[status] ?? "Transitioning out"}
                        </span>
                        {sport && (
                            <span className="font-mono text-[11px] uppercase tracking-widest bg-bg-elevated text-text-secondary px-3 py-1.5 rounded-full">
                                {sport}
                                {intake.role ? ` · ${intake.role}` : ""}
                                {intake.years ? ` · ${intake.years}` : ""}
                            </span>
                        )}
                    </div>
                )}

                {/* The headline — the career-defining line */}
                <div className="bg-bg-elevated rounded-2xl border border-border-subtle p-5">
                    <p className="font-mono text-[10px] uppercase tracking-widest text-text-tertiary mb-2">
                        The headline — where you&apos;re headed
                    </p>
                    {editing ? (
                        <>
                            <input
                                value={form.headline}
                                aria-label="Headline"
                                onChange={(e) => setForm({ ...form, headline: e.target.value })}
                                maxLength={140}
                                placeholder="e.g. Future physical therapist · building toward consulting · open to anything"
                                className="w-full bg-bg-base border border-border-subtle rounded-xl px-4 py-3 font-serif text-xl text-sand italic placeholder:not-italic placeholder:font-sans placeholder:text-[14px] placeholder:text-text-tertiary focus:outline-none focus:border-volt focus:ring-1 focus:ring-volt"
                            />
                            <p className="font-mono text-[10px] text-text-tertiary mt-2 text-right">
                                {form.headline.length}/140
                            </p>
                        </>
                    ) : (
                        <p className="font-serif text-2xl text-sand italic leading-snug">
                            {sport ? `Former ${sport} athlete` : "Former athlete"}
                            <span className="text-volt not-italic font-mono text-lg mx-2">→</span>
                            {user?.headline ? (
                                user.headline
                            ) : (
                                <span className="text-text-tertiary">what&apos;s next — unwritten</span>
                            )}
                        </p>
                    )}
                    {!editing && !user?.headline && user && (
                        <button
                            onClick={startEditing}
                            className="mt-3 text-[13px] text-volt hover:underline underline-offset-4"
                        >
                            Write your headline
                        </button>
                    )}
                </div>

                {editing && (
                    <div className="flex gap-2 mt-5">
                        <button
                            onClick={save}
                            disabled={busy || !form.name.trim()}
                            className="bg-volt text-volt-ink font-semibold px-5 py-2.5 rounded-full text-[14px] flex items-center gap-2 hover:bg-volt/90 disabled:opacity-40 transition-all"
                        >
                            <Check className="w-4 h-4" /> {busy ? "Saving…" : "Save"}
                        </button>
                        <button
                            onClick={() => setForm(null)}
                            className="px-5 py-2.5 rounded-full text-[14px] text-text-tertiary hover:text-text-secondary flex items-center gap-2 transition-colors"
                        >
                            <X className="w-4 h-4" /> Cancel
                        </button>
                    </div>
                )}
            </section>

            <AccountVerification />

            {/* ——— Direction: committed path + skill map ——— */}
            <section className="bg-bg-surface rounded-[20px] border border-border-subtle p-6 md:p-8 mb-6">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-lg bg-volt/10 flex items-center justify-center shrink-0">
                        <Target className="w-5 h-5 text-volt" />
                    </div>
                    <h2 className="text-xl font-semibold text-text-primary">Your direction</h2>
                </div>

                {committedPath ? (
                    <button
                        onClick={() => router.push(`/game-plan/paths/${committedPath.id}`)}
                        className="w-full text-left bg-volt/10 border border-volt/40 rounded-2xl px-5 py-4 mb-5 hover:bg-volt/15 transition-all group"
                    >
                        <p className="font-mono text-[10px] uppercase tracking-widest text-volt mb-1">
                            Committed path
                        </p>
                        <p className="text-[17px] font-semibold text-text-primary group-hover:text-volt transition-colors flex items-center gap-2">
                            {committedPath.name} <ChevronRight className="w-4 h-4" />
                        </p>
                    </button>
                ) : (
                    <button
                        onClick={() => router.push("/game-plan")}
                        className="w-full text-left bg-bg-elevated border border-border-subtle rounded-2xl px-5 py-4 mb-5 hover:border-volt/50 transition-all group"
                    >
                        <p className="font-mono text-[10px] uppercase tracking-widest text-text-tertiary mb-1">
                            Committed path
                        </p>
                        <p className="text-[15px] text-text-secondary group-hover:text-text-primary transition-colors flex items-center gap-2">
                            No path committed yet — explore your fits{" "}
                            <ChevronRight className="w-4 h-4" />
                        </p>
                    </button>
                )}

                {data.intakeDone ? (
                    <div>
                        <p className="font-mono text-[10px] uppercase tracking-widest text-text-tertiary mb-3">
                            What the game taught you
                        </p>
                        <div className="flex flex-wrap gap-2">
                            {data.skillMap.map((entry) => (
                                <span
                                    key={entry.skill}
                                    title={entry.translation}
                                    className="font-mono text-[12px] text-volt bg-volt/10 px-3 py-1.5 rounded-full"
                                >
                                    {entry.skill}
                                </span>
                            ))}
                        </div>
                    </div>
                ) : (
                    <button
                        onClick={() => router.push("/game-plan")}
                        className="flex items-center gap-2 text-[13px] text-volt hover:underline underline-offset-4"
                    >
                        <Sparkles className="w-4 h-4" /> Two minutes to unlock your transferable
                        skill map
                    </button>
                )}
            </section>

            {/* Connection center: these are capability states, not fabricated
                readings or pretend OAuth success. */}
            <section
                id="connections"
                className="mb-6 scroll-mt-6 rounded-[20px] border border-border-subtle bg-bg-surface p-6 md:p-8"
            >
                <div className="mb-5">
                    <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-text-tertiary">
                        Training data · 0 connected
                    </p>
                    <h2 className="mt-1 text-xl font-semibold text-text-primary">Data connections</h2>
                    <p className="mt-1 text-[13px] leading-relaxed text-text-secondary">
                        Third &amp; Manageable never invents wellness data. These sources stay empty
                        until the required client integration is live and you grant access.
                    </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-border-subtle bg-bg-elevated p-4">
                        <div className="flex items-start gap-3">
                            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-sleep/10 text-sleep">
                                <Watch className="h-4 w-4" />
                            </span>
                            <div>
                                <p className="text-[14px] font-semibold text-text-primary">Apple Health</p>
                                <p className="mt-0.5 text-[12px] leading-relaxed text-text-tertiary">
                                    HealthKit access must be granted inside the future iPhone app.
                                </p>
                            </div>
                        </div>
                        <span className="mt-4 inline-flex rounded-full border border-border-subtle px-3 py-1 font-mono text-[9px] uppercase tracking-wider text-text-tertiary">
                            Not connected
                        </span>
                    </div>
                    <div className="rounded-2xl border border-border-subtle bg-bg-elevated p-4">
                        <div className="flex items-start gap-3">
                            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-activity/10 text-activity">
                                <Route className="h-4 w-4" />
                            </span>
                            <div>
                                <p className="text-[14px] font-semibold text-text-primary">Strava</p>
                                <p className="mt-0.5 text-[12px] leading-relaxed text-text-tertiary">
                                    OAuth client credentials and a token callback are required.
                                </p>
                            </div>
                        </div>
                        <span className="mt-4 inline-flex rounded-full border border-border-subtle px-3 py-1 font-mono text-[9px] uppercase tracking-wider text-text-tertiary">
                            Not connected
                        </span>
                    </div>
                </div>
            </section>

            {/* ——— Journey snapshot ——— */}
            <section className="grid grid-cols-3 gap-4 mb-6">
                {[
                    { label: "Day", value: `${dayNumber}/90`, icon: undefined },
                    { label: "Streak", value: streak, icon: Flame },
                    { label: "Check-ins", value: history.length, icon: undefined },
                ].map((s) => (
                    <button
                        key={s.label}
                        onClick={() => router.push("/progress")}
                        className="bg-bg-surface rounded-2xl p-4 border border-border-subtle text-center hover:border-volt/40 transition-all"
                    >
                        <p className="font-mono text-2xl text-text-primary flex items-center justify-center gap-1.5">
                            {s.icon && <s.icon className="w-4 h-4 text-volt" />} {s.value}
                        </p>
                        <p className="font-mono text-[10px] uppercase tracking-widest text-text-tertiary mt-1">
                            {s.label}
                        </p>
                    </button>
                ))}
            </section>

            {/* ——— Account actions ——— */}
            <section className="bg-bg-surface rounded-[20px] border border-border-subtle divide-y divide-border-subtle">
                {ACCOUNT_ROWS.map((row) => (
                    <button
                        key={row.label}
                        onClick={() => router.push(row.to)}
                        className="w-full flex items-center gap-3 px-6 py-4 text-left hover:bg-bg-elevated transition-colors group"
                    >
                        <row.icon
                            className={clsx("w-5 h-5", row.danger ? "text-danger" : "text-volt")}
                        />
                        <span className="flex-1 text-[15px] text-text-primary">{row.label}</span>
                        <ChevronRight className="w-4 h-4 text-text-tertiary group-hover:text-text-primary transition-colors" />
                    </button>
                ))}
                {user ? (
                    <button
                        onClick={async () => {
                            await signOut();
                            router.push("/login");
                        }}
                        className="w-full flex items-center gap-3 px-6 py-4 text-left hover:bg-bg-elevated transition-colors"
                    >
                        <LogOut className="w-5 h-5 text-text-tertiary" />
                        <span className="flex-1 text-[15px] text-text-secondary">Sign out</span>
                    </button>
                ) : (
                    <button
                        onClick={() => router.push("/onboarding")}
                        className="w-full flex items-center gap-3 px-6 py-4 text-left hover:bg-bg-elevated transition-colors"
                    >
                        <Sparkles className="w-5 h-5 text-volt" />
                        <span className="flex-1 text-[15px] text-volt font-medium">
                            Create your account — save all of this
                        </span>
                        <ChevronRight className="w-4 h-4 text-volt" />
                    </button>
                )}
            </section>
        </div>
    );
}
