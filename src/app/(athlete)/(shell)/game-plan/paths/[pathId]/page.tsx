"use client";

import { useParams, useRouter } from "next/navigation";
import {
    AlertTriangle,
    Check,
    ChevronLeft,
    Clock,
    Heart,
    Repeat,
    Users,
    Wallet,
} from "lucide-react";

import { Icon } from "@/components/athlete/icons";
import { useGamePlan } from "@/lib/athlete/use-game-plan";
import { getForum } from "@/lib/core/community";
import { getPath } from "@/lib/core/paths";

export default function PathDetailPage() {
    const { pathId } = useParams<{ pathId: string }>();
    const router = useRouter();
    const { data, commitToPath } = useGamePlan();

    const path = getPath(pathId);
    if (!path) {
        return (
            <div className="p-6 md:p-10 max-w-3xl mx-auto text-center pt-24 animate-rise">
                <h1 className="font-serif text-3xl text-sand italic mb-3">Path not found</h1>
                <p className="text-[14px] text-text-secondary mb-6">
                    That work structure doesn&apos;t exist in the registry.
                </p>
                <button
                    onClick={() => router.push("/game-plan")}
                    className="text-volt text-[14px] hover:underline underline-offset-4"
                >
                    Back to your Game Plan
                </button>
            </div>
        );
    }

    const forum = getForum(`path-${path.id}`);
    const isCommitted = data.committedPathId === path.id;

    return (
        <div className="p-6 md:p-10 max-w-3xl mx-auto animate-rise">
            <button
                onClick={() => router.push("/game-plan")}
                className="flex items-center gap-1 text-text-tertiary hover:text-text-primary text-[13px] mb-6 transition-colors"
            >
                <ChevronLeft className="w-4 h-4" /> Game Plan
            </button>

            {/* Header */}
            <header className="mb-8">
                <div className="flex items-center gap-4 mb-3">
                    <div className="w-14 h-14 rounded-lg bg-volt/10 flex items-center justify-center shrink-0">
                        <Icon name={path.icon} className="w-7 h-7 text-volt" />
                    </div>
                    <div>
                        <h1 className="font-serif text-4xl text-sand italic">{path.name}</h1>
                        <p className="font-mono text-[11px] uppercase tracking-widest text-text-tertiary">
                            {path.meta}
                        </p>
                    </div>
                </div>
                <p className="text-[15px] text-text-secondary">{path.tagline}</p>
                <div className="yard-line mt-4" />
            </header>

            {/* Commit */}
            <button
                onClick={() => commitToPath(isCommitted ? null : path.id)}
                className={
                    isCommitted
                        ? "w-full mb-8 bg-volt/10 border border-volt/40 text-volt font-semibold py-4 rounded-full flex items-center justify-center gap-2 transition-all"
                        : "w-full mb-8 bg-volt text-volt-ink font-semibold py-4 rounded-full flex items-center justify-center gap-2 hover:bg-volt/90 transition-all"
                }
            >
                {isCommitted ? (
                    <>
                        <Check className="w-5 h-5" /> Committed — tap to undo
                    </>
                ) : (
                    "Commit to this path"
                )}
            </button>

            {/* Day in the life */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                <div className="bg-bg-surface rounded-2xl border border-border-subtle p-5">
                    <div className="flex items-center gap-2 mb-3">
                        <Clock className="w-4 h-4 text-volt" />
                        <h2 className="font-mono text-[11px] uppercase tracking-widest text-text-tertiary">
                            Schedule shape
                        </h2>
                    </div>
                    <p className="text-[15px] text-text-primary leading-relaxed">
                        {path.scheduleShape}
                    </p>
                </div>
                <div className="bg-bg-surface rounded-2xl border border-border-subtle p-5">
                    <div className="flex items-center gap-2 mb-3">
                        <Wallet className="w-4 h-4 text-volt" />
                        <h2 className="font-mono text-[11px] uppercase tracking-widest text-text-tertiary">
                            Income texture
                        </h2>
                    </div>
                    <p className="text-[15px] text-text-primary leading-relaxed">
                        {path.incomeTexture}
                    </p>
                </div>
            </div>

            {/* Loves / Hates */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                <div className="bg-bg-surface rounded-2xl border border-border-subtle p-5">
                    <div className="flex items-center gap-2 mb-3">
                        <Heart className="w-4 h-4 text-volt" />
                        <h2 className="font-mono text-[11px] uppercase tracking-widest text-text-tertiary">
                            What athletes love
                        </h2>
                    </div>
                    <ul className="space-y-2">
                        {path.loves.map((item) => (
                            <li
                                key={item}
                                className="flex gap-2 text-[15px] text-text-primary leading-relaxed"
                            >
                                <span className="text-volt shrink-0">·</span> {item}
                            </li>
                        ))}
                    </ul>
                </div>
                <div className="bg-bg-surface rounded-2xl border border-border-subtle p-5">
                    <div className="flex items-center gap-2 mb-3">
                        <AlertTriangle className="w-4 h-4 text-hrv" />
                        <h2 className="font-mono text-[11px] uppercase tracking-widest text-text-tertiary">
                            What&apos;s hard about it
                        </h2>
                    </div>
                    <ul className="space-y-2">
                        {path.hates.map((item) => (
                            <li
                                key={item}
                                className="flex gap-2 text-[15px] text-text-primary leading-relaxed"
                            >
                                <span className="text-hrv shrink-0">·</span> {item}
                            </li>
                        ))}
                    </ul>
                </div>
            </div>

            {/* First reps */}
            <section className="bg-bg-surface rounded-[20px] border border-border-subtle p-6 md:p-8 mb-8 grain">
                <div className="flex items-center gap-2 mb-4">
                    <Repeat className="w-4 h-4 text-volt" />
                    <h2 className="text-xl font-semibold text-text-primary">First three reps</h2>
                </div>
                <p className="text-[13px] text-text-secondary mb-5">
                    Low-risk ways to test this path before you commit.
                </p>
                <div className="space-y-3">
                    {path.firstReps.map((rep, i) => (
                        <div
                            key={rep}
                            className="flex items-center gap-4 bg-bg-elevated border border-border-subtle rounded-2xl px-5 py-4"
                        >
                            <span className="font-mono text-[13px] text-volt shrink-0">
                                {String(i + 1).padStart(2, "0")}
                            </span>
                            <span className="text-[15px] text-text-primary">{rep}</span>
                        </div>
                    ))}
                </div>
            </section>

            {/* Linked forum */}
            {forum && (
                <button
                    onClick={() => router.push(`/community/${forum.id}`)}
                    className="w-full text-left bg-bg-surface rounded-2xl border border-border-subtle p-5 hover:border-volt/50 hover:bg-bg-elevated transition-all duration-200 group"
                >
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-lg bg-volt/10 flex items-center justify-center shrink-0">
                            <Users className="w-6 h-6 text-volt" />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-[17px] font-semibold text-text-primary group-hover:text-volt transition-colors">
                                {forum.title}
                            </h3>
                            <p className="text-[13px] text-text-secondary">{forum.description}</p>
                            <p className="font-mono text-[11px] text-text-tertiary mt-1">
                                <span className="text-volt">{forum.activeNow} active</span> ·{" "}
                                {forum.memberCount} members
                            </p>
                        </div>
                    </div>
                </button>
            )}
        </div>
    );
}
