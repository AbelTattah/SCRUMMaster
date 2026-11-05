import Link from "next/link";
import type { ReactNode } from "react";

/**
 * Auth screens. On wide desktops (including the Electron window) the left
 * half is a branded panel and the form sits on the right; below 1000px the
 * panel is dropped and the card is centred as before.
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="auth-body">
      <aside className="auth-brand-panel">
        <span className="auth-brand-name">Scrum Master</span>
        <p className="auth-brand-tagline">
          Record what gets done, stay accountable, and level up every day.
        </p>
      </aside>

      <div className="auth-side">
        <header className="auth-topbar">
          <Link className="auth-logo" href="/">
            <img src="/logo-wordmark.png" alt="Scrum Master" />
          </Link>
          <Link className="auth-home-link" href="/">
            ← Back to home
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
