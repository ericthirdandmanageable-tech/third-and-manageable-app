/*
 * WORK PATH REGISTRY — placeholder content (REDESIGN_BRIEF §4).
 * Adding a new work structure = adding ONE entry here. It automatically
 * appears in: Path Fit ranking (Game Plan), Path Detail pages, and the
 * Community forum directory (Path forums are derived from this registry).
 *
 * Mirrors `backend/app/services/registry.py::WORK_PATHS`.
 *
 * `icon` is a lucide icon *name*, not a component. `lib/core` is imported by
 * Route Handlers as well as pages (VERCEL_MIGRATION_PLAN.md §2), and a React
 * component here would drag `lucide-react` into every server bundle that only
 * wanted the rules. It also matches the wire format — the backend already
 * serialises icons as strings. `components/athlete/icons.ts` resolves them.
 */

export type PathFit = "STRONG FIT" | "WORTH EXPLORING";

export interface WorkPath {
    id: string;
    name: string;
    icon: string;

    /* Path Fit card (Game Plan) */
    fit: PathFit;
    rationale: string; // tied to the athlete's skill map
    meta: string; // mono meta line, e.g. "Project-based · Variable income"

    /* Path Detail page */
    tagline: string;
    scheduleShape: string; // what a week actually looks like
    incomeTexture: string; // how money arrives
    loves: string[]; // what athletes love about it
    hates: string[]; // what athletes find hard
    firstReps: string[]; // first three low-risk ways to test it

    /* Derived community forum */
    forum: {
        title: string;
        description: string;
        memberCount: number;
        activeNow: number;
    };
}

export const WORK_PATHS: WorkPath[] = [
    {
        id: "consulting",
        name: "Consulting",
        icon: "Timer",
        fit: "STRONG FIT",
        rationale: "Pattern recognition + pitching map directly to project work. Intensity comes in seasons — like the ones you know.",
        meta: "Project-based · Variable income",
        tagline: "Monetize what you already know, one engagement at a time.",
        scheduleShape: "Sprints and recoveries. Weeks of deep focus on a client problem, then downtime between engagements. Deadlines replace game days.",
        incomeTexture: "Variable, project-based. Feast/famine early; retainers smooth it out later.",
        loves: ["Project intensity feels like a season", "Expertise is the product — no starting from zero", "Every engagement is a new opponent to scout"],
        hates: ["No built-in team — you bring your own", "Income anxiety in the gaps", "Selling yourself feels unnatural at first"],
        firstReps: ["List 3 problems your sport expertise solves for someone", "Do one free advisory call for a local club", "Price a 2-week pilot project"],
        forum: { title: "The Consulting Circuit", description: "Project seasons, client games, monetizing what you know.", memberCount: 640, activeNow: 31 },
    },
    {
        id: "nine_to_five",
        name: "9–5 / Corporate",
        icon: "Briefcase",
        fit: "STRONG FIT",
        rationale: "Team structure, clear ladder, playbook culture — the closest analog to a program.",
        meta: "Salaried · Structured ladder",
        tagline: "A roster, a playbook, and a ladder. The closest thing to a program.",
        scheduleShape: "Predictable. Fixed hours, defined role, weekly rhythm — structure arrives pre-built, like a training schedule used to.",
        incomeTexture: "Salaried and steady. Raises and titles are the new stat line.",
        loves: ["Built-in team and routine", "Clear progression — you always know the depth chart", "Benefits and stability lower the background noise"],
        hates: ["No visible scoreboard — feedback is a yearly PDF", "Imposter syndrome in interviews", "Progress feels slow after sport's immediacy"],
        firstReps: ["Rewrite one resume bullet in civilian language", "Coffee chat with one former teammate in industry", "Apply to one role a week for a month"],
        forum: { title: "Corporate Athletes", description: "Life in the 9–5. Scoreboards look different here.", memberCount: 2300, activeNow: 120 },
    },
    {
        id: "entrepreneurship",
        name: "Entrepreneurship",
        icon: "Rocket",
        fit: "WORTH EXPLORING",
        rationale: "Ownership and a scoreboard again. Highest variance — test it with small reps first.",
        meta: "Ownership · High variance",
        tagline: 'The new jersey says "owner." Total control, total exposure.',
        scheduleShape: "No off-switch. You set the structure — which is exactly the muscle this app builds. Days blur; milestones replace seasons.",
        incomeTexture: "Back-loaded. Nothing for a while, then potentially everything. Runway planning is non-negotiable.",
        loves: ["Competition replacement — the market is a scoreboard", 'Identity continuation: "founder" is a new jersey', "Total ownership of the outcome"],
        hates: ["Highest failure risk of any path", "No coach, no playbook, no guaranteed teammates", "Runway math is unforgiving"],
        firstReps: ["Write the one-page version of the idea", "Sell something small this month — anything", "Talk to 3 founders about their worst month"],
        forum: { title: "Founders", description: 'The new jersey says "owner." Reality-testing welcome.', memberCount: 475, activeNow: 28 },
    },
    {
        id: "gig",
        name: "Gig Work",
        icon: "DollarSign",
        fit: "WORTH EXPLORING",
        rationale: "Income and autonomy now, while you figure out the longer game.",
        meta: "Immediate income · Self-structured",
        tagline: "Money this week. Structure you build yourself.",
        scheduleShape: "You choose every block. Total autonomy — which is freedom on good weeks and a void on bad ones. Pairs well with a daily check-in habit.",
        incomeTexture: "Immediate and per-task. You feel every rep in the bank account, for better and worse.",
        loves: ["Income starts immediately", "Physical autonomy — your body is yours again", "Easy to combine with exploring other paths"],
        hates: ["No structure at all — the exact void you're grieving", "No team, no ladder, no one keeping score", "Income swings week to week"],
        firstReps: ["Sign up for one platform and complete one gig", "Set a weekly income target like a training goal", "Design your own weekly schedule — and guard it"],
        forum: { title: "Gig Life", description: "Income now, structure you build yourself.", memberCount: 890, activeNow: 54 },
    },
    {
        id: "overnight",
        name: "Overnight / Shift",
        icon: "Moon",
        fit: "WORTH EXPLORING",
        rationale: "Matches athlete wiring for odd hours. A bridge with immediate openings — not a dead end.",
        meta: "Shift-based · Immediate openings",
        tagline: "Wired for odd hours? That's an asset here. A bridge, not a dead end.",
        scheduleShape: "Inverted days. The world is quiet, shifts are defined, and daylight is free for training, classes, or building the next thing.",
        incomeTexture: "Hourly and reliable, often with shift differentials. Predictable paychecks while you plan the next move.",
        loves: ["Odd-hours tolerance most people don't have", "Days stay free for the next chapter", "Immediate openings, low barrier to entry"],
        hates: ["Sleep debt is a real opponent", "Social isolation — your hours miss everyone else's", "Must stay a bridge: easy to drift"],
        firstReps: ["Try one overnight shift before committing", "Build a sleep protocol like a recovery protocol", "Set a 90-day review date — bridge or destination?"],
        forum: { title: "Night Shift", description: "For the ones wired for odd hours. A bridge, not a dead end.", memberCount: 310, activeNow: 22 },
    },
];

export const getPath = (id: string | undefined) =>
    WORK_PATHS.find((p) => p.id === id);
