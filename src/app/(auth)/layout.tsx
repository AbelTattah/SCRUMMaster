import Link from "next/link";
import type { ReactNode } from "react";

/**
 * Auth screens. On wide desktops (including the Electron window) the left
 * half is a branded panel — the white logo sits at the top-left of the page,
 * over it — and the form is on the right. Below 1000px the panel is dropped,
 * the stacked logo returns to the bar and the card is centred as before.
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
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
