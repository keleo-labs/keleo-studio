import { Suspense } from "react";
import { LibraryBrowseClient } from "./LibraryBrowseClient";

export const metadata = {
  title: "Browse — Library",
  description: "Read library practices, baselines, and methods in a human-readable layout.",
};

export default function LibraryBrowsePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[var(--bg)] px-6 py-12 text-sm text-[var(--muted)]">Loading browse…</div>
      }
    >
      <LibraryBrowseClient />
    </Suspense>
  );
}
