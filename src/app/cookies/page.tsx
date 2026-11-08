import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Cookie Policy — Scrum Master",
  description: "How Scrum Master uses cookies and local storage, and your choices.",
};

export default function CookiesPage() {
  return (
    <div className="min-h-full flex flex-col bg-white dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100">
      <header className="sticky top-0 z-30 border-b border-neutral-200/80 dark:border-neutral-800/80 bg-white/90 dark:bg-neutral-950/90 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link href="/" className="flex min-w-0 shrink-0 items-center" aria-label="Scrum Master home">
            <img src="/logo-wordmark.png" alt="Scrum Master" className="h-7 w-auto sm:h-8 dark:hidden" />
            <img src="/logo-wordmark-white.png" alt="Scrum Master" className="h-7 w-auto sm:h-8 hidden dark:block" />
          </Link>
          <div className="flex shrink-0 items-center gap-2">
            <Link href="/login" className="inline-flex items-center gap-1.5 rounded-full border border-neutral-300 px-4 py-2 text-sm font-semibold text-neutral-800 transition-colors hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-900">
              Sign in
            </Link>
            <Link href="/register" className="inline-flex items-center gap-1.5 rounded-full bg-[#21005D] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#2E0480] dark:bg-white dark:text-black dark:hover:bg-neutral-200">
              Get started
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-12 sm:px-6 sm:py-16">
        <h1 className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-white sm:text-4xl">
          Cookie Policy
        </h1>
        <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
          Last updated: 8 November 2026
        </p>

        <div className="mt-8 space-y-6 text-sm leading-relaxed text-neutral-700 dark:text-neutral-300">
          <section>
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">1. What we use</h2>
            <p>
              Scrum Master uses only <strong>strictly necessary</strong> cookies and
              local storage. We do not use advertising, analytics or tracking cookies.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">2. Cookies</h2>
            <ul className="list-disc space-y-1 pl-5">
              <li>
                <strong>Session cookie</strong> &mdash; keeps you signed in (httpOnly,
                secure, SameSite). Set by Supabase Auth.
              </li>
              <li>
                <strong>Theme preference</strong> &mdash; stored in localStorage so
                your light/dark choice persists.
              </li>
              <li>
                <strong>Cookie-consent choice</strong> &mdash; stored in localStorage
                so we don&rsquo;t keep asking.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">3. Local storage &amp; IndexedDB</h2>
            <p>
              Your encrypted local mirror (tasks, pending sync queue) is stored in
              IndexedDB on your device. This is necessary for the offline-first
              experience and never leaves your device unencrypted.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">4. Managing cookies</h2>
            <p>
              You can clear cookies and site data at any time in your browser
              settings. Clearing session cookies signs you out. Clearing IndexedDB
              removes your offline mirror (your data is restored from the server on
              next sign-in).
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">5. Third parties</h2>
            <p>
              We do not embed third-party trackers. External links (e.g. to
              documentation) open in a new tab and are governed by those sites&rsquo;
              policies.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">6. Contact</h2>
            <p>
              Questions? Email{" "}
              <a href="mailto:privacy@scrummaster.app" className="underline underline-offset-4">
                privacy@scrummaster.app
              </a>
              .
            </p>
          </section>
        </div>

        <div className="mt-10 flex flex-wrap gap-4 text-sm">
          <Link href="/privacy" className="underline underline-offset-4 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white">
            Privacy Policy
          </Link>
          <Link href="/terms" className="underline underline-offset-4 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white">
            Terms of Service
          </Link>
          <Link href="/" className="underline underline-offset-4 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white">
            Home
          </Link>
        </div>
      </main>

      <footer className="border-t border-neutral-200/80 dark:border-neutral-800/80">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 sm:flex-row sm:px-6">
          <img src="/logo-wordmark.png" alt="Scrum Master" className="h-6 w-auto dark:hidden" />
          <img src="/logo-wordmark-white.png" alt="Scrum Master" className="h-6 w-auto hidden dark:block" />
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            &copy; Scrum Master. Built for teams that ship.
          </p>
          <div className="flex items-center gap-4 text-xs text-neutral-500 dark:text-neutral-400">
            <Link href="/privacy" className="transition-colors hover:text-neutral-900 dark:hover:text-white">Privacy</Link>
            <Link href="/terms" className="transition-colors hover:text-neutral-900 dark:hover:text-white">Terms</Link>
            <Link href="/cookies" className="transition-colors hover:text-neutral-900 dark:hover:text-white">Cookies</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
