import { Suspense } from "react";
import Link from "next/link";
import { LibraryBrowser } from "./LibraryBrowser";

export const metadata = {
  title: "Library — Adoption framework",
  description: "Manage the practice library.",
};

function LibraryFallback() {
  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <div className="mx-auto max-w-content px-6 py-12 md:px-10">
        <p className="text-sm text-[var(--muted)]">
          <Link href="/" className="font-medium text-[var(--accent)] underline-offset-4 hover:underline">
            ← Dashboard
          </Link>
        </p>
        <p className="mt-8 text-sm text-[var(--muted)]">Loading library…</p>
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
