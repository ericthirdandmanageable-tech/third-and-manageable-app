"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckSquare, ChevronRight, Flame, MessageSquare, Target } from "lucide-react";
import clsx from "clsx";

import {
    DayCounterCard,
    PathCommitmentCard,
    SkillMapCard,
    WeeklyRecapCard,
} from "@/components/athlete/artifacts";
import { api, authStorage } from "@/lib/athlete/api";
import { useAuth } from "@/lib/athlete/auth";
import { useCheckIns } from "@/lib/athlete/use-checkins";
import { useGamePlan } from "@/lib/athlete/use-game-plan";
import { JOURNEY_PHASES } from "@/lib/core/journey";
import { calendarDaysBetween } from "@/lib/core/journey-math";
import { getPath } from "@/lib/core/paths";

/*
 * Progress — the life-tracking page: student-athlete on one side, professional
 * life on the other, and the earned record in between. Every number is real:
 * derived from check-in rows, completed reps, and coach conversations.
 */

const milestones = [
    { day: 7, label: "First week" },
    { day: 30, label: "Foundation built" },
    { day: 60, label: "Explored" },
    { day: 90, label: "Committed" },
];

export default function ProgressPage() {
    const router = useRouter();
    const { user } = useAuth();
    const { data } = useGamePlan();
    const { history, streak, dayNumber, loading } = useCheckIns();
    const [coachSessions, setCoachSessions] = useState<number | null>(null);
    const [sport, setSport] = useState<string | null>(null);

    const intakeSport = data.intakeAnswers?.sport ?? null;

    // Coach-chat count + intake sport (authed; anonymous falls back to local intake)
    useEffect(() => {
        (async () => {
            if (!authStorage.getToken()) {
                setCoachSessions(null);
                setSport(intakeSport);
                return;
            }
            const [h, p] = await Promise.all([api.clipboardHistory(), api.getProfile()]);
            setCoachSessions(h ? h.messages.filter((m) => m.role === "user").length : 0);
            setSport(p?.intake_answers?.sport ?? null);
        })();
    }, [user, intakeSport]);

    /* The 90-day arc, filled by actual check-in dates. Arc day N = N days
     * after the first check-in. */
    const filledDays = useMemo(() => {
        if (!history.length) return new Set<number>();
        const first = history.map((e) => e.date).reduce((a, b) => (a < b ? a : b));
        return new Set(
            history.map((e) => calendarDaysBetween(first, e.date) + 1),
        );
    }, [history]);

    const recentMoods = useMemo(() => history.slice(0, 14), [history]);

    const phaseDays = JOURNEY_PHASES.map((ph) => ({
        ...ph,
        days: Array.from({ length: ph.endDay - ph.startDay + 1 }, (_, i) => ph.startDay + i),
    }));

    const committedPath = getPath(data.committedPathId ?? undefined);

    const stats = [
        { icon: Flame, label: "Day streak", value: streak },
        { icon: CheckSquare, label: "Check-ins", value: history.length },
        { icon: Target, label: "Reps completed", value: data.completedActionIds.length },
        { icon: MessageSquare, label: "Coach chats", value: coachSessions ?? "—" },
    ];

    return (
        <div className="p-6 md:p-10 max-w-3xl mx-auto animate-rise">
            <header className="mb-8">
                <h1 className="font-serif text-4xl text-sand italic mb-2">Your Progress</h1>
                <p className="font-mono text-[11px] uppercase tracking-widest text-text-tertiary">
                    Day {dayNumber} / {data.totalDays} · {data.phase.name}
                </p>
                <div className="yard-line mt-4" />
            </header>

            {/* The arc of a life: who you were → who you're becoming */}
            <section className="bg-bg-surface rounded-[20px] border border-border-subtle p-6 mb-8 grain">
                <p className="font-mono text-[10px] uppercase tracking-widest text-text-tertiary mb-3">
                    The transition
                </p>
                <div className="flex items-center gap-3 flex-wrap">
                    <span className="font-serif text-xl text-sand italic">
                        {sport ? `${sport} athlete` : "Student-athlete"}
                    </span>
                    <span className="font-mono text-volt">→</span>
                    {committedPath ? (
                        <button
                            onClick={() => router.push(`/game-plan/paths/${committedPath.id}`)}
                            className="font-serif text-xl text-volt italic hover:underline underline-offset-4"
                        >
                            {committedPath.name}
                        </button>
                    ) : (
                        <button
                            onClick={() => router.push("/game-plan")}
                            className="font-serif text-xl text-text-tertiary italic hover:text-volt transition-colors inline-flex items-center gap-1.5"
                        >
                            still exploring <ChevronRight className="w-4 h-4 not-italic" />
                        </button>
                    )}
                </div>
                {/* Milestones along the way */}
                <div className="flex justify-between mt-6">
                    {milestones.map((m) => {
                        const reached = dayNumber >= m.day;
                        return (
                            <div key={m.day} className="flex flex-col items-center gap-1.5">
                                <div
                                    className={clsx(
                                        "w-3 h-3 rounded-full border-2 transition-colors",
                                        reached
                                            ? "bg-volt border-volt"
                                            : "bg-bg-elevated border-text-tertiary",
                                    )}
                                />
                                <span
                                    className={clsx(
                                        "font-mono text-[10px] uppercase tracking-widest text-center",
                                        reached ? "text-volt" : "text-text-tertiary",
                                    )}
                                >
                                    Day {m.day}
                                    <br />
                                    {m.label}
                                </span>
                            </div>
                        );
                    })}
                </div>
                <div
                    className="relative h-1 bg-bg-elevated rounded-full mt-[-52px] mb-8 mx-2 -z-0"
                    aria-hidden
                >
                    <div
                        className="h-full bg-volt/60 rounded-full transition-all"
                        style={{
                            width: `${Math.min((dayNumber / data.totalDays) * 100, 100)}%`,
                        }}
                    />
                </div>
            </section>

            {/* Stats — all real */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
                {stats.map((stat) => (
                    <div
                        key={stat.label}
                        className="bg-bg-surface rounded-2xl p-4 border border-border-subtle text-center"
                    >
                        <stat.icon className="w-5 h-5 text-volt mx-auto mb-2" />
                        <p className="font-mono text-2xl text-text-primary">{stat.value}</p>
                        <p className="font-mono text-[10px] uppercase tracking-widest text-text-tertiary mt-1">
                            {stat.label}
                        </p>
                    </div>
                ))}
            </div>

            {/* Streak grid — the 90-day arc, phase-grouped, filled by real dates */}
            <section className="bg-bg-surface rounded-2xl border border-border-subtle p-5 mb-8">
                <h2 className="font-mono text-[11px] uppercase tracking-widest text-text-tertiary mb-4">
                    The 90-day arc
                </h2>
                <div className="flex gap-6 overflow-x-auto pb-2 snap-x snap-mandatory">
                    {phaseDays.map((ph) => (
                        <div key={ph.id} className="shrink-0 snap-start">
                            <p className="font-mono text-[10px] uppercase tracking-widest text-text-tertiary mb-3">
                                {ph.name}
                            </p>
                            <div className="grid grid-rows-6 grid-flow-col gap-1.5">
                                {ph.days.map((day) => {
                                    const filled = filledDays.has(day);
                                    return (
                                        <div
                                            key={day}
                                            title={`Day ${day}${filled ? " — showed up" : ""}`}
                                            className={clsx(
                                                "w-4 h-4 rounded-[4px]",
                                                filled
                                                    ? "bg-volt"
                                                    : day === dayNumber
                                                      ? "bg-volt/30 border border-volt/60"
                                                      : "bg-bg-elevated",
                                            )}
                                        />
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
                <p className="font-mono text-[11px] text-text-tertiary mt-4">
                    {loading ? (
                        "…"
                    ) : (
                        <>
                            <span className="text-volt">
                                {history.length} {history.length === 1 ? "day" : "days"} showed up
                            </span>{" "}
                            · {Math.max(data.totalDays - dayNumber, 0)} to go
                        </>
                    )}
                </p>
                {!loading && history.length === 0 && (
                    <p className="text-[13px] text-text-secondary mt-2">
                        The arc is empty because it hasn&apos;t started. Today&apos;s check-in is Day
                        1.
                    </p>
                )}
            </section>

            {/* Recent check-ins — the emotional trend line */}
            {recentMoods.length > 0 && (
                <section className="bg-bg-surface rounded-2xl border border-border-subtle p-5 mb-10">
                    <h2 className="font-mono text-[11px] uppercase tracking-widest text-text-tertiary mb-4">
                        Recent check-ins
                    </h2>
                    <div className="space-y-2">
                        {recentMoods.map((entry) => (
                            <div key={entry.date} className="flex items-baseline gap-3">
                                <span className="font-mono text-[11px] text-text-tertiary shrink-0 w-20">
                                    {new Date(entry.date + "T00:00:00").toLocaleDateString(
                                        undefined,
                                        { month: "short", day: "numeric" },
                                    )}
                                </span>
                                <span className="w-1.5 h-1.5 rounded-full bg-volt shrink-0 relative top-[-2px]" />
                                <span className="text-[13px] text-text-secondary">
                                    {entry.option}
                                </span>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* Artifact gallery — real data in every slot */}
            <section>
                <h2 className="text-xl font-semibold text-text-primary mb-1">Your artifacts</h2>
                <p className="text-[13px] text-text-secondary mb-6">
                    Progress you can hold. Private by default — share only what you choose.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <DayCounterCard
                        day={dayNumber}
                        totalDays={data.totalDays}
                        phaseName={data.phase.name}
                    />
                    <WeeklyRecapCard
                        streak={streak}
                        completed={data.completedActionIds.length}
                        total={data.weeklyActions.length}
                    />
                    {data.intakeDone && <SkillMapCard entries={data.skillMap} />}
                    {data.committedPathId && (
                        <PathCommitmentCard
                            pathId={data.committedPathId}
                            entries={data.skillMap}
                            day={dayNumber}
                        />
                    )}
                </div>
            </section>
        </div>
    );
}
