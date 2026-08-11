/*
 * WCAG 2.x contrast math — relative luminance + contrast ratio, plus a
 * small solver that nudges a brand color toward a readable version of
 * itself instead of discarding it.
 *
 * Used by `community-theme.ts` to pick which slice of a school's official
 * palette is safe to use as text/UI color, rather than hand-picking hex
 * values and hoping they pass.
 */

export type RGB = [number, number, number];

export const hexToRgb = (hex: string): RGB => {
    const normalized = hex.replace("#", "");
    const full =
        normalized.length === 3
            ? normalized
                  .split("")
                  .map((c) => c + c)
                  .join("")
            : normalized;
    const int = parseInt(full, 16);
    return [(int >> 16) & 255, (int >> 8) & 255, int & 255];
};

export const rgbToHex = ([r, g, b]: RGB): string =>
    `#${[r, g, b].map((c) => Math.round(clamp(c, 0, 255)).toString(16).padStart(2, "0")).join("")}`;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const channelLuminance = (channel: number) => {
    const c = channel / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};

/** WCAG relative luminance of a hex color, 0 (black) to 1 (white). */
export const relativeLuminance = (hex: string): number => {
    const [r, g, b] = hexToRgb(hex);
    return 0.2126 * channelLuminance(r) + 0.7152 * channelLuminance(g) + 0.0722 * channelLuminance(b);
};

/** WCAG contrast ratio between two colors, from 1 (identical) to 21 (black/white). */
export const contrastRatio = (hexA: string, hexB: string): number => {
    const lumA = relativeLuminance(hexA);
    const lumB = relativeLuminance(hexB);
    const [lighter, darker] = lumA > lumB ? [lumA, lumB] : [lumB, lumA];
    return (lighter + 0.05) / (darker + 0.05);
};

/** WCAG AA thresholds. Normal text needs 4.5:1; UI components/graphics need 3:1. */
export const WCAG_AA_TEXT = 4.5;
export const WCAG_AA_UI = 3;

const rgbToHsl = ([r, g, b]: RGB): [number, number, number] => {
    const rn = r / 255;
    const gn = g / 255;
    const bn = b / 255;
    const max = Math.max(rn, gn, bn);
    const min = Math.min(rn, gn, bn);
    const l = (max + min) / 2;
    if (max === min) return [0, 0, l];
    const d = max - min;
    const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    let h: number;
    switch (max) {
        case rn:
            h = (gn - bn) / d + (gn < bn ? 6 : 0);
            break;
        case gn:
            h = (bn - rn) / d + 2;
            break;
        default:
            h = (rn - gn) / d + 4;
    }
    return [h * 60, s, l];
};

const hslToRgb = ([h, s, l]: [number, number, number]): RGB => {
    if (s === 0) {
        const v = l * 255;
        return [v, v, v];
    }
    const hue2rgb = (p: number, q: number, t: number) => {
        let tt = t;
        if (tt < 0) tt += 1;
        if (tt > 1) tt -= 1;
        if (tt < 1 / 6) return p + (q - p) * 6 * tt;
        if (tt < 1 / 2) return q;
        if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
        return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    const hn = h / 360;
    return [
        hue2rgb(p, q, hn + 1 / 3) * 255,
        hue2rgb(p, q, hn) * 255,
        hue2rgb(p, q, hn - 1 / 3) * 255,
    ];
};

/**
 * Returns a version of `color` that meets `minRatio` against `background`,
 * preserving hue and saturation and only walking lightness. Hand-picked
 * brand colors are rarely readable as body text at full saturation (a
 * school's bright "primary" is chosen for jerseys and banners, not an
 * 11px caption on white) — this keeps the hue recognizable while making
 * it legible, instead of substituting an unrelated gray.
 *
 * Falls back to pure black/white only if 60 lightness steps can't clear
 * the bar (i.e. the background itself is near mid-gray).
 */
export const ensureTextContrast = (
    color: string,
    background: string,
    minRatio: number = WCAG_AA_TEXT,
): string => {
    if (contrastRatio(color, background) >= minRatio) return color;

    const [h, s, l] = rgbToHsl(hexToRgb(color));
    const bgIsLight = relativeLuminance(background) > 0.5;
    const step = bgIsLight ? -1 : 1;
    const steps = 60;

    let best = color;
    let bestRatio = contrastRatio(color, background);
    for (let i = 1; i <= steps; i += 1) {
        const nextL = clamp(l + (step * i) / steps, 0, 1);
        const candidate = rgbToHex(hslToRgb([h, s, nextL]));
        const ratio = contrastRatio(candidate, background);
        if (ratio > bestRatio) {
            best = candidate;
            bestRatio = ratio;
        }
        if (ratio >= minRatio) return candidate;
    }
    return bestRatio >= minRatio ? best : bgIsLight ? "#000000" : "#ffffff";
};
