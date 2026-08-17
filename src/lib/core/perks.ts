export type PerkMetric = "streak" | "completions" | "checkins" | "days_active";
export type PerkTier = "bronze" | "silver" | "gold" | "platinum";

export interface Perk {
    id: string;
    title: string;
    description: string;
    requirement: { type: PerkMetric; count: number; label: string };
    tier: PerkTier;
}

export interface PerkProgress {
    perk: Perk;
    currentValue: number;
    progress: number;
    unlocked: boolean;
}

// Ported from the production Expo app. The web version uses exact canonical
// check-in and completion counts instead of the mobile screen's streak proxy.
export const PERKS: Perk[] = [
    { id: "p1", title: "First Step", description: "You showed up. That's the hardest part.", requirement: { type: "checkins", count: 1, label: "1 Check-in" }, tier: "bronze" },
    { id: "p2", title: "Action Taker", description: "You completed your first daily action.", requirement: { type: "completions", count: 1, label: "1 Action Done" }, tier: "bronze" },
    { id: "p3", title: "Three-Peat", description: "Three days in a row. You're building a habit.", requirement: { type: "streak", count: 3, label: "3-Day Streak" }, tier: "bronze" },
    { id: "p4", title: "Week Warrior", description: "A full week of showing up. That's real commitment.", requirement: { type: "streak", count: 7, label: "7-Day Streak" }, tier: "silver" },
    { id: "p5", title: "Consistent Player", description: "10 daily actions completed. You're in the game.", requirement: { type: "completions", count: 10, label: "10 Actions Done" }, tier: "silver" },
    { id: "p6", title: "Check-in Champion", description: "10 check-ins logged. Self-awareness is a superpower.", requirement: { type: "checkins", count: 10, label: "10 Check-ins" }, tier: "silver" },
    { id: "p7", title: "Two-Week Titan", description: "14 days straight. You're proving it to yourself.", requirement: { type: "streak", count: 14, label: "14-Day Streak" }, tier: "gold" },
    { id: "p8", title: "Grinder", description: "25 daily actions. You don't quit.", requirement: { type: "completions", count: 25, label: "25 Actions Done" }, tier: "gold" },
    { id: "p9", title: "30-Day Legend", description: "One full month of showing up. You've built real momentum.", requirement: { type: "streak", count: 30, label: "30-Day Streak" }, tier: "gold" },
    { id: "p10", title: "Iron Will", description: "60 days. Most people never get here. You're different.", requirement: { type: "streak", count: 60, label: "60-Day Streak" }, tier: "platinum" },
    { id: "p11", title: "Century Club", description: "50 daily actions completed. You're rewriting your story.", requirement: { type: "completions", count: 50, label: "50 Actions Done" }, tier: "platinum" },
    { id: "p12", title: "Full Journey", description: "90 days. You did it. The whole journey, completed.", requirement: { type: "streak", count: 90, label: "90-Day Streak" }, tier: "platinum" },
];

export const PERK_TIERS: PerkTier[] = ["bronze", "silver", "gold", "platinum"];

export function calculatePerkProgress(input: {
    streak: number;
    completions: number;
    checkins: number;
    daysActive: number;
}): PerkProgress[] {
    const values: Record<PerkMetric, number> = {
        streak: input.streak,
        completions: input.completions,
        checkins: input.checkins,
        days_active: input.daysActive,
    };
    return PERKS.map((perk) => {
        const currentValue = Math.max(0, values[perk.requirement.type]);
        return {
            perk,
            currentValue,
            progress: Math.min(100, (currentValue / perk.requirement.count) * 100),
            unlocked: currentValue >= perk.requirement.count,
        };
    });
}
