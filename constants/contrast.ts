export type RGB = [number, number, number];

export const WCAG_AA_TEXT = 4.5;
export const WCAG_AA_UI = 3;

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

export const hexToRgb = (hex: string): RGB => {
  const normalized = hex.replace("#", "");
  const full =
    normalized.length === 3
      ? normalized
          .split("")
          .map((character) => character + character)
          .join("")
      : normalized;
  const value = Number.parseInt(full, 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
};

const rgbToHex = ([red, green, blue]: RGB): string =>
  `#${[red, green, blue]
    .map((channel) =>
      Math.round(clamp(channel, 0, 255)).toString(16).padStart(2, "0"),
    )
    .join("")}`;

const channelLuminance = (channel: number) => {
  const normalized = channel / 255;
  return normalized <= 0.04045
    ? normalized / 12.92
    : ((normalized + 0.055) / 1.055) ** 2.4;
};

export const relativeLuminance = (hex: string): number => {
  const [red, green, blue] = hexToRgb(hex);
  return (
    0.2126 * channelLuminance(red) +
    0.7152 * channelLuminance(green) +
    0.0722 * channelLuminance(blue)
  );
};

export const contrastRatio = (hexA: string, hexB: string): number => {
  const luminanceA = relativeLuminance(hexA);
  const luminanceB = relativeLuminance(hexB);
  const [lighter, darker] =
    luminanceA > luminanceB
      ? [luminanceA, luminanceB]
      : [luminanceB, luminanceA];
  return (lighter + 0.05) / (darker + 0.05);
};

const rgbToHsl = ([red, green, blue]: RGB): [number, number, number] => {
  const r = red / 255;
  const g = green / 255;
  const b = blue / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const lightness = (max + min) / 2;
  if (max === min) return [0, 0, lightness];
  const delta = max - min;
  const saturation =
    lightness > 0.5
      ? delta / (2 - max - min)
      : delta / (max + min);
  let hue: number;
  switch (max) {
    case r:
      hue = (g - b) / delta + (g < b ? 6 : 0);
      break;
    case g:
      hue = (b - r) / delta + 2;
      break;
    default:
      hue = (r - g) / delta + 4;
  }
  return [hue * 60, saturation, lightness];
};

const hslToRgb = ([hue, saturation, lightness]: [
  number,
  number,
  number,
]): RGB => {
  if (saturation === 0) {
    const value = lightness * 255;
    return [value, value, value];
  }
  const hueToRgb = (p: number, q: number, input: number) => {
    let channel = input;
    if (channel < 0) channel += 1;
    if (channel > 1) channel -= 1;
    if (channel < 1 / 6) return p + (q - p) * 6 * channel;
    if (channel < 1 / 2) return q;
    if (channel < 2 / 3) return p + (q - p) * (2 / 3 - channel) * 6;
    return p;
  };
  const q =
    lightness < 0.5
      ? lightness * (1 + saturation)
      : lightness + saturation - lightness * saturation;
  const p = 2 * lightness - q;
  const normalizedHue = hue / 360;
  return [
    hueToRgb(p, q, normalizedHue + 1 / 3) * 255,
    hueToRgb(p, q, normalizedHue) * 255,
    hueToRgb(p, q, normalizedHue - 1 / 3) * 255,
  ];
};

/** Shared with the web shell: preserve hue and saturation while solving AA contrast. */
export const ensureTextContrast = (
  color: string,
  background: string,
  minRatio = WCAG_AA_TEXT,
): string => {
  if (contrastRatio(color, background) >= minRatio) return color;

  const [hue, saturation, lightness] = rgbToHsl(hexToRgb(color));
  const towardBlack =
    contrastRatio("#000000", background) >=
    contrastRatio("#ffffff", background);
  const step = towardBlack ? -1 : 1;
  let best = color;
  let bestRatio = contrastRatio(color, background);

  for (let index = 1; index <= 60; index += 1) {
    const nextLightness = clamp(lightness + (step * index) / 60, 0, 1);
    const candidate = rgbToHex(
      hslToRgb([hue, saturation, nextLightness]),
    );
    const ratio = contrastRatio(candidate, background);
    if (ratio > bestRatio) {
      best = candidate;
      bestRatio = ratio;
    }
    if (ratio >= minRatio) return candidate;
  }

  return bestRatio >= minRatio
    ? best
    : towardBlack
      ? "#000000"
      : "#ffffff";
};
