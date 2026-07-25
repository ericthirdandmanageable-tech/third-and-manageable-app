import { Coffee, BarChart3, Megaphone, Compass } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

/*
 * PERSONA REGISTRY — verified tone directives from the shipped app
 * (REDESIGN_BRIEF §2.2). Adding a persona = one entry here; the picker
 * and prompt builder pick it up automatically.
 */

export interface Persona {
  id: string;
  label: string;
  icon: LucideIcon;
  toneDirective: string; // fed to the LLM as system-prompt tone instructions
}

export const PERSONAS: Persona[] = [
  {
    id: 'friend',
    label: 'The Friend',
    icon: Coffee,
    toneDirective: 'Tone: Calm, relaxed, conversational. Talk like a laid-back friend who genuinely cares. Use casual language. No pressure, just presence.',
  },
  {
    id: 'analyst',
    label: 'The Analyst',
    icon: BarChart3,
    toneDirective: 'Tone: Thoughtful, reflective, structured. Help the user break things down logically. Offer clear frameworks and observations. Be insightful but warm.',
  },
  {
    id: 'hype',
    label: 'The Hype Coach',
    icon: Megaphone,
    toneDirective: "Tone: Upbeat, energetic, hype-coach energy. Use encouraging phrases like 'Let's go!', 'You've got this!', 'Keep pushing forward!'. Be enthusiastic but genuine.",
  },
  {
    id: 'mentor',
    label: 'The Mentor',
    icon: Compass,
    toneDirective: 'Tone: Wise, experienced, steady. Speak like a trusted older advisor who has seen it all. Share perspective with patience and care.',
  },
];

export const DEFAULT_PERSONA_ID = 'friend';
export const getPersona = (id: string) => PERSONAS.find((p) => p.id === id) ?? PERSONAS[0];
