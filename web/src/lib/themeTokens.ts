export type ThemeId = "dark" | "light";

export type ThemeTokens = {
  bg: string;
  panel: string;
  text: string;
  muted: string;
  border: string;
  accent: string;
  bad: string;
  good: string;
  colorScheme: "dark" | "light";
  focusSwimlaneFill: Record<string, string>;
};

export const THEMES: Record<ThemeId, ThemeTokens> = {
  dark: {
    bg: "#0b0d12",
    panel: "#121628",
    text: "#eef2ff",
    muted: "#a7b0d6",
    border: "rgba(255,255,255,0.12)",
    accent: "#8b5cf6",
    bad: "#fb7185",
    good: "#34d399",
    colorScheme: "dark",
    focusSwimlaneFill: {
      Value: "rgba(74, 222, 128, 0.16)",
      Solution: "rgba(250, 204, 21, 0.16)",
      Endeavor: "rgba(56, 189, 248, 0.16)",
    },
  },
  light: {
    bg: "#f7f7fb",
    panel: "#ffffff",
    text: "#0b1020",
    muted: "#4b5563",
    border: "rgba(2,6,23,0.12)",
    accent: "#6d28d9",
    bad: "#e11d48",
    good: "#059669",
    colorScheme: "light",
    focusSwimlaneFill: {
      Value: "rgba(34, 197, 94, 0.14)",
      Solution: "rgba(234, 179, 8, 0.14)",
      Endeavor: "rgba(14, 165, 233, 0.14)",
    },
  },
};

