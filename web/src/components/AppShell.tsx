"use client";

import { useState, useEffect } from "react";
import { AppNav } from "./AppNav";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      // Auto-collapse on mobile
      if (mobile) setSidebarOpen(false);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      backgroundColor: 'var(--bg)',
      position: 'relative',
    }}>
      {/* Mobile overlay */}
      {isMobile && sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 40,
          }}
        />
      )}

      {/* Sidebar */}
      <aside
        className="no-print"
        style={{
          position: isMobile ? 'fixed' : 'sticky',
          top: 0,
          left: 0,
          height: '100vh',
          width: sidebarOpen ? 'var(--spacing-sidebar)' : '0',
          flexShrink: 0,
          backgroundColor: 'var(--panel)',
          borderRight: sidebarOpen ? '1px solid var(--border)' : 'none',
          overflow: 'hidden',
          transition: 'width 0.2s ease',
          zIndex: isMobile ? 50 : 10,
        }}
      >
        <AppNav />
      </aside>

      {/* Mobile toggle button */}
      {isMobile && (
        <button
          type="button"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="no-print"
          style={{
            position: 'fixed',
            top: '1rem',
            left: '1rem',
            zIndex: 60,
            padding: '0.5rem',
            backgroundColor: 'var(--panel)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--pf-v6-global--BorderRadius--sm)',
            color: 'var(--text)',
            cursor: 'pointer',
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
      )}

      {/* Main Content */}
      <main style={{
        flex: 1,
        minWidth: 0,
        position: 'relative',
      }}>
        {children}
      </main>
    </div>
  );
}
