import { Suspense } from "react";
import Link from "next/link";
import { LibraryBrowser } from "./LibraryBrowser";

export const metadata = {
  title: "Library — Adoption framework",
  description: "Manage the practice library.",
};

function LibraryFallback() {
  return (
    <div style={{
      minHeight: "100vh",
      backgroundColor: "var(--pf-v6-global--BackgroundColor--100)",
      color: "var(--pf-v6-global--Color--100)",
      fontFamily: '"Red Hat Text", RedHatText, "Overpass", Arial, sans-serif',
    }}>
      <div style={{
        maxWidth: "1400px",
        margin: "0 auto",
        padding: "3rem 2.5rem",
      }}>
        <p style={{ fontSize: "0.875rem", color: "var(--pf-v6-global--Color--200)" }}>Loading library…</p>
      </div>
    </div>
  );
}

export default function LibraryPage() {
  return (
    <Suspense fallback={<LibraryFallback />}>
      <LibraryBrowser />
    </Suspense>
  );
}
