export interface DailyAction {
  id: string;
  title: string;
  description: string;
  category: "mindset" | "routine" | "social" | "reflection" | "wellness";
  icon: string; // Ionicons name
}

/**
 * Pool of daily actions for the Game Plan feature.
 * One action is selected per day based on a deterministic rotation.
 */
export const ACTIONS: DailyAction[] = [
  // Mindset
  {
    id: "m1",
    title: "Write Down 3 Wins",
    description:
      "List three things — big or small — that went well today. Training your brain to see progress.",
    category: "mindset",
    icon: "trophy-outline",
  },
  {
    id: "m2",
    title: "Reframe a Setback",
    description:
      "Think of one thing that didn't go as planned. Write down what you learned from it.",
    category: "mindset",
    icon: "refresh-outline",
  },
  {
    id: "m3",
    title: "Visualize Your Next Chapter",
    description:
      "Spend 2 minutes picturing where you want to be in 6 months. What does that look like?",
    category: "mindset",
    icon: "eye-outline",
  },
  {
    id: "m4",
    title: "Replace One Negative Thought",
    description:
      'Catch a self-critical thought today and rewrite it. "I can\'t" becomes "I\'m learning to."',
    category: "mindset",
    icon: "swap-horizontal-outline",
  },

  // Routine
  {
    id: "r1",
    title: "Morning Stretch (5 min)",
    description:
      "Start your day with 5 minutes of gentle stretching. Your body still needs movement.",
    category: "routine",
    icon: "body-outline",
  },
  {
    id: "r2",
    title: "Set One Priority for Today",
    description:
      "Pick the single most important thing you want to accomplish today. Focus beats multitasking.",
    category: "routine",
    icon: "flag-outline",
  },
  {
    id: "r3",
    title: "Screen-Free Hour Before Bed",
    description:
      "Put your phone away 1 hour before sleep. Read, journal, or just breathe.",
    category: "routine",
    icon: "moon-outline",
  },
  {
    id: "r4",
    title: "Hydrate First Thing",
    description:
      "Drink a full glass of water before anything else this morning. Small habit, big impact.",
    category: "routine",
    icon: "water-outline",
  },

  // Social
  {
    id: "s1",
    title: "Reach Out to Someone",
    description:
      "Text or call a friend, teammate, or family member you haven't talked to recently.",
    category: "social",
    icon: "chatbubbles-outline",
  },
  {
    id: "s2",
    title: "Ask Someone How They're Doing",
    description:
      "Connection is a two-way street. Check in on someone else today — it helps you too.",
    category: "social",
    icon: "people-outline",
  },
  {
    id: "s3",
    title: "Share Something You're Working On",
    description:
      "Tell someone about a goal or project you're pursuing. Saying it out loud makes it real.",
    category: "social",
    icon: "megaphone-outline",
  },

  // Reflection
  {
    id: "re1",
    title: "Journal for 5 Minutes",
    description:
      "Free-write whatever comes to mind. No rules, no structure. Just get it out.",
    category: "reflection",
    icon: "create-outline",
  },
  {
    id: "re2",
    title: "Name One Thing You're Grateful For",
    description:
      "It doesn't need to be big. Gratitude rewires how you see your day.",
    category: "reflection",
    icon: "heart-outline",
  },
  {
    id: "re3",
    title: "Reflect on Your Sport Journey",
    description:
      "What's one thing your sport taught you that still applies today? Write it down.",
    category: "reflection",
    icon: "fitness-outline",
  },
  {
    id: "re4",
    title: "Letter to Your Future Self",
    description:
      "Write 3 sentences to yourself 90 days from now. What do you hope to tell them?",
    category: "reflection",
    icon: "mail-outline",
  },

  // Wellness
  {
    id: "w1",
    title: "Take a 15-Minute Walk",
    description:
      "No music, no podcast. Just walk and notice what's around you. Reset your mind.",
    category: "wellness",
    icon: "walk-outline",
  },
  {
    id: "w2",
    title: "Practice Box Breathing",
    description:
      "4 seconds in, 4 seconds hold, 4 seconds out, 4 seconds hold. Repeat 4 times.",
    category: "wellness",
    icon: "leaf-outline",
  },
  {
    id: "w3",
    title: "Cook a Healthy Meal",
    description:
      "Fuel your body intentionally today. You don't need a meal plan — just one good choice.",
    category: "wellness",
    icon: "restaurant-outline",
  },
  {
    id: "w4",
    title: "10-Minute Body Scan",
    description:
      "Lie down, close your eyes, and slowly check in with each body part from toes to head.",
    category: "wellness",
    icon: "medkit-outline",
  },
];

/**
 * Get today's daily action using a deterministic rotation based on date.
 * The same action shows for the same user on the same day.
 */
export function getTodayAction(userId: string): DailyAction {
  const today = new Date();
  const dayOfYear =
    Math.floor(
      (today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) /
        (1000 * 60 * 60 * 24),
    );
  // Mix user ID hash with day to get a pseudo-random but deterministic index
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = (hash << 5) - hash + userId.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs((hash + dayOfYear) % ACTIONS.length);
  return ACTIONS[index];
}

/**
 * Category display config
 */
export const CATEGORY_LABELS: Record<DailyAction["category"], string> = {
  mindset: "Mindset",
  routine: "Daily Routine",
  social: "Connection",
  reflection: "Reflection",
  wellness: "Wellness",
};

export const CATEGORY_COLORS: Record<DailyAction["category"], string> = {
  mindset: "#0618A8",
  routine: "#040485",
  social: "#3940C9",
  reflection: "#6E78D9",
  wellness: "#030366",
};
