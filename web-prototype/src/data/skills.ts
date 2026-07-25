/*
 * SKILL TRANSLATION REGISTRY — placeholder content (REDESIGN_BRIEF §9.1).
 * Maps sport experiences to civilian-language skills. In production this is
 * generated from the intake (rule-based v1, LLM-assisted v1.5); adding a
 * mapping here extends the engine's vocabulary.
 */

export interface SkillMapEntry {
  skill: string; // the sport-native label, rendered as a volt chip
  translation: string; // the civilian translation
  origin: string; // where it comes from — the app always shows its work
}

export const SKILL_MAP: SkillMapEntry[] = [
  { skill: 'Film study', translation: 'Pattern recognition & rapid preparation', origin: 'Preparing for opponents weekly' },
  { skill: 'Two-a-days', translation: 'Sustained output under fatigue', origin: 'Double training sessions' },
  { skill: 'Captain', translation: 'Leading peers without authority', origin: 'Team leadership role' },
  { skill: 'In-game adjustments', translation: 'Real-time decisions under pressure', origin: 'Mid-game problem solving' },
  { skill: 'Recruiting visits', translation: 'Stakeholder management & pitching', origin: 'Being recruited / recruiting hosts' },
];

/*
 * INTAKE PROMPTS — Hinge-style guided prompts (REDESIGN_BRIEF §16.1,
 * Option A): stories, not forms. Answers feed the Skill Map.
 */
export interface IntakeStep {
  id: string;
  kind: 'select' | 'prompt';
  label: string;
  options?: string[]; // for select steps
  placeholder?: string; // for prompt steps
}

export const INTAKE_STEPS: IntakeStep[] = [
  {
    id: 'sport',
    kind: 'select',
    label: "What's your sport?",
    options: ['Soccer', 'Basketball', 'Football', 'Track & Field', 'Swimming', 'Other'],
  },
  {
    id: 'role',
    kind: 'select',
    label: 'What was your role on the team?',
    options: ['Captain / leader', 'The engine — set the pace', 'The strategist', 'The spark off the bench', 'The steady one'],
  },
  {
    id: 'years',
    kind: 'select',
    label: 'How long did you compete?',
    options: ['1–4 years', '5–9 years', '10–15 years', '15+ years'],
  },
  {
    id: 'relied_on',
    kind: 'prompt',
    label: 'The moment your teammates most relied on you was…',
    placeholder: 'A sentence or two — stories, not bullet points.',
  },
  {
    id: 'favorite',
    kind: 'select',
    label: 'What was your favorite part of competing?',
    options: ['The preparation', 'The competition itself', 'The team', 'The pursuit of mastery'],
  },
];
