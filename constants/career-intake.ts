import { CAREER_PATHS, type CareerPath, type CareerPathId } from "./career-paths";
import { getSkillMapForSport, type SkillMapEntry } from "./skill-map";

export const CAREER_INTAKE_KEY = "tm-career-intake-v1";

export interface CareerIntakeAnswers {
  role: string;
  favorite: string;
  reliedOn: string;
}

export const ROLE_OPTIONS = [
  "Captain / leader",
  "The engine — set the pace",
  "The strategist",
  "The spark off the bench",
  "The steady one",
];

export const FAVORITE_OPTIONS = [
  "The preparation",
  "The competition itself",
  "The team",
  "The pursuit of mastery",
];

export function deriveCareerSkillMap(
  answers: CareerIntakeAnswers | null,
  sport?: string | null,
): SkillMapEntry[] {
  const base = getSkillMapForSport(sport);
  if (!answers) return base;

  const role = answers.role.toLowerCase();
  const favorite = answers.favorite.toLowerCase();
  const additions: SkillMapEntry[] = [];

  if (role.includes("captain") || role.includes("leader")) {
    additions.push({
      skill: "Captain",
      translation: "Leading peers without positional authority",
      origin: "The role you held inside the team",
    });
  } else if (role.includes("engine")) {
    additions.push({
      skill: "Set the pace",
      translation: "Sustained output that raises a team's standard",
      origin: "The role you held inside the team",
    });
  } else if (role.includes("strategist")) {
    additions.push({
      skill: "Game planning",
      translation: "Pattern recognition and scenario planning",
      origin: "The role you held inside the team",
    });
  } else if (role.includes("spark")) {
    additions.push({
      skill: "Bench spark",
      translation: "High-impact contribution on demand",
      origin: "The role you held inside the team",
    });
  } else {
    additions.push({
      skill: "Consistency",
      translation: "Reliable performance under load",
      origin: "The role you held inside the team",
    });
  }

  if (favorite.includes("preparation")) {
    additions.push({ skill: "Preparation", translation: "Process-oriented delivery", origin: "What you loved about competing" });
  } else if (favorite.includes("competition")) {
    additions.push({ skill: "Competitiveness", translation: "Ownership of measurable outcomes", origin: "What you loved about competing" });
  } else if (favorite.includes("team")) {
    additions.push({ skill: "Teammate", translation: "Cross-functional collaboration", origin: "What you loved about competing" });
  } else {
    additions.push({ skill: "Mastery pursuit", translation: "Deliberate practice and iteration", origin: "What you loved about competing" });
  }

  return [...additions, ...base].filter(
    (entry, index, all) =>
      all.findIndex((candidate) => candidate.skill === entry.skill) === index,
  ).slice(0, 4);
}

export function rankCareerPaths(
  answers: CareerIntakeAnswers | null,
): CareerPath[] {
  if (!answers) return CAREER_PATHS;
  const role = answers.role.toLowerCase();
  const favorite = answers.favorite.toLowerCase();
  const score = new Map<CareerPathId, number>();
  const add = (id: CareerPathId, points: number) =>
    score.set(id, (score.get(id) ?? 0) + points);

  if (favorite.includes("preparation")) add("consulting", 3);
  if (favorite.includes("competition")) add("entrepreneurship", 3);
  if (favorite.includes("team")) add("nine_to_five", 3);
  if (favorite.includes("mastery")) {
    add("consulting", 2);
    add("gig", 1);
  }
  if (role.includes("strategist")) add("consulting", 2);
  if (role.includes("captain") || role.includes("leader")) {
    add("nine_to_five", 2);
    add("consulting", 1);
  }
  if (role.includes("engine")) add("overnight", 1);

  return [...CAREER_PATHS].sort(
    (left, right) => (score.get(right.id) ?? 0) - (score.get(left.id) ?? 0),
  );
}
