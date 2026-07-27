export interface CommunityTheme {
    key: "tm" | "cleveland-state" | "cwru" | "bgsu";
    communityName: string;
    organizationName: string;
    initials: string;
    primary: string;
    primaryDark: string;
    accent: string;
    soft: string;
    text: string;
}

const THEMES: Record<CommunityTheme["key"], CommunityTheme> = {
    tm: {
        key: "tm",
        communityName: "Third & Manageable Community",
        organizationName: "Verified Athletes & Supporters",
        initials: "T&M",
        primary: "#071c4f",
        primaryDark: "#031337",
        accent: "#c29a3a",
        soft: "#f5efe1",
        text: "#071c4f",
    },
    "cleveland-state": {
        key: "cleveland-state",
        communityName: "Cleveland State Community",
        organizationName: "Official Cleveland State University Community",
        initials: "CSU",
        primary: "#006747",
        primaryDark: "#004f37",
        accent: "#f0c94b",
        soft: "#e9f3ee",
        text: "#004f37",
    },
    cwru: {
        key: "cwru",
        communityName: "CWRU Community",
        organizationName: "Official Case Western Reserve University Community",
        initials: "CWRU",
        primary: "#071b78",
        primaryDark: "#041255",
        accent: "#2f73e8",
        soft: "#eaf0ff",
        text: "#071b78",
    },
    bgsu: {
        key: "bgsu",
        communityName: "BGSU Community",
        organizationName: "Official Bowling Green State University Community",
        initials: "BGSU",
        primary: "#f04b0b",
        primaryDark: "#9e2d06",
        accent: "#4f2c1d",
        soft: "#fff0e8",
        text: "#d43d06",
    },
};

/**
 * The first white-label themes come directly from the proposal prototypes.
 * Unknown schools intentionally receive the neutral T&M system instead of a
 * guessed trademark palette.
 */
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

