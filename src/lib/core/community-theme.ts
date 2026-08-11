import { contrastRatio, ensureTextContrast, WCAG_AA_TEXT, WCAG_AA_UI } from "./contrast";

export interface CommunityTheme {
    key: "tm" | "cleveland-state" | "cwru" | "bgsu";
    communityName: string;
    organizationName: string;
    initials: string;
    primary: string;
    primaryDark: string;
    /** Icon strokes/borders on light surfaces (the page background, white cards). */
    accent: string;
    /** Text/labels on the dark hero gradient (`primaryDark` → `primary`). */
    accentOnDark: string;
    soft: string;
    text: string;
}

/** The near-white page background `accent` renders against (see community/page.tsx). */
const PAGE_SURFACE = "#f6f7f9";

interface SchoolBrand {
    key: CommunityTheme["key"];
    communityName: string;
    organizationName: string;
    initials: string;
    /** Official (or best-available) brand primary — kept as authored, never adjusted. */
    primary: string;
    primaryDark: string;
    /** Very light UI tint for badges/circles behind primary-colored icons. */
    soft: string;
    /**
     * The school's own secondary/tertiary brand colors, in *their* stated
     * preference order. `deriveSchoolTheme` picks the first one that reads
     * clearly in both places `accent` is actually used — as an eyebrow label
     * on the dark hero gradient, and as an icon/border tint on light cards —
     * instead of a single hand-picked value that may only work in one spot.
     */
    accentCandidates: [string, ...string[]];
}

/**
 * Turns a school's raw brand palette into a `CommunityTheme` whose text and
 * accent tokens are *provably* legible, rather than eyeballed:
 *
 * - `text` is the brand primary hue, walked toward black/white in HSL
 *   lightness only (hue/saturation preserved) until it clears WCAG AA
 *   (4.5:1) against the white community surface. A school's primary is
 *   chosen for jerseys and banners, not 15px body text — this keeps the
 *   school recognizable without failing contrast.
 * - `accent` and `accentOnDark` are chosen independently from the school's
 *   own secondary/tertiary colors, because the two surfaces they render on
 *   pull in opposite directions: a gold bright enough to read as an eyebrow
 *   label on a dark gradient is almost always too pale to read as an icon
 *   stroke on the near-white page background, and a brown dark enough for
 *   that page background is too dark to read on the gradient. Each token
 *   picks the first candidate (in the school's own stated order) that
 *   already passes on its surface; if none do, the top-preference candidate
 *   is nudged toward legible instead of discarded, so the school's first
 *   choice is honored whenever it can be made to pass.
 */
const deriveSchoolTheme = (brand: SchoolBrand): CommunityTheme => {
    const text = ensureTextContrast(brand.primary, "#ffffff", WCAG_AA_TEXT);

    const onLight = brand.accentCandidates.find(
        (candidate) => contrastRatio(candidate, PAGE_SURFACE) >= WCAG_AA_UI,
    );
    const accent =
        onLight ?? ensureTextContrast(brand.accentCandidates[0], PAGE_SURFACE, WCAG_AA_UI);

    const onDark = brand.accentCandidates.find(
        (candidate) => contrastRatio(candidate, brand.primaryDark) >= WCAG_AA_TEXT,
    );
    const accentOnDark =
        onDark ?? ensureTextContrast(brand.accentCandidates[0], brand.primaryDark, WCAG_AA_TEXT);

    return {
        key: brand.key,
        communityName: brand.communityName,
        organizationName: brand.organizationName,
        initials: brand.initials,
        primary: brand.primary,
        primaryDark: brand.primaryDark,
        soft: brand.soft,
        text,
        accent,
        accentOnDark,
    };
};

/**
 * The first white-label themes come directly from the proposal prototypes.
 * Unknown schools intentionally receive the neutral T&M system instead of a
 * guessed trademark palette. Brand hexes are best-available approximations
 * pending each athletics department's official brand-guide sign-off —
 * `deriveSchoolTheme` is what keeps them legible once those are swapped in.
 */
const BRANDS: Record<CommunityTheme["key"], SchoolBrand> = {
    tm: {
        key: "tm",
        communityName: "Third & Manageable Community",
        organizationName: "Verified Athletes & Supporters",
        initials: "T&M",
        primary: "#071c4f",
        primaryDark: "#031337",
        soft: "#f5efe1",
        accentCandidates: ["#c29a3a"],
    },
    "cleveland-state": {
        key: "cleveland-state",
        communityName: "Cleveland State Community",
        organizationName: "Official Cleveland State University Community",
        initials: "CSU",
        primary: "#006747",
        primaryDark: "#004f37",
        soft: "#e9f3ee",
        // CSU green + gold, gold candidates ordered brightest-first.
        accentCandidates: ["#ffc72c", "#f0c94b"],
    },
    cwru: {
        key: "cwru",
        communityName: "CWRU Community",
        organizationName: "Official Case Western Reserve University Community",
        initials: "CWRU",
        primary: "#071b78",
        primaryDark: "#041255",
        soft: "#eaf0ff",
        // CWRU blue + spirit blue / brand gray, in CWRU style-guide order.
        accentCandidates: ["#2f73e8", "#9ea2a2"],
    },
    bgsu: {
        key: "bgsu",
        communityName: "BGSU Community",
        organizationName: "Official Bowling Green State University Community",
        initials: "BGSU",
        primary: "#f04b0b",
        primaryDark: "#9e2d06",
        soft: "#fff0e8",
        // BGSU orange + seal brown, in BGSU style-guide order.
        accentCandidates: ["#4f2c1d", "#000000"],
    },
};

const THEMES: Record<CommunityTheme["key"], CommunityTheme> = Object.fromEntries(
    Object.entries(BRANDS).map(([key, brand]) => [key, deriveSchoolTheme(brand)]),
) as Record<CommunityTheme["key"], CommunityTheme>;

export const getCommunityTheme = (school?: string | null): CommunityTheme => {
    const normalized = school?.trim().toLowerCase() ?? "";
    if (
        normalized.includes("bowling green") ||
        normalized === "bgsu" ||
        normalized.includes("bowling green state")
    ) {
        return THEMES.bgsu;
    }
    if (
        normalized.includes("case western") ||
        normalized === "cwru" ||
        normalized.includes("case western reserve")
    ) {
        return THEMES.cwru;
    }
    if (
        normalized.includes("cleveland state") ||
        normalized === "csu" ||
        normalized.includes("cleveland state university")
    ) {
        return THEMES["cleveland-state"];
    }
    return THEMES.tm;
};
