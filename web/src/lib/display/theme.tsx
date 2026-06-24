"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { ThemeId, ThemeTokens } from "@/lib/data/themeTokens";
import { THEMES } from "@/lib/data/themeTokens";

type ThemeContextValue = {
  themeId: ThemeId;
  setThemeId: (id: ThemeId) => void;
  theme: ThemeTokens;
  themes: typeof THEMES;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

const THEME_COOKIE = "af_theme";

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(new RegExp(`(?:^|; )${name.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\\\$&")}=([^;]*)`));
  return m ? decodeURIComponent(m[1] ?? "") : null;
}

function setCookie(name: string, value: string) {
  if (typeof document === "undefined") return;
  const oneYear = 60 * 60 * 24 * 365;
  document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${oneYear}; SameSite=Lax`;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themeId, setThemeId] = useState<ThemeId>("dark");
  const didHydrateFromCookie = useRef(false);

  const theme = useMemo(() => THEMES[themeId], [themeId]);

  useEffect(() => {
    if (didHydrateFromCookie.current) return;
    didHydrateFromCookie.current = true;
    const raw = getCookie(THEME_COOKIE);
    if (raw === "dark" || raw === "light") setThemeId(raw);
  }, []);

  useEffect(() => {
    const r = document.documentElement;
    r.style.setProperty("--bg", theme.bg);
    r.style.setProperty("--panel", theme.panel);
    r.style.setProperty("--text", theme.text);
    r.style.setProperty("--muted", theme.muted);
    r.style.setProperty("--border", theme.border);
    r.style.setProperty("--accent", theme.accent);
    r.style.setProperty("--bad", theme.bad);
    r.style.setProperty("--good", theme.good);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (r.style as any).colorScheme = theme.colorScheme;
  }, [theme]);

  useEffect(() => {
    setCookie(THEME_COOKIE, themeId);
  }, [themeId]);

  const setThemeIdPersisted = (id: ThemeId) => {
    setThemeId(id);
    setCookie(THEME_COOKIE, id);
  };

  const value = useMemo<ThemeContextValue>(
    () => ({ themeId, setThemeId: setThemeIdPersisted, theme, themes: THEMES }),
    [themeId, theme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const v = useContext(ThemeContext);
  if (!v) throw new Error("useTheme must be used within ThemeProvider");
  return v;
}

