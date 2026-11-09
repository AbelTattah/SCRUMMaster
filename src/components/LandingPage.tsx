import Link from "next/link";
import type { Metadata } from "next";
import {
  ArrowRight,
  Bell,
  Check,
  Download,
  FileText,
  LayoutGrid,
  Lock,
  Shield,
  Sparkles,
  Trophy,
  User,
  Wifi,
  Zap,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Scrum Master — tasks, teams and stand-up reports",
  description:
    "A fast, offline-first task manager for you and your team. Track today's work, assign to anyone, get reminded, and ship a stand-up report (PDF or Word) in one click. End-to-end encrypted.",
};

export default function LandingPage() {
  return (
    <div className="min-h-full flex flex-col bg-white dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100">
      {/* ---------- Header ---------- */}
      <header className="sticky top-0 z-30 border-b border-neutral-200/80 dark:border-neutral-800/80 bg-white/90 dark:bg-neutral-950/90 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link href="/" className="flex min-w-0 shrink-0 items-center" aria-label="Scrum Master home">
            <img src="/logo-wordmark.png" alt="Scrum Master" className="h-7 w-auto sm:h-8 dark:hidden" />
            <img src="/logo-wordmark-white.png" alt="Scrum Master" className="h-7 w-auto sm:h-8 hidden dark:block" />
          </Link>

          <nav className="hidden items-center gap-6 md:flex">
            <Link href="#features" className="text-sm text-neutral-600 transition-colors hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white">
              Features
            </Link>
            <Link href="#how-it-works" className="text-sm text-neutral-600 transition-colors hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white">
              How it works
            </Link>
            <Link href="#security" className="text-sm text-neutral-600 transition-colors hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white">
              Security
            </Link>
            <Link href="#reports" className="text-sm text-neutral-600 transition-colors hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white">
              Reports
            </Link>
            <Link href="#faq" className="text-sm text-neutral-600 transition-colors hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white">
              FAQ
            </Link>
          </nav>

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

      {/* ---------- Hero ---------- */}
      <section className="relative overflow-hidden border-b border-neutral-200/70 dark:border-neutral-900">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 70% 60% at 20% 20%, rgba(33,0,93,0.10), transparent 60%), radial-gradient(ellipse 50% 50% at 85% 30%, rgba(185,166,245,0.10), transparent 60%)",
          }}
        />
        <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:gap-14 lg:py-24">
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight text-neutral-950 dark:text-white sm:text-5xl lg:text-[3.4rem] lg:leading-[1.05]">
              Get things done. Stay accountable. Level up every day.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-neutral-600 dark:text-neutral-400 sm:text-lg">
              Fast, Works Offline. Made for Agile Teams
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href="/register"
                className="inline-flex items-center gap-2 rounded-full bg-[#21005D] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#2E0480] dark:bg-white dark:text-black dark:hover:bg-neutral-200"
              >
                Start for free
                <ArrowRight className="size-4" />
              </Link>
              <Link
                href="#how-it-works"
                className="inline-flex items-center gap-2 rounded-full border border-neutral-300 px-6 py-3 text-sm font-semibold text-neutral-800 transition-colors hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-900"
              >
                See how it works
              </Link>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-md lg:max-w-none">
              <img src="/hero.png" alt="Scrum Master app" className="h-auto w-full object-cover" />
          </div>
        </div>
      </section>

      {/* ---------- Trust strip ---------- */}
      <section className="border-b border-neutral-200/70 dark:border-neutral-900">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-8 gap-y-3 px-4 py-6 sm:px-6">
          {[
            { icon: Wifi, label: "Works offline" },
            { icon: Lock, label: "End-to-end encrypted" },
            { icon: FileText, label: "PDF + Word reports" },
            { icon: Zap, label: "Desktop app" },
            { icon: Shield, label: "No credit card to start" },
          ].map(({ icon: Icon, label }) => (
            <div key={label} className="inline-flex items-center gap-2 text-sm font-medium text-neutral-600 dark:text-neutral-400">
              <Icon className="size-4 text-[#21005D] dark:text-[#B9A6F5]" />
              {label}
            </div>
          ))}
        </div>
      </section>

      {/* ---------- Problem / solution ---------- */}
      <section className="border-b border-neutral-200/70 dark:border-neutral-900">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-white sm:text-4xl">
              Tasks everywhere. Reports nowhere.
            </h2>
            <p className="mt-3 text-base leading-relaxed text-neutral-600 dark:text-neutral-400">
              Scrum Master brings your work, your team and your stand-up into one place.
            </p>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {[
              {
                title: "One board for today",
                body: "Everything you need to do today on a single screen. Inline editing, no modals, no friction.",
              },
              {
                title: "Reports that write themselves",
                body: "Stand-up reports generated from real task data",
              },
              {
                title: "Teams without the friction",
                body: "Add teammates by email and assign tasks immediately. They pick everything up when they first sign in.",
              },
            ].map(({ title, body }) => (
              <div
                key={title}
                className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900/60"
              >
                <h3 className="text-base font-semibold text-neutral-900 dark:text-white">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- Features ---------- */}
      <section id="features" className="border-b border-neutral-200/70 dark:border-neutral-900 bg-neutral-50/60 dark:bg-neutral-950">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-white sm:text-4xl">
              Everything a team needs to stay accountable
            </h2>
            <p className="mt-3 text-base leading-relaxed text-neutral-600 dark:text-neutral-400">
              Tasks, reminders, teams and reports
            </p>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: LayoutGrid,
                title: "Today's board",
                body: "Inline editing, one-click checkboxes that stick, search and pagination. Sticky notes pop into a floating mini-window.",
              },
              {
                icon: Bell,
                title: "Never miss a thing",
                body: "Reminders before tasks start, overdue/upcoming/blocker alerts, browser push and email digests.",
              },
              {
                icon: User,
                title: "Teams without friction",
                body: "Invite by email, assign before they sign up, XP + levels, and a team leaderboard.",
              },
              {
                icon: FileText,
                title: "Stand-up reports",
                body: "Daily, weekly or monthly windows. PDF and Word (.docx) export in one click.",
              },
              {
                icon: Lock,
                title: "Private by design",
                body: "End-to-end encrypted task titles and blockers. Zero-knowledge — we can't read your tasks.",
              },
              {
                icon: Wifi,
                title: "Works offline",
                body: "Tasks live in an encrypted local mirror. Create, edit and complete with no connection; syncs when back.",
              },
            ].map(({ icon: Icon, title, body }) => (
              <div
                key={title}
                className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900/60"
              >
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#21005D]/10 text-[#21005D] dark:bg-[#B9A6F5]/15 dark:text-[#B9A6F5]">
                  <Icon className="size-5" />
                </span>
                <h3 className="mt-4 text-base font-semibold text-neutral-900 dark:text-white">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- How it works ---------- */}
      <section id="how-it-works" className="border-b border-neutral-200/70 dark:border-neutral-900">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-white sm:text-4xl">
              Get started in three steps
            </h2>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { n: "1", title: "Sign up in seconds", body: "We generate an encryption key from your password and a 24-word recovery phrase. No setup wizard." },
              { n: "2", title: "Add your tasks", body: "Type a title, press Enter. Set times, assign teammates — even ones without accounts yet." },
              { n: "3", title: "Report and share", body: "Pick a period, generate a stand-up report, export to PDF or Word. Send it to your team." },
            ].map(({ n, title, body }) => (
              <div
                key={n}
                className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900/60"
              >
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[#21005D] text-sm font-bold text-white">
                  {n}
                </span>
                <h3 className="mt-4 text-sm font-semibold text-neutral-900 dark:text-white">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- Reports showcase ---------- */}
      <section id="reports" className="border-b border-neutral-200/70 dark:border-neutral-900 bg-neutral-50/60 dark:bg-neutral-950">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <div className="mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-2 lg:gap-14">
            <div>
              <h2 className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-white sm:text-4xl">
                Stand-up reports, generated for you
              </h2>
              <p className="mt-4 max-w-xl text-base leading-relaxed text-neutral-600 dark:text-neutral-400">
                Daily, weekly or monthly windows. Header block, attendance, per-member
                progress, blockers, action items, meeting summary and a prepared-by
                footer &mdash; all derived from your real task data.
              </p>
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center gap-2 rounded-full border border-neutral-300 px-4 py-2 text-sm font-semibold text-neutral-800 dark:border-neutral-700 dark:text-neutral-200">
                  <FileText className="size-4" /> PDF
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-neutral-300 px-4 py-2 text-sm font-semibold text-neutral-800 dark:border-neutral-700 dark:text-neutral-200">
                  <Download className="size-4" /> Word (.docx)
                </span>
              </div>
              <p className="mt-4 text-sm text-neutral-600 dark:text-neutral-400">
                Owners can download org-wide reports. Titles and blockers stay
                encrypted client-side.
              </p>
            </div>

            <div className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-2xl shadow-neutral-900/10 dark:border-neutral-800 dark:bg-neutral-900 dark:shadow-black/40">
              <div className="space-y-3">
                <div className="h-3 w-2/3 rounded-full bg-neutral-200 dark:bg-neutral-800" />
                <div className="h-3 w-1/2 rounded-full bg-neutral-200 dark:bg-neutral-800" />
                <div className="mt-4 h-2 w-full rounded-full bg-neutral-100 dark:bg-neutral-800" />
                <div className="h-2 w-5/6 rounded-full bg-neutral-100 dark:bg-neutral-800" />
                <div className="h-2 w-4/6 rounded-full bg-neutral-100 dark:bg-neutral-800" />
                <div className="mt-4 h-2 w-3/4 rounded-full bg-neutral-100 dark:bg-neutral-800" />
                <div className="h-2 w-2/3 rounded-full bg-neutral-100 dark:bg-neutral-800" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- Security ---------- */}
      <section id="security" className="border-b border-neutral-200/70 dark:border-neutral-900">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-white sm:text-4xl">
              Private by design
            </h2>
            <p className="mt-3 text-base leading-relaxed text-neutral-600 dark:text-neutral-400">
              Zero-knowledge end-to-end encryption. We store ciphertext; we can&rsquo;t read your tasks.
            </p>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { title: "End-to-end encryption", body: "Task titles and blockers encrypted in your browser before they leave your device." },
              { title: "Password-derived keys", body: "Your password secures your data. No plaintext keys on the server." },
              { title: "Recovery phrase", body: "A recovery phrase brings everything back. Lose your password, keep your data." },
              { title: "Team access", body: "Owners grant access; members receive it. Access is scoped, not open." },
              { title: "Works offline", body: "Encrypted local mirror. Create, edit, complete with no connection." },
              { title: "Seamless migration", body: "Older data auto-upgrades. No migration step required." },
            ].map(({ title, body }) => (
              <div
                key={title}
                className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900/60"
              >
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#21005D]/10 text-[#21005D] dark:bg-[#B9A6F5]/15 dark:text-[#B9A6F5]">
                  <Shield className="size-5" />
                </span>
                <h3 className="mt-4 text-base font-semibold text-neutral-900 dark:text-white">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- Testimonials ---------- */}
      <section className="border-b border-neutral-200/70 dark:border-neutral-900 bg-neutral-50/60 dark:bg-neutral-950">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-white sm:text-4xl">
              Loved by small teams
            </h2>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {[
              { quote: "Finally a task app that doesn't make my team create accounts before I can assign them work.", name: "Ama", role: "team lead" },
              { quote: "The stand-up report export saves me 30 minutes every morning. PDF and Word, both clean.", name: "Kwame", role: "scrum master" },
              { quote: "Works on the train with no signal. That alone is worth it.", name: "Efua", role: "freelancer" },
            ].map(({ quote, name, role }) => (
              <figure
                key={name}
                className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900/60"
              >
                <blockquote className="text-sm leading-relaxed text-neutral-700 dark:text-neutral-300">
                  &ldquo;{quote}&rdquo;
                </blockquote>
                <figcaption className="mt-4 text-sm">
                  <span className="font-semibold text-neutral-900 dark:text-white">{name}</span>
                  <span className="text-neutral-500 dark:text-neutral-400">, {role}</span>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- FAQ ---------- */}
      <section id="faq" className="border-b border-neutral-200/70 dark:border-neutral-900">
        <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-20">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-white sm:text-4xl">
              Frequently asked questions
            </h2>
          </div>
          <div className="mt-8 space-y-3">
            {[
              {
                q: "Is my data really private?",
                a: "Yes. Task titles and blockers are encrypted in your browser before they leave your device. We store ciphertext only.",
              },
              {
                q: "Does it work offline?",
                a: "Yes. Tasks live in an encrypted local mirror. Create, edit and complete with no connection; they sync when you're back.",
              },
              {
                q: "Can I assign tasks to people without accounts?",
                a: "Yes. Add a teammate by email and assign tasks immediately. They pick everything up when they first sign in.",
              },
              {
                q: "What report formats are supported?",
                a: "PDF and Word (.docx), in daily, weekly and monthly windows. Owners can download org-wide reports.",
              },
              {
                q: "What if I forget my password?",
                a: "Use your 24-word recovery phrase to restore access. Password-less accounts get an auto-generated sign-in key you can copy.",
              },
              {
                q: "Is there a mobile app?",
                a: "The web app is responsive and installable as a PWA on phones and tablets. A native mobile app is on the roadmap.",
              },
            ].map(({ q, a }) => (
              <details
                key={q}
                className="group rounded-2xl border border-neutral-200 bg-white px-5 py-4 open:border-[#21005D]/40 dark:border-neutral-800 dark:bg-neutral-900/60 dark:open:border-[#B9A6F5]/40"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold text-neutral-900 dark:text-white">
                  {q}
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- Final CTA ---------- */}
      <section className="border-b border-neutral-200/70 dark:border-neutral-900 bg-neutral-50/60 dark:bg-neutral-950">
        <div className="mx-auto max-w-6xl px-4 py-16 text-center sm:px-6 sm:py-20">
          <h2 className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-white sm:text-4xl">
            Your tasks, your team, your stand-up &mdash; today.
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-base leading-relaxed text-neutral-600 dark:text-neutral-400">
            Start free and get your first task on the board in seconds. No credit card.
          </p>
          <div className="mt-7">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 rounded-full bg-[#21005D] px-7 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-[#2E0480] dark:bg-white dark:text-black dark:hover:bg-neutral-200"
            >
              Start creating
              <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ---------- Footer ---------- */}
      <footer className="mt-auto border-t border-neutral-200/80 dark:border-neutral-800/80">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <img src="/logo-wordmark.png" alt="Scrum Master" className="h-6 w-auto dark:hidden" />
              <img src="/logo-wordmark-white.png" alt="Scrum Master" className="h-6 w-auto hidden dark:block" />
              <p className="mt-3 text-xs leading-relaxed text-neutral-500 dark:text-neutral-400">
                Record what gets done, stay accountable, and level up every day.
              </p>
            </div>
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-900 dark:text-white">Product</h3>
              <ul className="mt-3 space-y-2 text-sm text-neutral-600 dark:text-neutral-400">
                <li><Link href="#features" className="transition-colors hover:text-neutral-900 dark:hover:text-white">Features</Link></li>
                <li><Link href="#how-it-works" className="transition-colors hover:text-neutral-900 dark:hover:text-white">How it works</Link></li>
                <li><Link href="#reports" className="transition-colors hover:text-neutral-900 dark:hover:text-white">Reports</Link></li>
                <li><Link href="#security" className="transition-colors hover:text-neutral-900 dark:hover:text-white">Security</Link></li>
                <li><Link href="/login" className="transition-colors hover:text-neutral-900 dark:hover:text-white">Sign in</Link></li>
                <li><Link href="/register" className="transition-colors hover:text-neutral-900 dark:hover:text-white">Sign up</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-900 dark:text-white">Resources</h3>
              <ul className="mt-3 space-y-2 text-sm text-neutral-600 dark:text-neutral-400">
                <li><Link href="#faq" className="transition-colors hover:text-neutral-900 dark:hover:text-white">FAQ</Link></li>
                <li><Link href="/landing" className="transition-colors hover:text-neutral-900 dark:hover:text-white">Landing</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-900 dark:text-white">Legal</h3>
              <ul className="mt-3 space-y-2 text-sm text-neutral-600 dark:text-neutral-400">
                <li><Link href="/privacy" className="transition-colors hover:text-neutral-900 dark:hover:text-white">Privacy Policy</Link></li>
                <li><Link href="/terms" className="transition-colors hover:text-neutral-900 dark:hover:text-white">Terms of Service</Link></li>
                <li><Link href="/cookies" className="transition-colors hover:text-neutral-900 dark:hover:text-white">Cookie Policy</Link></li>
              </ul>
            </div>
          </div>
          <div className="mt-8 flex flex-col items-center justify-between gap-3 border-t border-neutral-200/80 pt-6 sm:flex-row dark:border-neutral-800/80">
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              &copy; Scrum Master. Built for teams that ship.
            </p>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              GDPR-compliant. End-to-end encrypted.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
