"use client";

import { Award, Check, LockKeyhole, Trophy } from "lucide-react";
import clsx from "clsx";

import { useCheckIns } from "@/lib/athlete/use-checkins";
import { useGamePlan } from "@/lib/athlete/use-game-plan";
import { calculatePerkProgress, PERK_TIERS, type PerkTier } from "@/lib/core/perks";

const TIER_LABELS: Record<PerkTier, string> = {
    bronze: "Bronze",
    silver: "Silver",
    gold: "Gold",
    platinum: "Platinum",
};

const TIER_CLASSES: Record<PerkTier, string> = {
    bronze: "border-orange-400/40 bg-orange-400/10 text-orange-600",
    silver: "border-slate-400/40 bg-slate-400/10 text-slate-500",
    gold: "border-amber-400/40 bg-amber-400/10 text-amber-600",
    platinum: "border-indigo-400/40 bg-indigo-400/10 text-indigo-600",
};

export default function PerksPage() {
    const { data } = useGamePlan();
    const { history, streak, dayNumber, loading: checkInsLoading } = useCheckIns();
    const statuses = calculatePerkProgress({
        streak,
        completions: data.completedActionIds.length,
        checkins: history.length,
        daysActive: Math.max(0, dayNumber - 1),
    });
    const unlockedCount = statuses.filter((status) => status.unlocked).length;
    const loading = data.loading || checkInsLoading;

    return (
        <div className="p-6 md:p-10 max-w-3xl mx-auto animate-rise">
            <header className="mb-8">
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-text-tertiary">Rewards</p>
                <h1 className="font-serif text-4xl italic text-sand">Perks</h1>
                <p className="mt-2 text-sm text-text-secondary">Earned by showing up consistently—not by comparing yourself to anyone else.</p>
                <div className="yard-line mt-4" />
            </header>

            <section className="grain mb-8 rounded-[20px] border border-volt/30 bg-volt/10 p-6">
                <div className="flex items-center justify-between gap-5">
                    <div>
                        <p className="font-mono text-[10px] uppercase tracking-widest text-volt">Perks unlocked</p>
                        <p className="mt-1 font-mono text-4xl text-text-primary">{loading ? "—" : unlockedCount}<span className="text-xl text-text-tertiary"> / {statuses.length}</span></p>
                    </div>
                    <span className="flex h-14 w-14 items-center justify-center rounded-full bg-volt text-volt-ink"><Trophy className="h-6 w-6" /></span>
                </div>
                <div className="mt-5 h-2 overflow-hidden rounded-full bg-bg-elevated" role="progressbar" aria-label="Overall perk progress" aria-valuemin={0} aria-valuemax={statuses.length} aria-valuenow={unlockedCount}>
                    <div className="h-full rounded-full bg-volt transition-all" style={{ width: `${(unlockedCount / statuses.length) * 100}%` }} />
                </div>
            </section>

            {PERK_TIERS.map((tier) => {
                const tierStatuses = statuses.filter((status) => status.perk.tier === tier);
                const tierUnlocked = tierStatuses.filter((status) => status.unlocked).length;
                return (
                    <section key={tier} className="mb-8">
                        <div className="mb-3 flex items-center gap-3">
                            <span className={clsx("rounded-full border px-3 py-1 font-mono text-[10px] uppercase tracking-widest", TIER_CLASSES[tier])}>{TIER_LABELS[tier]}</span>
                            <span className="font-mono text-[10px] uppercase tracking-wider text-text-tertiary">{tierUnlocked}/{tierStatuses.length} earned</span>
                        </div>
                        <div className="space-y-3">
                            {tierStatuses.map(({ perk, currentValue, progress, unlocked }) => (
                                <article key={perk.id} className={clsx("rounded-[20px] border bg-bg-surface p-5", unlocked ? "border-volt/30" : "border-border-subtle")}>
                                    <div className="flex items-start gap-4">
                                        <span className={clsx("flex h-10 w-10 shrink-0 items-center justify-center rounded-full", unlocked ? "bg-volt/10 text-volt" : "bg-bg-elevated text-text-tertiary")}>
                                            {unlocked ? <Award className="h-5 w-5" /> : <LockKeyhole className="h-4 w-4" />}
                                        </span>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2">
                                                <h2 className="font-semibold text-text-primary">{perk.title}</h2>
                                                {unlocked && <Check className="h-4 w-4 text-volt" aria-label="Unlocked" />}
                                            </div>
                                            <p className="mt-1 text-[13px] text-text-secondary">{unlocked ? perk.description : perk.requirement.label}</p>
                                            {!unlocked && (
                                                <div className="mt-3">
                                                    <div className="h-1.5 overflow-hidden rounded-full bg-bg-elevated" role="progressbar" aria-label={`${perk.title} progress`} aria-valuemin={0} aria-valuemax={perk.requirement.count} aria-valuenow={Math.min(currentValue, perk.requirement.count)}>
                                                        <div className="h-full rounded-full bg-volt/70" style={{ width: `${progress}%` }} />
                                                    </div>
                                                    <p className="mt-1.5 font-mono text-[9px] uppercase tracking-wider text-text-tertiary">{currentValue} / {perk.requirement.count}</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </article>
                            ))}
                        </div>
                    </section>
                );
            })}
        </div>
    );
}
