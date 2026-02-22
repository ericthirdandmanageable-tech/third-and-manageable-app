/**
 * Structured daily conversation prompts for community rooms.
 * Covers identity, purpose, discipline beyond sport, and transition topics.
 * One prompt is deterministically selected per day.
 */

export interface DailyPrompt {
  id: string;
  text: string;
  category: "identity" | "purpose" | "discipline" | "connection" | "growth";
}

export const DAILY_PROMPTS: DailyPrompt[] = [
  // Identity
  { id: "p1", text: "What's been the hardest part about your transition?", category: "identity" },
  { id: "p2", text: "Outside of your sport, what are you most proud of?", category: "identity" },
  { id: "p3", text: "How do you introduce yourself now that sport isn't the first thing?", category: "identity" },
  { id: "p4", text: "What part of being an athlete do you carry with you every day?", category: "identity" },
  { id: "p5", text: "When did you first realize your identity was bigger than your sport?", category: "identity" },
  { id: "p6", text: "What's something people don't understand about life after sport?", category: "identity" },
  { id: "p7", text: "If you could tell your younger self one thing about transition, what would it be?", category: "identity" },

  // Purpose
  { id: "p8", text: "What interests or careers are you considering now?", category: "purpose" },
  { id: "p9", text: "What gives you energy outside of competition?", category: "purpose" },
  { id: "p10", text: "What's one thing you've always wanted to try but sport kept you from?", category: "purpose" },
  { id: "p11", text: "Who inspires you outside of athletics?", category: "purpose" },
  { id: "p12", text: "What does success look like for you in this next chapter?", category: "purpose" },
  { id: "p13", text: "What skill from your sport translates best to everyday life?", category: "purpose" },

  // Discipline
  { id: "p14", text: "What does your daily routine look like now? How has it changed?", category: "discipline" },
  { id: "p15", text: "How do you stay disciplined without a training schedule?", category: "discipline" },
  { id: "p16", text: "What's one healthy habit you've built since stepping away from sport?", category: "discipline" },
  { id: "p17", text: "How do you handle days when motivation is low?", category: "discipline" },
  { id: "p18", text: "What does 'showing up' mean to you now?", category: "discipline" },

  // Connection
  { id: "p19", text: "Who's been your biggest support during this transition?", category: "connection" },
  { id: "p20", text: "How do you stay connected with teammates from your playing days?", category: "connection" },
  { id: "p21", text: "What advice would you give another athlete going through this?", category: "connection" },
  { id: "p22", text: "Have you found a new community or group that fills the team void?", category: "connection" },
  { id: "p23", text: "What does support look like to you right now?", category: "connection" },

  // Growth
  { id: "p24", text: "What's one win you've had this week, no matter how small?", category: "growth" },
  { id: "p25", text: "What's something you've learned about yourself recently?", category: "growth" },
  { id: "p26", text: "How are you growing differently now compared to when you were competing?", category: "growth" },
  { id: "p27", text: "What's a challenge you're facing right now that you want to overcome?", category: "growth" },
  { id: "p28", text: "What does progress look like for you today?", category: "growth" },
];

/**
 * Get today's conversation prompt using a deterministic daily selection.
 * Same prompt for all users on the same day.
 */
export function getTodayPrompt(): DailyPrompt {
  const now = new Date();
  const dayOfYear = Math.floor(
    (now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24),
  );
  const index = dayOfYear % DAILY_PROMPTS.length;
  return DAILY_PROMPTS[index];
}

export const PROMPT_CATEGORY_LABELS: Record<DailyPrompt["category"], string> = {
  identity: "Identity",
  purpose: "Purpose",
  discipline: "Discipline",
  connection: "Connection",
  growth: "Growth",
};
