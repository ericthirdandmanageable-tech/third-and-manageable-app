/*
 * CHECK-IN PROMPT REGISTRY — placeholder content (REDESIGN_BRIEF §4).
 * One entry = one daily prompt with its multiple-choice options.
 * Register at least one career-register prompt per week in production (§8).
 */

export type PromptRegister = 'identity' | 'daily' | 'career';

export interface CheckInPrompt {
  id: string;
  register: PromptRegister;
  question: string;
  options: string[];
}

export const CHECKIN_PROMPTS: CheckInPrompt[] = [
  {
    id: 'p1',
    register: 'identity',
    question: 'Based on your sleep data, how are you handling the transition today?',
    options: [
      'Missing the structured schedule.',
      'Feeling a loss of identity.',
      'My body hurts, but I feel guilty resting.',
      'Actually, today was a great day!',
    ],
  },
  {
    id: 'p2',
    register: 'career',
    question: 'What skill from your sport translates best to everyday life?',
    options: [
      'Discipline — I show up no matter what.',
      'Reading situations fast and adjusting.',
      'Leading people without a title.',
      'Honestly, I haven\'t figured that out yet.',
    ],
  },
  {
    id: 'p3',
    register: 'career',
    question: 'What interests or careers are you considering now?',
    options: [
      'Something with a team and a ladder.',
      'My own thing — I want ownership.',
      'Anything that pays while I figure it out.',
      'I\'m still exploring.',
    ],
  },
  {
    id: 'p4',
    register: 'daily',
    question: 'What does your daily routine look like now? How has it changed?',
    options: [
      'It\'s wide open — some days that\'s great, some days it\'s not.',
      'I\'m building a new structure piece by piece.',
      'I keep waking up on practice time.',
      'Routine? What routine.',
    ],
  },
  {
    id: 'p5',
    register: 'identity',
    question: 'What part of being an athlete do you carry with you every day?',
    options: [
      'The discipline.',
      'The competitiveness.',
      'The teammates — or missing them.',
      'The way my body feels.',
    ],
  },
];

/* Deterministic daily rotation — one prompt per day, cycling the registry */
export const getTodaysPrompt = (): CheckInPrompt => {
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86_400_000
  );
  return CHECKIN_PROMPTS[dayOfYear % CHECKIN_PROMPTS.length];
};
