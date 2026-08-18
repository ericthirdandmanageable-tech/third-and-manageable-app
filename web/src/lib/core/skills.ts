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
    { skill: "Film study", translation: "Pattern recognition & rapid preparation", origin: "Preparing for opponents weekly" },
    { skill: "Two-a-days", translation: "Sustained output under fatigue", origin: "Double training sessions" },
    { skill: "Captain", translation: "Leading peers without authority", origin: "Team leadership role" },
    { skill: "In-game adjustments", translation: "Real-time decisions under pressure", origin: "Mid-game problem solving" },
    { skill: "Recruiting visits", translation: "Stakeholder management & pitching", origin: "Being recruited / recruiting hosts" },
];

/*
 * INTAKE PROMPTS — Hinge-style guided prompts (REDESIGN_BRIEF §16.1,
 * Option A): stories, not forms. Answers feed the Skill Map.
 */
export interface IntakeStep {
    id: string;
    kind: "select" | "prompt";
    label: string;
    options?: string[]; // for select steps
    placeholder?: string; // for prompt steps
}

export const INTAKE_STEPS: IntakeStep[] = [
    {
        id: "sport",
        kind: "select",
        label: "What's your sport?",
        options: ["Soccer", "Basketball", "Football", "Track & Field", "Swimming", "Other"],
    },
    {
        id: "role",
        kind: "select",
        label: "What was your role on the team?",
        options: ["Captain / leader", "The engine — set the pace", "The strategist", "The spark off the bench", "The steady one"],
    },
    {
        id: "years",
        kind: "select",
        label: "How long did you compete?",
        options: ["1–4 years", "5–9 years", "10–15 years", "15+ years"],
    },
    {
        id: "relied_on",
        kind: "prompt",
        label: "The moment your teammates most relied on you was…",
        placeholder: "A sentence or two — stories, not bullet points.",
    },
    {
        id: "favorite",
        kind: "select",
        label: "What was your favorite part of competing?",
        options: ["The preparation", "The competition itself", "The team", "The pursuit of mastery"],
    },
];

export type IntakeAnswers = Record<string, string>;

/** Deterministic v1 of the transferable-skill engine. */
export function deriveSkillMap(intake: IntakeAnswers): SkillMapEntry[] {
    const role = (intake.role ?? "").toLowerCase();
    const favorite = (intake.favorite ?? "").toLowerCase();
    const reliedOn = (intake.relied_on ?? "").toLowerCase();
    const entries: SkillMapEntry[] = [];

    if (role.includes("captain") || role.includes("leader")) {
        entries.push({ skill: "Captain", translation: "Leading peers without authority", origin: "Team leadership role" });
    }
    if (role.includes("engine")) {
        entries.push({ skill: "Two-a-days", translation: "Sustained output under fatigue", origin: "Set the pace every session" });
    }
    if (role.includes("strategist")) {
        entries.push({ skill: "Film study", translation: "Pattern recognition & rapid preparation", origin: "Game planning weekly" });
    }
    if (role.includes("spark")) {
        entries.push({ skill: "Bench spark", translation: "High-impact bursts on demand", origin: "Energy off the bench" });
    }
    if (role.includes("steady")) {
        entries.push({ skill: "Consistency", translation: "Reliable performance under load", origin: "Being the steady one" });
    }

    if (favorite.includes("preparation")) {
        entries.push({ skill: "Preparation", translation: "Process-oriented delivery", origin: "Loved the prep" });
    } else if (favorite.includes("competition itself")) {
        entries.push({ skill: "Competitiveness", translation: "Ownership of outcomes", origin: "Lived for the game" });
    } else if (favorite.includes("team")) {
        entries.push({ skill: "Teammate", translation: "Cross-functional collaboration", origin: "Loved the team" });
    } else if (favorite.includes("mastery")) {
        entries.push({ skill: "Mastery pursuit", translation: "Deliberate practice & iteration", origin: "Loved the pursuit" });
    }

    if (reliedOn.trim().split(/\s+/).filter(Boolean).length >= 8) {
        entries.push({ skill: "Recruiting visits", translation: "Stakeholder management & pitching", origin: "Story shared in intake" });
    }

    if (!entries.length) {
        entries.push(
            { skill: "Film study", translation: "Pattern recognition & rapid preparation", origin: "Default mapping" },
            { skill: "Two-a-days", translation: "Sustained output under fatigue", origin: "Default mapping" },
        );
    }

    return entries.filter(
        (entry, index) => entries.findIndex((candidate) => candidate.skill === entry.skill) === index,
    );
}
