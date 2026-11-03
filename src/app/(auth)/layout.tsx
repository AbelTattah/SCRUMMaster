import Link from "next/link";
import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="auth-body">
      <header className="auth-topbar">
        <Link className="auth-logo" href="/">
          Scrum Master
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
  );
}
