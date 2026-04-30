import { Suspense } from "react";
import { MethodBuilderClient } from "./MethodBuilderClient";

export const metadata = {
  title: "Method builder — Adoption framework",
  description: "Compose methods from practices in the library.",
};

export default function MethodBuilderPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[var(--bg)] px-6 py-12 text-sm text-[var(--muted)]">Loading method builder…</div>
      }
    >
      <MethodBuilderClient />
    </Suspense>
  );
}
