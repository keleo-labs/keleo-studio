"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { navigationItems } from "@/lib/navigationConfig";

export function AppNav() {
  const pathname = usePathname();

  // Inline hover styles to avoid hydration issues (following LibraryBrowser pattern)
  const hoverStyles = `
    .nav-item:hover {
      background-color: var(--pf-v6-global--BackgroundColor--200);
    }
    .nav-item.active {
      background-color: var(--pf-v6-global--primary-color--100);
      color: var(--pf-v6-global--Color--light-100);
    }
    .nav-item.active .nav-badge {
      color: rgba(255, 255, 255, 0.85);
    }
  `;

  return (
    <nav style={{
      padding: '1.5rem 1rem',
      height: '100vh',
      overflowY: 'auto',
      backgroundColor: 'var(--panel)',
    }}>
      <style dangerouslySetInnerHTML={{ __html: hoverStyles }} />

      {/* Logo/Title */}
      <div style={{ marginBottom: '2rem', paddingLeft: '0.5rem' }}>
        <Link href="/" style={{ textDecoration: 'none' }}>
          <p style={{
            fontSize: '0.625rem',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: 'var(--muted)',
            marginBottom: '0.25rem'
          }}>
            Adoption Framework
          </p>
          <h1 style={{
            fontSize: '1rem',
            fontWeight: 700,
            color: 'var(--text)',
            letterSpacing: '-0.01em'
          }}>
            Dashboard
          </h1>
        </Link>
      </div>

      {/* Nav Items */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.125rem' }}>
        {navigationItems.map((item) => {
          const isActive = pathname === item.href;
          const showSeparator = item.id === 'preferences';

          return (
            <div key={item.id}>
              {showSeparator && (
                <div style={{
                  height: '1px',
                  backgroundColor: 'var(--border)',
                  margin: '0.75rem 0.5rem',
                }} />
              )}
              <Link
                href={item.href}
                className={`nav-item ${isActive ? 'active' : ''}`}
                style={{
                  display: 'block',
                  padding: '0.625rem 0.75rem',
                  borderRadius: 'var(--pf-v6-global--BorderRadius--sm)',
                  textDecoration: 'none',
                  color: isActive ? 'white' : 'var(--text)',
                  fontSize: '0.875rem',
                  fontWeight: isActive ? 600 : 500,
                  transition: 'all 0.2s ease',
                }}
              >
                {item.badge && (
                  <span
                    className="nav-badge"
                    style={{
                      fontSize: '0.625rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      color: isActive ? 'rgba(255,255,255,0.85)' : 'var(--muted)',
                      display: 'block',
                      marginBottom: '0.125rem'
                    }}
                  >
                    {item.badge}
                  </span>
                )}
                <span style={{ display: 'block' }}>
                  {item.label}
                </span>
              </Link>
            </div>
          );
        })}
      </div>
    </nav>
  );
}
