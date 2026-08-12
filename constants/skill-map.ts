export interface SkillMapEntry {
  skill: string;
  translation: string;
  origin: string;
}

const SPORT_SKILLS: Record<string, SkillMapEntry> = {
  football: {
    skill: "Film study",
    translation: "Pattern recognition and rapid preparation",
    origin: "Preparing for a changing opponent every week",
  },
  basketball: {
    skill: "Court vision",
    translation: "Real-time prioritization in fast systems",
    origin: "Reading motion and making the next pass",
  },
  soccer: {
    skill: "Field vision",
    translation: "Spatial planning across a moving team",
    origin: "Reading space before it opens",
  },
  track_field: {
    skill: "Training blocks",
    translation: "Long-horizon planning and measurable iteration",
    origin: "Building toward performance one cycle at a time",
  },
  swimming: {
    skill: "Split discipline",
    translation: "Process focus and precise self-measurement",
    origin: "Finding progress in hundredths of a second",
  },
};

const DEFAULT_SKILLS: SkillMapEntry[] = [
  {
    skill: "Two-a-days",
    translation: "Sustained output under fatigue",
    origin: "Showing up twice when motivation was not the plan",
  },
  {
    skill: "In-game adjustment",
    translation: "Decisions under pressure with incomplete information",
    origin: "Changing the approach while the clock kept moving",
  },
  {
    skill: "Teammate",
    translation: "Cross-functional collaboration",
    origin: "Owning a role inside a larger system",
  },
];

export function getSkillMapForSport(sport?: string | null): SkillMapEntry[] {
  const sportSkill = sport ? SPORT_SKILLS[sport] : undefined;
  return sportSkill ? [sportSkill, ...DEFAULT_SKILLS.slice(0, 2)] : DEFAULT_SKILLS;
}
