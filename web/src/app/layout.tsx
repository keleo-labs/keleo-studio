import "./globals.css";
import type { ReactNode } from "react";
import { Providers } from "./providers";
import { AppShell } from "@/components/AppShell";

export const metadata = {
  title: "Adoption framework",
  description: "Dashboard, practice library, method builder, and practice authoring tools.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}

