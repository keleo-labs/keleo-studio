"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { LanguagePack, LanguagePackId } from "@/lib/data/languagePackTypes";
import { PACKS } from "@/lib/data/languagePacksData";

type LanguageContextValue = {
  packId: LanguagePackId;
  setPackId: (id: LanguagePackId) => void;
  t: LanguagePack;
  packs: typeof PACKS;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

const PACK_COOKIE = "af_pack";

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

export function LanguagePackProvider({ children }: { children: ReactNode }) {
  const [packId, setPackId] = useState<LanguagePackId>("default");
  const didHydrateFromCookie = useRef(false);

  useEffect(() => {
    if (didHydrateFromCookie.current) return;
    didHydrateFromCookie.current = true;
    const raw = getCookie(PACK_COOKIE);
    if (raw === "default" || raw === "alt") setPackId(raw);
  }, []);

  useEffect(() => {
    setCookie(PACK_COOKIE, packId);
  }, [packId]);

  const setPackIdPersisted = (id: LanguagePackId) => {
    setPackId(id);
    setCookie(PACK_COOKIE, id);
  };

  const t = useMemo(() => PACKS[packId], [packId]);
  const value = useMemo(() => ({ packId, setPackId: setPackIdPersisted, t, packs: PACKS }), [packId, t]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguagePack() {
  const v = useContext(LanguageContext);
  if (!v) throw new Error("useLanguagePack must be used within LanguagePackProvider");
  return v;
}

