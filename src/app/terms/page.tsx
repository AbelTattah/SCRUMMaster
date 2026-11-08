import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service — Scrum Master",
  description: "Terms and conditions for using the Scrum Master task management service.",
};

export default function TermsPage() {
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
          Terms of Service
        </h1>
        <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
          Last updated: 8 November 2026
        </p>

        <div className="mt-8 space-y-6 text-sm leading-relaxed text-neutral-700 dark:text-neutral-300">
          <section>
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">1. Acceptance</h2>
            <p>
              By creating an account or using Scrum Master, you agree to these Terms.
              If you do not agree, do not use the service.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">2. The service</h2>
            <p>
              Scrum Master provides task management, team collaboration, reminders,
              notifications and stand-up report generation. We may modify, suspend or
              discontinue features with reasonable notice.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">3. Accounts</h2>
            <p>
              You are responsible for keeping your credentials secure and for all
              activity under your account. You must be at least 16 years old. One
              person or organisation per account; do not share credentials.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">4. Acceptable use</h2>
            <p>You agree not to:</p>
            <ul className="list-disc space-y-1 pl-5">
              <li>Use the service for unlawful purposes or to harass others.</li>
              <li>Attempt to gain unauthorised access to other accounts or systems.</li>
              <li>Reverse-engineer, scrape or overload the service.</li>
              <li>Upload malicious content or spam.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">5. Your content</h2>
            <p>
              You retain ownership of your tasks and data. Because content is
              end-to-end encrypted, we cannot access or moderate it; you are
              responsible for what you store. You grant us a licence to host and
              transmit your encrypted data solely to operate the service.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">6. Organisations</h2>
            <p>
              Organisation owners are responsible for members they invite. Removing a
              member revokes their access to organisation tasks; their personal tasks
              and reports remain theirs.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">7. Availability &amp; disclaimer</h2>
            <p>
              The service is provided &ldquo;as is&rdquo; without warranties of any kind.
              We do not guarantee uninterrupted or error-free operation. To the
              maximum extent permitted by law, we are not liable for indirect,
              incidental or consequential damages.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">8. Termination</h2>
            <p>
              You may delete your account at any time. We may suspend or terminate
              accounts that violate these Terms. On termination, your data is deleted
              per our Privacy Policy.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">9. Changes</h2>
            <p>
              We may update these Terms. Material changes will be announced in the
              app and by email. Continued use after changes constitutes acceptance.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">10. Governing law</h2>
            <p>
              These Terms are governed by the laws of the jurisdiction in which
              Scrum Master operates, without regard to conflict-of-law principles.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">11. Contact</h2>
            <p>
              Questions? Email{" "}
              <a href="mailto:legal@scrummaster.app" className="underline underline-offset-4">
                legal@scrummaster.app
              </a>
              .
            </p>
          </section>
        </div>

        <div className="mt-10 flex flex-wrap gap-4 text-sm">
          <Link href="/privacy" className="underline underline-offset-4 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white">
            Privacy Policy
          </Link>
          <Link href="/cookies" className="underline underline-offset-4 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white">
            Cookie Policy
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
