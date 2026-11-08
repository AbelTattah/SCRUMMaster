import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy — Scrum Master",
  description:
    "How Scrum Master collects, uses, stores and protects your personal data. GDPR-compliant privacy policy.",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-full flex flex-col bg-white dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100">
      <header className="sticky top-0 z-30 border-b border-neutral-200/80 dark:border-neutral-800/80 bg-white/90 dark:bg-neutral-950/90 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link href="/" className="flex min-w-0 shrink-0 items-center" aria-label="Scrum Master home">
            <img src="/logo-wordmark.png" alt="Scrum Master" className="h-7 w-auto sm:h-8 dark:hidden" />
            <img src="/logo-wordmark-white.png" alt="Scrum Master" className="h-7 w-auto sm:h-8 hidden dark:block" />
          </Link>
          <div className="flex shrink-0 items-center gap-2">
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 rounded-full border border-neutral-300 px-4 py-2 text-sm font-semibold text-neutral-800 transition-colors hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-900"
            >
              Sign in
            </Link>
            <Link
              href="/register"
              className="inline-flex items-center gap-1.5 rounded-full bg-[#21005D] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#2E0480] dark:bg-white dark:text-black dark:hover:bg-neutral-200"
            >
              Get started
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-12 sm:px-6 sm:py-16">
        <h1 className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-white sm:text-4xl">
          Privacy Policy
        </h1>
        <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
          Last updated: 8 November 2026
        </p>

        <div className="prose prose-neutral dark:prose-invert mt-8 max-w-none space-y-6 text-sm leading-relaxed text-neutral-700 dark:text-neutral-300">
          <section>
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">1. Who we are</h2>
            <p>
              Scrum Master (&ldquo;we&rdquo;, &ldquo;us&rdquo;) is a task-management and stand-up
              reporting service. This policy explains how we handle personal data in
              accordance with the EU General Data Protection Regulation (GDPR) and
              applicable data-protection laws.
            </p>
            <p>
              Data controller: Scrum Master (contact details at the bottom of this page).
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">2. Data we collect</h2>
            <ul className="list-disc space-y-1 pl-5">
              <li>
                <strong>Account data:</strong> name, email address, hashed password
                (or Google OAuth identity), avatar, theme and notification preferences.
              </li>
              <li>
                <strong>Task data:</strong> titles and blockers are end-to-end
                encrypted in your browser before transmission. We store ciphertext
                only and cannot read them. We also store non-sensitive metadata
                (timestamps, completion state, assignee, organisation membership).
              </li>
              <li>
                <strong>Organisation data:</strong> organisation name, member list,
                XP/level progress, invitation status.
              </li>
              <li>
                <strong>Technical data:</strong> IP address, browser/user-agent, device
                type, timestamps of access, and error logs needed to operate the service.
              </li>
              <li>
                <strong>Communications:</strong> emails we send you (digests, password
                resets, invitations) and your responses.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">3. How we use your data (purposes &amp; legal bases)</h2>
            <ul className="list-disc space-y-1 pl-5">
              <li>
                <strong>Provide the service</strong> (Art. 6(1)(b) GDPR &mdash; contract):
                creating your account, storing and syncing tasks, running
                notifications and reports.
              </li>
              <li>
                <strong>Security &amp; fraud prevention</strong> (Art. 6(1)(f) GDPR
                &mdash; legitimate interest): rate limiting, abuse detection, audit logs.
              </li>
              <li>
                <strong>Communications you opted into</strong> (Art. 6(1)(a) GDPR
                &mdash; consent): email digests, browser push, marketing (only with
                consent).
              </li>
              <li>
                <strong>Legal obligations</strong> (Art. 6(1)(c) GDPR): tax, accounting
                and law-enforcement requests where required.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">4. Storage, retention &amp; deletion</h2>
            <p>
              Your data is stored on Supabase (PostgreSQL) in the EU/EEA where
              possible, and in an encrypted local mirror (IndexedDB) on your device.
              We retain account data for as long as your account is active, plus a
              short grace period after deletion. Task data is retained for the
              organisation&rsquo;s reporting window and then purged.
            </p>
            <p>
              You can delete your account at any time from your profile; this
              triggers deletion of your personal data within 30 days, except where
              retention is required by law.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">5. Sharing &amp; third parties</h2>
            <p>
              We do not sell your data. We share it only with sub-processors
              necessary to run the service: hosting/database (Supabase), email
              delivery (Nodemailer-compatible transport), push delivery (web-push),
              and error monitoring. All are bound by data-processing agreements.
            </p>
            <p>
              Organisation owners can see all tasks in their organisation. Members
              see only their own working set.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">6. International transfers</h2>
            <p>
              Where data is transferred outside the EEA, we rely on Standard
              Contractual Clauses (SCCs) or other lawful transfer mechanisms.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">7. Cookies &amp; local storage</h2>
            <p>
              We use strictly necessary cookies for authentication and session
              management, and local storage / IndexedDB for the encrypted offline
              mirror. We do not use advertising or tracking cookies. See our{" "}
              <Link href="/cookies" className="underline underline-offset-4">
                Cookie Policy
              </Link>
              .
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">8. Your rights (GDPR)</h2>
            <p>You have the right to:</p>
            <ul className="list-disc space-y-1 pl-5">
              <li>Access the personal data we hold about you.</li>
              <li>Rectify inaccurate or incomplete data.</li>
              <li>Erase your data (&ldquo;right to be forgotten&rdquo;).</li>
              <li>Restrict or object to processing.</li>
              <li>Data portability (export your data).</li>
              <li>Withdraw consent at any time (where processing is consent-based).</li>
              <li>Lodge a complaint with your supervisory authority.</li>
            </ul>
            <p>
              To exercise any right, contact us at the address below. We respond
              within 30 days.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">9. Children</h2>
            <p>
              Scrum Master is not directed at children under 16. We do not knowingly
              collect data from children.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">10. Changes to this policy</h2>
            <p>
              We may update this policy from time to time. Material changes will be
              announced in the app and by email. The &ldquo;Last updated&rdquo; date
              reflects the latest revision.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">11. Contact</h2>
            <p>
              Questions about privacy? Email{" "}
              <a href="mailto:privacy@scrummaster.app" className="underline underline-offset-4">
                privacy@scrummaster.app
              </a>
              . For data-subject requests, use the same address and include
              &ldquo;GDPR request&rdquo; in the subject line.
            </p>
          </section>
        </div>

        <div className="mt-10 flex flex-wrap gap-4 text-sm">
          <Link href="/terms" className="underline underline-offset-4 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white">
            Terms of Service
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
            <Link href="/privacy" className="transition-colors hover:text-neutral-900 dark:hover:text-white">
              Privacy
            </Link>
            <Link href="/terms" className="transition-colors hover:text-neutral-900 dark:hover:text-white">
              Terms
            </Link>
            <Link href="/cookies" className="transition-colors hover:text-neutral-900 dark:hover:text-white">
              Cookies
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
