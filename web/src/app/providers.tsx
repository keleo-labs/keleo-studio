"use client";

import type { ReactNode } from "react";
import { ThemeProvider } from "@/lib/theme";
import { LanguagePackProvider } from "@/lib/languagePack";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <LanguagePackProvider>{children}</LanguagePackProvider>
    </ThemeProvider>
  );
}

