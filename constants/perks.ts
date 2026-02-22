export interface Perk {
  id: string;
  title: string;
  description: string;
  icon: string; // Ionicons name
  requirement: PerkRequirement;
  tier: "bronze" | "silver" | "gold" | "platinum";
}

export interface PerkRequirement {
  type: "streak" | "completions" | "checkins" | "days_active";
  count: number;
  label: string;
}

export const PERKS: Perk[] = [
  // Bronze tier — Getting Started
  {
    id: "p1",
    title: "First Step",
    description: "You showed up. That's the hardest part.",
    icon: "footsteps-outline",
    requirement: { type: "checkins", count: 1, label: "1 Check-in" },
    tier: "bronze",
  },
  {
    id: "p2",
    title: "Action Taker",
    description: "You completed your first daily action.",
    icon: "checkmark-done-outline",
    requirement: { type: "completions", count: 1, label: "1 Action Done" },
    tier: "bronze",
  },
  {
    id: "p3",
    title: "Three-Peat",
    description: "Three days in a row. You're building a habit.",
    icon: "flame-outline",
    requirement: { type: "streak", count: 3, label: "3-Day Streak" },
    tier: "bronze",
  },

  // Silver tier — Building Momentum
  {
    id: "p4",
    title: "Week Warrior",
    description: "A full week of showing up. That's real commitment.",
    icon: "calendar-outline",
    requirement: { type: "streak", count: 7, label: "7-Day Streak" },
    tier: "silver",
  },
  {
    id: "p5",
    title: "Consistent Player",
    description: "10 daily actions completed. You're in the game.",
    icon: "ribbon-outline",
    requirement: { type: "completions", count: 10, label: "10 Actions Done" },
    tier: "silver",
  },
  {
    id: "p6",
    title: "Check-in Champion",
    description: "10 check-ins logged. Self-awareness is a superpower.",
    icon: "clipboard-outline",
    requirement: { type: "checkins", count: 10, label: "10 Check-ins" },
    tier: "silver",
  },

  // Gold tier — Proving It
  {
    id: "p7",
    title: "Two-Week Titan",
    description: "14 days straight. You're proving it to yourself.",
    icon: "shield-checkmark-outline",
    requirement: { type: "streak", count: 14, label: "14-Day Streak" },
    tier: "gold",
  },
  {
    id: "p8",
    title: "Grinder",
    description: "25 daily actions. You don't quit.",
    icon: "barbell-outline",
    requirement: { type: "completions", count: 25, label: "25 Actions Done" },
    tier: "gold",
  },
  {
    id: "p9",
    title: "30-Day Legend",
    description: "One full month of showing up. You've built real momentum.",
    icon: "star-outline",
    requirement: { type: "streak", count: 30, label: "30-Day Streak" },
    tier: "gold",
  },

  // Platinum tier — Elite
  {
    id: "p10",
    title: "Iron Will",
    description: "60 days. Most people never get here. You're different.",
    icon: "diamond-outline",
    requirement: { type: "streak", count: 60, label: "60-Day Streak" },
    tier: "platinum",
  },
  {
    id: "p11",
    title: "Century Club",
    description: "50 daily actions completed. You're rewriting your story.",
    icon: "trophy-outline",
    requirement: { type: "completions", count: 50, label: "50 Actions Done" },
    tier: "platinum",
  },
  {
    id: "p12",
    title: "Full Journey",
    description: "90 days. You did it. The whole journey, completed.",
    icon: "medal-outline",
    requirement: { type: "streak", count: 90, label: "90-Day Streak" },
    tier: "platinum",
  },
];

export const TIER_COLORS: Record<Perk["tier"], { bg: string; text: string; border: string }> = {
  bronze: { bg: "#FFF3E0", text: "#E65100", border: "#FFB74D" },
  silver: { bg: "#F5F5F5", text: "#424242", border: "#BDBDBD" },
  gold: { bg: "#FFF8E1", text: "#F57F17", border: "#FFD54F" },
  platinum: { bg: "#ECEEFB", text: "#040485", border: "#A1A8EB" },
};

export const TIER_LABELS: Record<Perk["tier"], string> = {
  bronze: "Bronze",
  silver: "Silver",
  gold: "Gold",
  platinum: "Platinum",
};
