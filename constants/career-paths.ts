export interface CareerPath {
  id: string;
  name: string;
  icon: string;
  fit: "Strong fit" | "Explore";
  meta: string;
  rationale: string;
  tagline: string;
  schedule: string;
  income: string;
  loves: string[];
  challenges: string[];
  firstReps: string[];
  forumName: string;
}

export const CAREER_PATHS: CareerPath[] = [
  {
    id: "consulting",
    name: "Consulting",
    icon: "timer-outline",
    fit: "Strong fit",
    meta: "Project-based · Variable income",
    rationale:
      "Pattern recognition and preparation map directly to project work. Intensity arrives in seasons—like the ones you know.",
    tagline: "Monetize what you already know, one engagement at a time.",
    schedule:
      "Sprints and recoveries. Weeks of deep focus on a client problem, then space between engagements. Deadlines replace game days.",
    income:
      "Variable and project-based. Early gaps can be uneven; retainers make it steadier over time.",
    loves: [
      "Project intensity feels like a season",
      "Expertise is the product",
      "Every engagement is a new opponent to scout",
    ],
    challenges: [
      "No built-in team—you bring your own",
      "Income anxiety in the gaps",
      "Selling yourself feels unnatural at first",
    ],
    firstReps: [
      "List three problems your sport experience could solve",
      "Do one free advisory call for a local club",
      "Price a two-week pilot project",
    ],
    forumName: "The Consulting Circuit",
  },
  {
    id: "nine-to-five",
    name: "9–5 / Corporate",
    icon: "briefcase-outline",
    fit: "Strong fit",
    meta: "Salaried · Structured ladder",
    rationale:
      "Team structure, a clear ladder, and playbook culture make this the closest analog to a program.",
    tagline: "A roster, a playbook, and a ladder. The closest thing to a program.",
    schedule:
      "Predictable hours, a defined role, and a weekly rhythm. The structure arrives pre-built, like a training calendar used to.",
    income: "Salaried and steady. Raises and titles become part of the new stat line.",
    loves: ["Built-in team and routine", "Clear progression", "Benefits lower the background noise"],
    challenges: ["Feedback is less immediate", "Interview imposter syndrome", "Progress can feel slow"],
    firstReps: [
      "Rewrite one résumé bullet in civilian language",
      "Book one coffee chat with a former teammate",
      "Apply to one role a week for a month",
    ],
    forumName: "Corporate Athletes",
  },
  {
    id: "entrepreneurship",
    name: "Entrepreneurship",
    icon: "rocket-outline",
    fit: "Explore",
    meta: "Ownership · High variance",
    rationale:
      "Ownership creates a scoreboard again. It carries the most variance, so test it with small reps first.",
    tagline: "The new jersey says owner. Total control, total exposure.",
    schedule:
      "You set the structure. Days blur, milestones replace seasons, and recovery has to become intentional.",
    income: "Usually back-loaded. Runway planning is non-negotiable while the business finds traction.",
    loves: ["The market becomes a scoreboard", "Total ownership", "Fast learning loops"],
    challenges: ["High failure risk", "No guaranteed coach or team", "Runway math is unforgiving"],
    firstReps: [
      "Write the one-page version of the idea",
      "Sell something small this month",
      "Ask three founders about their hardest month",
    ],
    forumName: "Founders",
  },
  {
    id: "gig",
    name: "Gig Work",
    icon: "cash-outline",
    fit: "Explore",
    meta: "Immediate income · Self-structured",
    rationale: "Income and autonomy now, while you figure out the longer game.",
    tagline: "Money this week. Structure you build yourself.",
    schedule:
      "You choose every block. That freedom works best when you protect a weekly plan like a training schedule.",
    income: "Immediate and per-task. You feel every rep in the bank account, for better and worse.",
    loves: ["Income starts quickly", "High autonomy", "Combines with exploring other paths"],
    challenges: ["No built-in structure", "No ladder", "Income swings week to week"],
    firstReps: [
      "Complete one small gig",
      "Set a weekly income target",
      "Design and protect your own schedule",
    ],
    forumName: "Gig Life",
  },
  {
    id: "shift",
    name: "Overnight / Shift",
    icon: "moon-outline",
    fit: "Explore",
    meta: "Shift-based · Immediate openings",
    rationale:
      "Odd-hour tolerance can be an asset. This can be a strong bridge while the longer plan comes into focus.",
    tagline: "Wired for odd hours? That can be an asset here.",
    schedule:
      "Defined shifts and inverted days. Daylight stays open for classes, training, or building the next thing.",
    income: "Hourly and reliable, often with a shift differential.",
    loves: ["Clear boundaries", "Days can stay open", "Immediate openings"],
    challenges: ["Sleep debt", "Social isolation", "A bridge can quietly become a destination"],
    firstReps: [
      "Try one overnight shift before committing",
      "Build a recovery-quality sleep protocol",
      "Set a 90-day review date",
    ],
    forumName: "Night Shift",
  },
];

export const getCareerPath = (id?: string | null) =>
  CAREER_PATHS.find((path) => path.id === id);
