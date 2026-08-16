import "./globals.css";
import type { ReactNode } from "react";
import { Providers } from "./providers";
import { AppShell } from "@/components/layout/AppShell";

export const metadata = {
  title: "Adoption framework",
  description: "Dashboard, practice library, method builder, and practice authoring tools.",
};

const FA_CSS_URL = "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link
          rel="preload"
          href={FA_CSS_URL}
          as="style"
          crossOrigin="anonymous"
        />
        <link
          rel="stylesheet"
          href={FA_CSS_URL}
          integrity="sha512-DTOQO9RWCH3ppGqcWaEA1BIZOC6xxalwEsw9c2QQeAIftl+Vegovlnee1c9QX4TctnWMn13TZye+giMm8e2LwA=="
          crossOrigin="anonymous"
          referrerPolicy="no-referrer"
          media="print"
        />
        <script dangerouslySetInnerHTML={{ __html:
          `var l=document.querySelector('link[media="print"][href*="font-awesome"]');if(l){l.onload=function(){this.media="all"};if(l.sheet)l.media="all"}`
        }} />
        <noscript>
          <link rel="stylesheet" href={FA_CSS_URL} crossOrigin="anonymous" />
        </noscript>
      </head>
      <body>
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}

