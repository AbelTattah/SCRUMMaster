import Link from "next/link";
import type { ReactNode } from "react";

/**
 * The standard auth screen chrome — branded panel on the left, logo bar and
 * centred card on the right — reused by the encryption gate's password
 * screens so they read as part of the same sign-in experience.
 *
 * Mirrors src/app/(auth)/layout.tsx (the gate cannot render that server
 * layout: it lives inside the authenticated shell).
 */
export function AuthScreenShell({ children }: { children: ReactNode }) {
  return (
    <div className="auth-body">
      <aside className="auth-brand-panel">
        <Link className="auth-panel-logo" href="/">
          <img src="/logo-wordmark-white.png" alt="Scrum Master" />
        </Link>

        <div className="auth-brand-content">
          <p className="auth-brand-tagline">
            Record what gets done, stay accountable, and level up every day.
          </p>
        </div>
      </aside>

      <div className="auth-side">
        <header className="auth-topbar">
          <Link className="auth-logo auth-logo--stacked" href="/">
            <img className="brand-img brand-img--light" src="/logo-wordmark.png" alt="Scrum Master" />
            <img className="brand-img brand-img--dark" src="/logo-wordmark-white.png" alt="Scrum Master" />
          </Link>
        </header>

        <main className="auth-wrap">{children}</main>

        <footer className="auth-foot">
          © {new Date().getFullYear()} Scrum Master · Tasks, reminders and your team
        </footer>
      </div>
    </div>
  );
}
