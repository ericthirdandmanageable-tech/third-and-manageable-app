export type AppTheme = "legacy" | "dusk" | "school";

export const APP_THEME_STORAGE_KEY = "tm-app-theme";

export type SchoolThemeKey = "tm" | "cleveland-state" | "cwru" | "bgsu";

export interface SchoolTheme {
  key: SchoolThemeKey;
  signal: string;
}

const SCHOOL_THEMES: Record<SchoolThemeKey, SchoolTheme> = {
  tm: { key: "tm", signal: "#2f6fed" },
  "cleveland-state": { key: "cleveland-state", signal: "#006747" },
  cwru: { key: "cwru", signal: "#071b78" },
  // The official orange is darkened only as far as needed for readable small
  // text on the light glass base. This matches the web theme's contrast pass.
  bgsu: { key: "bgsu", signal: "#c73e09" },
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

