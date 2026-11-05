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
          <ul className="auth-brand-points">
            <li>Plan tasks with times and get reminded before they start</li>
            <li>Daily, weekly and monthly task reports, downloadable as PDF</li>
            <li>Browser and email alerts — even when the app is closed</li>
          </ul>
        </div>
      </aside>

      <div className="auth-side">
        <header className="auth-topbar">
          <Link className="auth-logo auth-logo--stacked" href="/">
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
