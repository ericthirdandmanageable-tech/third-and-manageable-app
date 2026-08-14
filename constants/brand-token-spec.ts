/**
 * Portable brand-token contract for web and native clients.
 *
 * Institution IDs are product-owned stable identifiers. Display names and
 * aliases are presentation/search data and must never select a brand palette.
 */
export const BRAND_TOKEN_SPEC = {
  version: 1,
  appearanceScope: "authenticated-shell",
  glass: {
    base: "#EEF4FC",
    colorScheme: "light",
    supportsDark: false,
  },
  accessibility: {
    maxFontSizeMultiplier: 1.6,
  },
  structure: {
    glassNeutral: {
      50: "#F7F9FC",
      100: "#E2E8F1",
      200: "#CED6E2",
      300: "#B6C0CF",
      400: "#8B97AA",
      500: "#6C7690",
      600: "#5A657C",
      700: "#46536D",
      800: "#2B3955",
      900: "#16233E",
    },
    shadow: "#16233E",
    overlay: "rgba(22,35,62,0.48)",
    inverseText: "#FFFFFF",
  },
  semantic: {
    success: "#15805F",
    warning: "#B56A12",
    danger: "#C33D4D",
    info: "#2F6FED",
    mood: ["#C33D4D", "#D16B3A", "#B56A12", "#3C7C74", "#15805F"],
  },
  institutions: {
    "tm:cleveland-state": {
      themeKey: "cleveland-state",
      name: "Cleveland State University",
      initials: "CSU",
      primary: "#006747",
      primaryDark: "#004F37",
      soft: "#DDEFE8",
    },
    "tm:case-western-reserve": {
      themeKey: "cwru",
      name: "Case Western Reserve University",
      initials: "CWRU",
      primary: "#071B78",
      primaryDark: "#041255",
      soft: "#E1E8FF",
    },
    "tm:bowling-green-state": {
      themeKey: "bgsu",
      name: "Bowling Green State University",
      initials: "BGSU",
      primary: "#F04B0B",
      primaryDark: "#8E2B08",
      soft: "#FFE4D8",
    },
  },
} as const;

export type SupportedInstitutionId =
  keyof typeof BRAND_TOKEN_SPEC.institutions;
