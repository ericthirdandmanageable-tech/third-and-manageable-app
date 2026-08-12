export type AppTheme = "legacy" | "dusk" | "school";

export const APP_THEME_STORAGE_KEY = "tm-app-theme";

export type SchoolThemeKey = "tm" | "cleveland-state" | "cwru" | "bgsu";

export interface SchoolTheme {
  key: SchoolThemeKey;
  name: string;
  initials: string;
  signal: string;
  signalDark: string;
  soft: string;
}

const SCHOOL_THEMES: Record<SchoolThemeKey, SchoolTheme> = {
  tm: {
    key: "tm",
    name: "Third & Manageable",
    initials: "T&M",
    signal: "#2F6FED",
    signalDark: "#173F9A",
    soft: "#DCE8FB",
  },
  "cleveland-state": {
    key: "cleveland-state",
    name: "Cleveland State University",
    initials: "CSU",
    signal: "#006747",
    signalDark: "#004F37",
    soft: "#DDEFE8",
  },
  cwru: {
    key: "cwru",
    name: "Case Western Reserve University",
    initials: "CWRU",
    signal: "#071B78",
    signalDark: "#041255",
    soft: "#E1E8FF",
  },
  // The official orange is darkened only as far as needed for readable small
  // text on the light glass base. This matches the web theme's contrast pass.
  bgsu: {
    key: "bgsu",
    name: "Bowling Green State University",
    initials: "BGSU",
    signal: "#C73E09",
    signalDark: "#8E2B08",
    soft: "#FFE4D8",
  },
};

export const getSchoolTheme = (school?: string | null): SchoolTheme => {
  const normalized = school?.trim().toLowerCase() ?? "";

  if (normalized.includes("bowling green") || normalized === "bgsu") {
    return SCHOOL_THEMES.bgsu;
  }
  if (normalized.includes("case western") || normalized === "cwru") {
    return SCHOOL_THEMES.cwru;
  }
  if (normalized.includes("cleveland state") || normalized === "csu") {
    return SCHOOL_THEMES["cleveland-state"];
  }
  return SCHOOL_THEMES.tm;
};

export const getDefaultAppTheme = (hasVerifiedSchoolMatch: boolean): AppTheme =>
  hasVerifiedSchoolMatch ? "school" : "dusk";

export const isAppTheme = (value: string | null): value is AppTheme =>
  value === "legacy" || value === "dusk" || value === "school";
