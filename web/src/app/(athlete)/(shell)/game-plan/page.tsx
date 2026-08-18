"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, ChevronDown, ChevronRight, Lock, RefreshCw, Sparkles } from "lucide-react";
import clsx from "clsx";

import IntakeFlow from "@/components/athlete/IntakeFlow";
import { Icon } from "@/components/athlete/icons";
import { useGamePlan } from "@/lib/athlete/use-game-plan";
import { JOURNEY_PHASES } from "@/lib/core/journey";
import { WORK_PATHS, getPath } from "@/lib/core/paths";

function GamePlan() {
    const router = useRouter();
    const { data, completeIntake, commitToPath, toggleAction } = useGamePlan();
    const searchParams = useSearchParams();
    const [intakeOpen, setIntakeOpen] = useState(searchParams.get("retake") === "1");
    const [whyOpen, setWhyOpen] = useState(false);

    /* Drop `?retake=1` once the flow is open or done, so a refresh or a back
     * navigation doesn't reopen the intake. `replace` keeps it out of history. */
    const clearRetake = () => router.replace("/game-plan");

    if (data.loading) {
        return (
            <div className="mx-auto max-w-3xl p-6 md:p-10">
                <div className="rounded-[20px] border border-border-subtle bg-bg-surface p-10 text-center grain">
                    <p className="font-serif text-2xl italic text-sand">
                        Loading your game plan…
                    </p>
                    <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.2em] text-text-tertiary">
                        Bringing in your real baseline
                    </p>
                </div>
            </div>
        );
    }

    const phaseIndex = JOURNEY_PHASES.findIndex((p) => p.id === data.phase.id);
    const journeyPct = Math.round((data.day / data.totalDays) * 100);
    const committedPath = getPath(data.committedPathId ?? undefined);

    return (
        <div className="p-6 md:p-10 max-w-3xl mx-auto animate-rise">
            <header className="mb-8">
                <div className="flex items-center justify-between gap-4 mb-2">
                    <h1 className="font-serif text-4xl text-sand italic">Your Game Plan</h1>
                    <span className="font-mono text-[11px] uppercase tracking-widest text-volt bg-volt/10 px-3 py-1.5 rounded-full shrink-0">
                        Phase {phaseIndex + 1} · {data.phase.name}
                    </span>
                </div>
                <p className="font-mono text-[11px] uppercase tracking-widest text-text-tertiary">
                    Day {data.day} / {data.totalDays}
                </p>
                <div className="yard-line mt-4" />
            </header>

            {/* Journey strip */}
            <div className="bg-bg-surface rounded-2xl border border-border-subtle p-5 mb-8">
                <div className="flex justify-between font-mono text-[11px] uppercase tracking-widest text-text-tertiary mb-3">
                    {JOURNEY_PHASES.map((p) => (
                        <span key={p.id} className={p.id === data.phase.id ? "text-volt" : undefined}>
                            {p.name}
                        </span>
                    ))}
                </div>
                <div className="h-2 bg-bg-elevated rounded-full overflow-hidden">
                    <div
                        className="h-full bg-volt rounded-full animate-fill"
                        style={{ width: `${journeyPct}%` }}
                    />
                </div>
                <p className="font-mono text-[11px] text-text-tertiary mt-3">
                    <span className="text-volt">{journeyPct}%</span> · Every day counts
                </p>
            </div>

            {/* Skill Translation Engine */}
            <section className="bg-bg-surface rounded-[20px] border border-border-subtle p-6 md:p-8 mb-8 grain">
                <div className="flex items-center gap-3 mb-1">
                    <div className="w-10 h-10 rounded-lg bg-volt/10 flex items-center justify-center shrink-0">
                        <Sparkles className="w-5 h-5 text-volt" />
                    </div>
                    <h2 className="text-xl font-semibold text-text-primary">
                        What the game taught you
                    </h2>
                </div>

                {!data.intakeDone && !intakeOpen && (
                    <div className="text-center py-6">
                        <div className="w-14 h-14 bg-bg-elevated rounded-full flex items-center justify-center mx-auto mb-4">
                            <Lock className="w-6 h-6 text-text-tertiary" />
                        </div>
                        <p className="text-text-secondary text-[15px] mb-6 max-w-sm mx-auto">
                            Two minutes of guided prompts unlocks your Transferable Skill Map — your
                            sport, in civilian language.
                        </p>
                        <button
                            onClick={() => setIntakeOpen(true)}
                            className="bg-volt text-volt-ink font-semibold px-6 py-3 rounded-full inline-flex items-center gap-2 hover:bg-volt/90 transition-all"
                        >
                            Start the intake <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                )}

                {intakeOpen && (
                    <IntakeFlow
                        onBackAtStart={
                            data.intakeDone
                                ? () => {
                                      setIntakeOpen(false);
                                      clearRetake();
                                  }
                                : undefined
                        }
                        onComplete={(answers) => {
                            completeIntake(answers);
                            setIntakeOpen(false);
                            clearRetake();
                        }}
                    />
                )}

                {data.intakeDone && !intakeOpen && (
                    <>
                        <div className="flex items-baseline justify-between mb-6">
                            <p className="text-[13px] text-text-secondary">
                                Your transferable skill map — in civilian language.
                            </p>
                            <button
                                onClick={() => setIntakeOpen(true)}
                                className="flex items-center gap-1.5 text-[12px] text-text-tertiary hover:text-volt transition-colors shrink-0 ml-4"
                            >
                                <RefreshCw className="w-3.5 h-3.5" /> Retake
                            </button>
                        </div>
                        <div className="space-y-3">
                            {data.skillMap.map((entry) => (
                                <div key={entry.skill} className="flex items-center gap-3 flex-wrap">
                                    <span className="font-mono text-[13px] text-volt bg-volt/10 px-3 py-1.5 rounded-full">
                                        {entry.skill}
                                    </span>
                                    <ChevronRight className="w-4 h-4 text-text-tertiary shrink-0" />
                                    <span className="text-[15px] text-text-primary">
                                        {entry.translation}
                                    </span>
                                    {entry.origin && (
                                        <span className="font-mono text-[11px] text-text-tertiary w-full pl-1">
                                            — {entry.origin}
                                        </span>
                                    )}
                                </div>
                            ))}
                            {data.skillMap.length === 0 && (
                                <p className="rounded-2xl border border-dashed border-border-subtle bg-bg-elevated px-5 py-6 text-center text-[13px] leading-relaxed text-text-tertiary">
                                    Your intake is saved, but there are no skill translations yet.
                                    Retake the intake or try again after the service reconnects.
                                </p>
                            )}
                        </div>
                    </>
                )}
            </section>

            {/* Path Fit */}
            <section className="mb-8">
                <div className="flex items-baseline justify-between mb-4">
                    <h2 className="text-xl font-semibold text-text-primary">Path Fit</h2>
                    <button
                        onClick={() => setWhyOpen((o) => !o)}
                        aria-expanded={whyOpen}
                        className="flex items-center gap-1 text-[13px] text-text-tertiary hover:text-text-secondary transition-colors"
                    >
                        Why this ranking{" "}
                        <ChevronDown
                            className={clsx("w-4 h-4 transition-transform", whyOpen && "rotate-180")}
                        />
                    </button>
                </div>

                {whyOpen && (
                    <div className="bg-bg-surface rounded-2xl border border-border-subtle p-5 mb-4 animate-disclosure">
                        <p className="text-[13px] text-text-secondary leading-relaxed mb-3">
                            Rankings come from your intake and check-in answers — the model is
                            transparent. Contributing signals:
                        </p>
                        <ul className="space-y-2 text-[13px] text-text-secondary">
                            <li className="flex gap-2">
                                <span className="text-volt">·</span> Intake role &amp; favorite part
                                drive the base score
                            </li>
                            <li className="flex gap-2">
                                <span className="text-volt">·</span> &ldquo;Missing the structured
                                schedule&rdquo; → boosts 9–5 / Corporate
                            </li>
                            <li className="flex gap-2">
                                <span className="text-volt">·</span> &ldquo;The competition
                                itself&rdquo; → boosts Entrepreneurship
                            </li>
                        </ul>
                    </div>
                )}

                {committedPath && (
                    <div className="flex items-center justify-between bg-volt/10 border border-volt/40 rounded-2xl px-5 py-4 mb-4">
                        <span className="font-mono text-[11px] uppercase tracking-widest text-volt">
                            Committed · {committedPath.name}
                        </span>
                        <button
                            onClick={() => commitToPath(null)}
                            className="text-[13px] text-text-tertiary hover:text-text-secondary underline underline-offset-4 transition-colors"
                        >
                            Change
                        </button>
                    </div>
                )}

                <div className="space-y-3">
                    {data.pathFit.map((path) => {
                        const iconName = WORK_PATHS.find((p) => p.id === path.id)?.icon;
                        return (
                            <button
                                key={path.id}
                                onClick={() => router.push(`/game-plan/paths/${path.id}`)}
                                className="w-full text-left bg-bg-surface rounded-2xl border border-border-subtle p-5 hover:border-volt/50 hover:bg-bg-elevated transition-all duration-200 group"
                            >
                                <div className="flex items-start gap-4">
                                    <div className="w-12 h-12 rounded-lg bg-volt/10 flex items-center justify-center shrink-0">
                                        {iconName && (
                                            <Icon name={iconName} className="w-6 h-6 text-volt" />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between gap-2 mb-1">
                                            <h3 className="text-[17px] font-semibold text-text-primary group-hover:text-volt transition-colors">
                                                {path.name}
                                            </h3>
                                            <span
                                                className={clsx(
                                                    "font-mono text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-full shrink-0",
                                                    path.fit === "STRONG FIT"
                                                        ? "bg-volt/10 text-volt"
                                                        : "bg-bg-elevated text-text-tertiary",
                                                )}
                                            >
                                                {path.fit}
                                            </span>
                                        </div>
                                        <p className="text-[13px] text-text-secondary mb-1.5">
                                            {path.rationale}
                                        </p>
                                        <p className="font-mono text-[11px] text-text-tertiary">
                                            {path.meta}
                                        </p>
                                    </div>
                                </div>
                            </button>
                        );
                    })}
                    {data.pathFit.length === 0 && (
                        <p className="rounded-2xl border border-dashed border-border-subtle bg-bg-surface px-5 py-7 text-center text-[13px] leading-relaxed text-text-tertiary">
                            No path fits have been generated yet. Nothing is ranked until your
                            completed intake returns a real result.
                        </p>
                    )}
                </div>
            </section>

            {/* This Week's Actions */}
            <section className="bg-bg-surface rounded-[20px] border border-border-subtle p-6 md:p-8">
                <div className="flex items-baseline justify-between mb-1">
                    <h2 className="text-xl font-semibold text-text-primary">
                        This Week&apos;s Actions
                    </h2>
                    <span className="font-mono text-[11px] text-text-tertiary">
                        <span className="text-volt">{data.completedActionIds.length}</span> /{" "}
                        {data.weeklyActions.length}
                    </span>
                </div>
                <p className="text-[13px] text-text-secondary mb-6">
                    Small wins stacked. Same way you trained.
                </p>
                <div className="space-y-3">
                    {data.weeklyActions.map((action) => {
                        const done = data.completedActionIds.includes(action.id);
                        return (
                            <button
                                key={action.id}
                                onClick={() => toggleAction(action.id)}
                                aria-pressed={done}
                                className={clsx(
                                    "w-full text-left px-5 py-4 rounded-2xl border transition-all duration-200 flex items-center gap-4",
                                    done
                                        ? "bg-volt/10 border-volt/40"
                                        : "bg-bg-elevated border-border-subtle hover:border-text-tertiary",
                                )}
                            >
                                <div
                                    className={clsx(
                                        "w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-colors",
                                        done ? "border-volt bg-volt" : "border-text-tertiary",
                                    )}
                                >
                                    {done && <Check className="w-3 h-3 text-volt-ink" />}
                                </div>
                                <div className="flex-1">
                                    <span className="font-mono text-[10px] uppercase tracking-widest text-text-tertiary block mb-0.5">
                                        {action.kind}
                                    </span>
                                    <span
                                        className={clsx(
                                            "text-[15px]",
                                            done
                                                ? "text-text-secondary line-through"
                                                : "text-text-primary",
                                        )}
                                    >
                                        {action.text}
                                    </span>
                                </div>
                            </button>
                        );
                    })}
                    {data.weeklyActions.length === 0 && (
                        <p className="rounded-2xl border border-dashed border-border-subtle bg-bg-elevated px-5 py-6 text-center text-[13px] leading-relaxed text-text-tertiary">
                            0 actions assigned. Your first weekly reps will appear here after the
                            plan service creates them.
                        </p>
                    )}
                </div>
                {data.weeklyActions.length > 0 &&
                    data.completedActionIds.length === data.weeklyActions.length && (
                    <p className="text-center text-[15px] text-volt mt-6 animate-disclosure">
                        You crushed today&apos;s action. One step closer to your next chapter.
                    </p>
                    )}
            </section>
        </div>
    );
}

export default function GamePlanPage() {
    // `useSearchParams` opts the subtree into client rendering; the boundary
    // keeps the rest of the route prerenderable.
    return (
        <Suspense>
            <GamePlan />
        </Suspense>
    );
}
