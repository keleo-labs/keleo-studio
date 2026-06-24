"use client";

import type { ReactNode } from "react";
import { ThemeProvider } from "@/lib/display/theme";
import { LanguagePackProvider } from "@/lib/display/languagePack";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <LanguagePackProvider>{children}</LanguagePackProvider>
    </ThemeProvider>
  );
}

