/* eslint-disable @next/next/no-img-element */
"use client";

import Link from "next/link";
import { useLanguagePack } from "@/lib/languagePack";
import { useTheme } from "@/lib/theme";

function linkStyle(): React.CSSProperties {
  return {
    color: "inherit",
    textDecoration: "underline",
    textDecorationColor: "rgba(139,92,246,0.6)",
    textUnderlineOffset: 2,
  };
}

function select(): React.CSSProperties {
  return {
    borderRadius: 10,
    border: "1px solid var(--border)",
    background: "transparent",
    color: "var(--text)",
    padding: "10px 10px",
    cursor: "pointer",
    fontWeight: 700,
  };
}

export default function PreferencesPage() {
  const { themeId, setThemeId } = useTheme();
  const { packId, setPackId, t } = useLanguagePack();

  return (
    <main style={{ maxWidth: 900, margin: "0 auto", padding: 24 }}>
      <div style={{ display: "grid", gap: 10 }}>
        <div style={{ fontSize: 20, fontWeight: 800 }}>Preferences</div>
        <div style={{ color: "var(--muted)" }}>
          Theme and language are stored in a cookie on this device.
        </div>
      </div>

      <section
        style={{
          marginTop: 16,
          border: "1px solid var(--border)",
          borderRadius: 12,
          padding: 16,
          background: "var(--panel)",
        }}
      >
        <div style={{ display: "grid", gap: 10 }}>
          <div style={{ display: "grid", gap: 6 }}>
            <div style={{ fontWeight: 800 }}>Theme</div>
            <select value={themeId} onChange={(e) => setThemeId(e.target.value as any)} style={select()}>
              <option value="dark">Dark</option>
              <option value="light">Light</option>
            </select>
          </div>

          <div style={{ display: "grid", gap: 6 }}>
            <div style={{ fontWeight: 800 }}>Language</div>
            <select value={packId} onChange={(e) => setPackId(e.target.value as any)} style={select()}>
              <option value="default">Default</option>
              <option value="alt">Alt</option>
            </select>
            <div style={{ color: "var(--muted)", fontSize: 13 }}>
              Current pack title: <code>{t.appTitle}</code>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

