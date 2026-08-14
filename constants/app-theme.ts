import { ensureTextContrast, WCAG_AA_TEXT } from "./contrast";
import {
  BRAND_TOKEN_SPEC,
  type SupportedInstitutionId,
} from "./brand-token-spec";

export type AppTheme = "legacy" | "dusk" | "school";

export const APP_THEME_STORAGE_KEY = "tm-app-theme";

export const GLASS_COLOR_SCHEME = BRAND_TOKEN_SPEC.glass.colorScheme;
export const SUPPORTS_DARK_GLASS = BRAND_TOKEN_SPEC.glass.supportsDark;
export const APP_THEME_GLASS_BASE = BRAND_TOKEN_SPEC.glass.base;

export type InstitutionId = SupportedInstitutionId;

export type SchoolThemeKey = "tm" | "cleveland-state" | "cwru" | "bgsu";

export interface SchoolTheme {
  key: SchoolThemeKey;
  institutionId: InstitutionId | null;
  name: string;
  initials: string;
  signal: string;
  signalDark: string;
  soft: string;
}

const SCHOOL_THEMES: Record<SchoolThemeKey, SchoolTheme> = {
  tm: {
    key: "tm",
    institutionId: null,
    name: "Third & Manageable",
    initials: "T&M",
    signal: "#2F6FED",
    signalDark: "#173F9A",
    soft: "#DCE8FB",
  },
  "cleveland-state": {
    key: "cleveland-state",
    institutionId: "tm:cleveland-state",
    name: BRAND_TOKEN_SPEC.institutions["tm:cleveland-state"].name,
    initials: BRAND_TOKEN_SPEC.institutions["tm:cleveland-state"].initials,
    signal: BRAND_TOKEN_SPEC.institutions["tm:cleveland-state"].primary,
    signalDark: BRAND_TOKEN_SPEC.institutions["tm:cleveland-state"].primaryDark,
    soft: BRAND_TOKEN_SPEC.institutions["tm:cleveland-state"].soft,
  },
  cwru: {
    key: "cwru",
    institutionId: "tm:case-western-reserve",
    name: BRAND_TOKEN_SPEC.institutions["tm:case-western-reserve"].name,
    initials: BRAND_TOKEN_SPEC.institutions["tm:case-western-reserve"].initials,
    signal: BRAND_TOKEN_SPEC.institutions["tm:case-western-reserve"].primary,
    signalDark: BRAND_TOKEN_SPEC.institutions["tm:case-western-reserve"].primaryDark,
    soft: BRAND_TOKEN_SPEC.institutions["tm:case-western-reserve"].soft,
  },
  // The official orange is darkened only as far as needed for readable small
  // text on the light glass base. This matches the web theme's contrast pass.
  bgsu: {
    key: "bgsu",
    institutionId: "tm:bowling-green-state",
    name: BRAND_TOKEN_SPEC.institutions["tm:bowling-green-state"].name,
    initials: BRAND_TOKEN_SPEC.institutions["tm:bowling-green-state"].initials,
    signal: BRAND_TOKEN_SPEC.institutions["tm:bowling-green-state"].primary,
    signalDark: BRAND_TOKEN_SPEC.institutions["tm:bowling-green-state"].primaryDark,
    soft: BRAND_TOKEN_SPEC.institutions["tm:bowling-green-state"].soft,
  },
};

const SCHOOL_THEME_BY_INSTITUTION_ID: Record<InstitutionId, SchoolTheme> = {
  "tm:cleveland-state": SCHOOL_THEMES["cleveland-state"],
  "tm:case-western-reserve": SCHOOL_THEMES.cwru,
  "tm:bowling-green-state": SCHOOL_THEMES.bgsu,
};

export const isSupportedInstitutionId = (
  value?: string | null,
): value is InstitutionId =>
  Boolean(
    value &&
      Object.prototype.hasOwnProperty.call(
        SCHOOL_THEME_BY_INSTITUTION_ID,
        value,
      ),
  );

export const getSchoolTheme = (institutionId?: string | null): SchoolTheme =>
  isSupportedInstitutionId(institutionId)
    ? SCHOOL_THEME_BY_INSTITUTION_ID[institutionId]
    : SCHOOL_THEMES.tm;

export const getSchoolAppThemeSignal = (primary: string): string =>
  ensureTextContrast(primary, APP_THEME_GLASS_BASE, WCAG_AA_TEXT);

export const getDefaultAppTheme = (hasVerifiedSchoolMatch: boolean): AppTheme =>
  hasVerifiedSchoolMatch ? "school" : "dusk";

export const isAppTheme = (value: string | null): value is AppTheme =>
  value === "legacy" || value === "dusk" || value === "school";
