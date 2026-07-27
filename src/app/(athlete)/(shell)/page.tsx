"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
    Activity,
    CheckCircle2,
    ChevronRight,
    Compass,
    Flame,
    Pencil,
    Route,
    Sparkles,
    Target,
    Users,
    Watch,
} from "lucide-react";
import clsx from "clsx";

import { getPromptForDate } from "@/lib/core/checkin";
import { useAuth } from "@/lib/athlete/auth";
import { useCheckIns } from "@/lib/athlete/use-checkins";
import { useGamePlan } from "@/lib/athlete/use-game-plan";

export default function CheckInPage() {
    const router = useRouter();
    const { user } = useAuth();
    const { today, streak, dayNumber, loading, submit, editToday } = useCheckIns();
    const { data: plan } = useGamePlan();

    const [selectedOption, setSelectedOption] = useState<string | null>(null);
    const [journalText, setJournalText] = useState("");
    const [justSubmitted, setJustSubmitted] = useState(false);
    const [editing, setEditing] = useState(false);

    /* Today's rotation. Safe to derive during render even though this subtree
     * prerenders: `loading` starts true, so the prompt only ever reaches the
     * DOM after the client-side effect resolves — the server never emits it
     * and there is nothing to mismatch. */
    const prompt = getPromptForDate(new Date());

    const handleSubmit = async () => {
        if (!selectedOption) return;
        const result = editing
            ? (await editToday(selectedOption, journalText || undefined))
                ? "saved"
                : "already"
            : await submit(prompt.id, prompt.question, selectedOption, journalText || undefined);
        if (result === "saved") {
            setJustSubmitted(true);
            setEditing(false);
            setSelectedOption(null);
            setJournalText("");
        } else {
            // Already checked in (e.g. on another device) — show the done state honestly.
            setJustSubmitted(false);
            setEditing(false);
        }
    };

    const startEdit = () => {
        setSelectedOption(today?.option ?? null);
        setJournalText(today?.journal ?? "");
        setEditing(true);
    };

    /* Today's nudge — the check-in should send you somewhere useful. The next
     * most valuable action given where you are in the journey. */
    const nextRep = plan.weeklyActions.find((a) => !plan.completedActionIds.includes(a.id));
    const nudge = !user
        ? { icon: Sparkles, title: "Keep this streak alive", body: "Check-ins saved on this device only last so long — create your account to make the 90 days real.", cta: "Set up in 2 minutes", to: "/onboarding" }
        : !plan.intakeDone
          ? { icon: Sparkles, title: "Unlock your skill map", body: "Two minutes of guided prompts turns your sport into civilian language employers understand.", cta: "Start the intake", to: "/game-plan" }
          : !plan.committedPathId
            ? { icon: Compass, title: "Explore your path fits", body: "Your intake ranked five work structures against how you're wired. See which one pulls at you.", cta: "See the ranking", to: "/game-plan" }
            : nextRep
              ? { icon: Target, title: "Today's rep", body: nextRep.text, cta: "Open your Game Plan", to: "/game-plan" }
              : { icon: Users, title: "All of this week's reps are done", body: "Momentum compounds in public too — someone in the community could use your perspective today.", cta: "Visit the community", to: "/community" };

    const done = Boolean(today) && !editing;

    return (
        <div className="p-6 md:p-10 max-w-3xl mx-auto animate-rise">
            {/* Header — real numbers, earned from check-in history */}
            <header className="mb-8">
                <h1 className="font-serif text-4xl text-sand italic mb-2">Morning Check-in</h1>
                <button
                    onClick={() => router.push("/progress")}
                    className="font-mono text-[11px] uppercase tracking-widest text-text-tertiary flex items-center gap-2 hover:text-text-secondary transition-colors"
                >
                    Day {dayNumber} / 90
                    <span className="inline-flex items-center gap-1 text-volt">
                        <Flame className="w-3 h-3" /> {streak}
                    </span>
                </button>
                <div className="yard-line mt-4" />
            </header>

            {/* Honest zero state: no health reading is shown until a real source
                has supplied it. Apple Health requires the iOS client; Strava
                requires its OAuth credentials and callback service. */}
            <section className="mb-8 rounded-[20px] border border-border-subtle bg-bg-surface p-5 md:p-6">
                <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-text-tertiary">
                            Training data · 0 connected
                        </p>
                        <h2 className="mt-1.5 text-lg font-semibold text-text-primary">
                            Add context when you&apos;re ready
                        </h2>
                        <p className="mt-1 max-w-xl text-[13px] leading-relaxed text-text-secondary">
                            Sleep, recovery, and activity stay blank until you connect a real source.
                            Your daily check-in works without one.
                        </p>
                    </div>
                    <button
                        onClick={() => router.push("/profile#connections")}
                        className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full border border-volt/35 bg-volt/10 px-4 py-2.5 text-[13px] font-semibold text-volt transition hover:border-volt/70 hover:bg-volt/15"
                    >
                        Manage connections <ChevronRight className="h-4 w-4" />
                    </button>
                </div>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    <div className="flex items-center gap-3 rounded-2xl border border-border-subtle bg-bg-elevated px-4 py-3">
                        <Watch className="h-4 w-4 text-text-tertiary" />
                        <div className="flex-1">
                            <p className="text-[13px] font-medium text-text-primary">Apple Health</p>
                            <p className="text-[11px] text-text-tertiary">Requires the iPhone app</p>
                        </div>
                        <span className="font-mono text-[9px] uppercase tracking-wider text-text-tertiary">
                            Not connected
                        </span>
                    </div>
                    <div className="flex items-center gap-3 rounded-2xl border border-border-subtle bg-bg-elevated px-4 py-3">
                        <Route className="h-4 w-4 text-text-tertiary" />
                        <div className="flex-1">
                            <p className="text-[13px] font-medium text-text-primary">Strava</p>
                            <p className="text-[11px] text-text-tertiary">OAuth setup pending</p>
                        </div>
                        <span className="font-mono text-[9px] uppercase tracking-wider text-text-tertiary">
                            Not connected
                        </span>
                    </div>
                </div>
            </section>

            {loading ? (
                <div className="bg-bg-surface rounded-[20px] border border-border-subtle p-10 grain text-center">
                    <p className="font-mono text-[11px] uppercase tracking-widest text-text-tertiary animate-pulse">
                        Loading today…
                    </p>
                </div>
            ) : done && !justSubmitted ? (
                /* Already checked in today — show what you said, allow edits */
                <div className="bg-bg-surface rounded-[20px] border border-border-subtle p-6 md:p-8 grain animate-rise">
                    <div className="flex items-start gap-4 mb-5">
                        <div className="w-10 h-10 rounded-lg bg-volt/10 flex items-center justify-center shrink-0">
                            <CheckCircle2 className="w-5 h-5 text-volt" />
                        </div>
                        <div>
                            <h2 className="text-xl font-semibold text-text-primary leading-snug">
                                Checked in for today
                            </h2>
                            <p className="font-mono text-[11px] uppercase tracking-widest text-text-tertiary mt-1">
                                Streak <span className="text-volt">{streak}</span> · Day {dayNumber}
                            </p>
                        </div>
                    </div>
                    <div className="bg-bg-elevated border border-border-subtle rounded-2xl px-5 py-4 mb-3">
                        <p className="font-mono text-[10px] uppercase tracking-widest text-text-tertiary mb-1">
                            You said
                        </p>
                        <p className="text-[15px] text-text-primary">{today?.option}</p>
                    </div>
                    {today?.journal && (
                        <div className="bg-bg-elevated border border-border-subtle rounded-2xl px-5 py-4 mb-3">
                            <p className="font-mono text-[10px] uppercase tracking-widest text-text-tertiary mb-1">
                                Journal
                            </p>
                            <p className="text-[15px] text-text-secondary leading-relaxed">
                                {today.journal}
                            </p>
                        </div>
                    )}
                    <button
                        onClick={startEdit}
                        className="flex items-center gap-1.5 text-[13px] text-text-tertiary hover:text-volt transition-colors mt-2"
                    >
                        <Pencil className="w-3.5 h-3.5" /> Edit today&apos;s check-in
                    </button>

                    {/* Today's nudge */}
                    <div className="mt-6 pt-6 border-t border-border-subtle">
                        <button
                            onClick={() => router.push(nudge.to)}
                            className="w-full text-left bg-volt/10 border border-volt/30 rounded-2xl p-5 hover:border-volt/60 hover:bg-volt/15 transition-all group"
                        >
                            <p className="font-mono text-[10px] uppercase tracking-widest text-volt mb-1.5 flex items-center gap-2">
                                <nudge.icon className="w-3.5 h-3.5" /> Up next for you
                            </p>
                            <p className="text-[15px] font-semibold text-text-primary mb-0.5">
                                {nudge.title}
                            </p>
                            <p className="text-[13px] text-text-secondary mb-2">{nudge.body}</p>
                            <span className="inline-flex items-center gap-1.5 text-[13px] text-volt font-medium">
                                {nudge.cta}{" "}
                                <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                            </span>
                        </button>
                    </div>
                </div>
            ) : justSubmitted ? (
                /* Success state — real streak, then send them somewhere useful */
                <div className="bg-bg-surface rounded-[20px] border border-border-subtle p-10 text-center grain animate-rise">
                    <div className="w-20 h-20 bg-volt/10 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle2 className="w-10 h-10 text-volt" />
                    </div>
                    <h2 className="font-serif text-3xl text-sand italic mb-2">Check-in Complete</h2>
                    <p className="text-text-secondary mb-8">
                        You showed up today. That&apos;s what matters. Your streak is now{" "}
                        <span className="font-mono text-volt">{streak}</span>{" "}
                        {streak === 1 ? "day" : "days"}.
                    </p>
                    <button
                        onClick={() => router.push(nudge.to)}
                        className="w-full text-left bg-volt/10 border border-volt/30 rounded-2xl p-5 hover:border-volt/60 hover:bg-volt/15 transition-all group"
                    >
                        <p className="font-mono text-[10px] uppercase tracking-widest text-volt mb-1.5 flex items-center gap-2">
                            <nudge.icon className="w-3.5 h-3.5" /> Up next for you
                        </p>
                        <p className="text-[15px] font-semibold text-text-primary mb-0.5">
                            {nudge.title}
                        </p>
                        <p className="text-[13px] text-text-secondary mb-2">{nudge.body}</p>
                        <span className="inline-flex items-center gap-1.5 text-[13px] text-volt font-medium">
                            {nudge.cta}{" "}
                            <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                        </span>
                    </button>
                </div>
            ) : (
                /* Check-in form (new or editing) */
                <div className="bg-bg-surface rounded-[20px] border border-border-subtle p-6 md:p-8 grain">
                    <div className="flex items-start gap-4 mb-6">
                        <div className="w-10 h-10 rounded-lg bg-volt/10 flex items-center justify-center shrink-0">
                            <Activity className="w-5 h-5 text-volt" />
                        </div>
                        <div>
                            <h2 className="text-xl font-semibold text-text-primary leading-snug">
                                {prompt.question}
                            </h2>
                            {editing && (
                                <p className="font-mono text-[11px] uppercase tracking-widest text-volt mt-1">
                                    Editing today&apos;s check-in
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="space-y-3">
                        {prompt.options.map((option) => (
                            <button
                                key={option}
                                onClick={() => setSelectedOption(option)}
                                aria-pressed={selectedOption === option}
                                className={clsx(
                                    "w-full text-left px-5 py-4 rounded-2xl border transition-all duration-200 flex items-center gap-4",
                                    selectedOption === option
                                        ? "bg-volt/10 border-volt text-text-primary"
                                        : "bg-bg-elevated border-border-subtle text-text-secondary hover:border-text-tertiary hover:text-text-primary",
                                )}
                            >
                                <div
                                    className={clsx(
                                        "w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-colors",
                                        selectedOption === option
                                            ? "border-volt"
                                            : "border-text-tertiary",
                                    )}
                                >
                                    {selectedOption === option && (
                                        <div className="w-2.5 h-2.5 rounded-full bg-volt" />
                                    )}
                                </div>
                                <span className="text-[15px]">{option}</span>
                            </button>
                        ))}
                    </div>

                    {/* Progressive Disclosure Journal */}
                    {selectedOption && (
                        <div className="mt-6 pt-6 border-t border-border-subtle animate-disclosure">
                            <label
                                htmlFor="checkin-journal"
                                className="block text-[13px] font-medium text-text-secondary mb-2"
                            >
                                Want to say more about that?{" "}
                                <span className="text-text-tertiary">(Optional)</span>
                            </label>
                            <textarea
                                id="checkin-journal"
                                value={journalText}
                                onChange={(e) => setJournalText(e.target.value)}
                                placeholder="It helps to get it out..."
                                className="w-full h-32 bg-bg-elevated border border-border-subtle rounded-2xl p-4 text-[15px] text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-volt focus:ring-1 focus:ring-volt resize-none transition-all"
                            />
                            <div className="flex items-center gap-3 mt-4">
                                <button
                                    onClick={handleSubmit}
                                    className="flex-1 bg-volt text-volt-ink font-semibold py-4 rounded-full flex items-center justify-center gap-2 hover:bg-volt/90 transition-all"
                                >
                                    {editing ? "Save changes" : "Save Check-in"}{" "}
                                    <ChevronRight className="w-5 h-5" />
                                </button>
                                {editing && (
                                    <button
                                        onClick={() => {
                                            setEditing(false);
                                            setSelectedOption(null);
                                            setJournalText("");
                                        }}
                                        className="text-[13px] text-text-tertiary hover:text-text-secondary transition-colors px-3"
                                    >
                                        Cancel
                                    </button>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
