/**
 * Editorial-fintech palette: warm cream paper, deep ink surfaces, amber accent.
 * Single source of truth for visual tokens. Do not inline hex anywhere else.
 */

export const palette = {
  bg: "#F6F1E7",
  surface: "#FFFFFF",
  surfaceAlt: "#FBF6EC",
  surfaceSunk: "#F0EADA",

  ink: "#14110D",
  inkSoft: "#2A241D",
  inkOnDark: "#F4EEE2",
  inkOnDarkSoft: "#C8BEAA",

  text: "#1A1612",
  muted: "#6F6557",
  mutedStrong: "#4D4439",

  border: "#E5DBC9",
  borderStrong: "#C7BBA2",
  hairline: "#EFE7D6",

  accent: "#B53F1E",
  accentSoft: "#FCE8D6",
  accentDeep: "#7A2811",

  success: "#2F6B4F",
  successSoft: "#DEEAE0",

  warning: "#B27424",
  warningSoft: "#F6E6CD",

  danger: "#A33A2A",
  dangerSoft: "#F4E1DC",
} as const;

export const radius = {
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  pill: 999,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  xxxl: 36,
} as const;

export const type = {
  display: {
    fontSize: 32,
    fontWeight: "800" as const,
    letterSpacing: -0.5,
    lineHeight: 38,
  },
  title: {
    fontSize: 22,
    fontWeight: "700" as const,
    letterSpacing: -0.2,
    lineHeight: 28,
  },
  heading: {
    fontSize: 17,
    fontWeight: "700" as const,
    letterSpacing: -0.1,
    lineHeight: 22,
  },
  body: { fontSize: 14, fontWeight: "500" as const, lineHeight: 20 },
  bodyStrong: { fontSize: 14, fontWeight: "700" as const, lineHeight: 20 },
  small: { fontSize: 12, fontWeight: "500" as const, lineHeight: 16 },
  smallStrong: { fontSize: 12, fontWeight: "700" as const, lineHeight: 16 },
  micro: {
    fontSize: 10,
    fontWeight: "700" as const,
    letterSpacing: 0.8,
    lineHeight: 12,
  },
} as const;

export const shadow = {
  card: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  hero: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 8,
  },
} as const;

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  if (!/^#[0-9A-Fa-f]{6}$/.test(hex)) return null;
  return {
    r: parseInt(hex.slice(1, 3), 16),
    g: parseInt(hex.slice(3, 5), 16),
    b: parseInt(hex.slice(5, 7), 16),
  };
}

function relativeLuminance(hex: string): number {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0.5;
  const channel = (c: number) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return (
    0.2126 * channel(rgb.r) +
    0.7152 * channel(rgb.g) +
    0.0722 * channel(rgb.b)
  );
}

/**
 * WCAG 2.1 contrast ratio between two hex colors. Returns 1..21.
 */
export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const lighter = Math.max(la, lb);
  const darker = Math.min(la, lb);
  return (lighter + 0.05) / (darker + 0.05);
}

export function readableTextOn(hex: string): string {
  if (!hexToRgb(hex)) return palette.text;
  const onLight = contrastRatio(hex, palette.ink);
  const onDark = contrastRatio(hex, palette.inkOnDark);
  return onLight >= onDark ? palette.ink : palette.inkOnDark;
}

export function withAlpha(hex: string, alphaHex: string): string {
  if (!/^#[0-9A-Fa-f]{6}$/.test(hex)) return palette.accentSoft;
  return `${hex}${alphaHex}`;
}

/**
 * Validates an AI-generated background/accent pair. Falls back to safe palette
 * colors if the pair would fail readable accent (≥3:1) or readable body
 * text (≥4.5:1) requirements.
 */
export function ensureReadableOfferColors(
  background: string,
  accent: string,
): { background: string; accent: string } {
  const safeBg = hexToRgb(background) ? background : palette.surface;
  const safeAccent = hexToRgb(accent) ? accent : palette.accent;

  // If the accent has poor contrast against the background, prefer ink/cream
  // depending on which produces more contrast, then keep the brand accent
  // visible elsewhere through palette.accent.
  const ratio = contrastRatio(safeBg, safeAccent);
  if (ratio < 3) {
    const onLight = contrastRatio(safeBg, palette.accentDeep);
    const onDark = contrastRatio(safeBg, palette.accent);
    return {
      background: safeBg,
      accent: onLight >= onDark ? palette.accentDeep : palette.accent,
    };
  }

  // Body text on the bg must clear AA. If neither ink nor cream gives enough,
  // we replace the bg with a safe surface.
  const textRatio = Math.max(
    contrastRatio(safeBg, palette.ink),
    contrastRatio(safeBg, palette.inkOnDark),
  );
  if (textRatio < 4.5) {
    return { background: palette.surface, accent: safeAccent };
  }

  return { background: safeBg, accent: safeAccent };
}
