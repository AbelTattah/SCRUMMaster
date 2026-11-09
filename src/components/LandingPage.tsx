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
              Things scattered. Nothing aligned.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-neutral-600 dark:text-neutral-400 sm:text-lg">
              Bring order to the chaos. Capture what matters, move it forward,
              and let the rest take shape on its own. Your work, your way —
              always within reach, always under your control.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href="/register"
                className="inline-flex items-center gap-2 rounded-full bg-[#21005D] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#2E0480] dark:bg-white dark:text-black dark:hover:bg-neutral-200"
              >
                Begin
                <ArrowRight className="size-4" />
              </Link>
              <Link
                href="#how-it-works"
                className="inline-flex items-center gap-2 rounded-full border border-neutral-300 px-6 py-3 text-sm font-semibold text-neutral-800 transition-colors hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-900"
              >
                Discover more
              </Link>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-md lg:max-w-none">
            <div className="overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-2xl shadow-neutral-900/10 dark:border-neutral-800 dark:bg-neutral-900 dark:shadow-black/40">
              <img src="/logo.png" alt="Scrum Master" className="h-auto w-full object-cover" />
            </div>
            <p className="mt-3 text-center text-xs text-neutral-500 dark:text-neutral-500">
              Quietly powerful. Always yours.
            </p>
          </div>
        </div>
      </section>

      {/* ---------- Trust strip ---------- */}
      <section className="border-b border-neutral-200/70 dark:border-neutral-900">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-8 gap-y-3 px-4 py-6 sm:px-6">
          {[
            { icon: Wifi, label: "Always within reach" },
            { icon: Lock, label: "Yours alone" },
            { icon: FileText, label: "Shareable moments" },
            { icon: Zap, label: "Desktop companion" },
            { icon: Shield, label: "No barriers to start" },
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
              Scattered. Untracked. Unspoken.
            </h2>
            <p className="mt-3 text-base leading-relaxed text-neutral-600 dark:text-neutral-400">
              A single place where everything converges — quietly.
            </p>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {[
              {
                title: "A single view",
                body: "Everything that matters, gathered into one calm space. No noise, no clutter.",
              },
              {
                title: "Insights that surface themselves",
                body: "What happened, what's next, what's in the way — revealed when you need them.",
              },
              {
                title: "People, connected",
                body: "Bring others in without friction. They find their place when the time is right.",
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
              What unfolds when everything connects
            </h2>
            <p className="mt-3 text-base leading-relaxed text-neutral-600 dark:text-neutral-400">
              Quiet tools that stay out of your way.
            </p>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: LayoutGrid,
                title: "Your space",
                body: "A living surface for what needs attention. Interact naturally — everything responds.",
              },
              {
                icon: Bell,
                title: "Never be caught off guard",
                body: "Gentle nudges before moments arrive. Alerts when something needs you.",
              },
              {
                icon: User,
                title: "Effortless collaboration",
                body: "Invite others by presence alone. They arrive when ready.",
              },
              {
                icon: FileText,
                title: "Moments captured",
                body: "Any window of time, preserved and shared in familiar forms.",
              },
              {
                icon: Lock,
                title: "Yours alone",
                body: "What you write stays yours. We never see it.",
              },
              {
                icon: Wifi,
                title: "Always with you",
                body: "Carry everything, even in silence. It finds its way back when connected.",
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
              Three quiet steps
            </h2>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { n: "1", title: "Arrive", body: "A key is born from your words. No rituals, no setup." },
              { n: "2", title: "Capture", body: "Speak. Set. Assign. Everything finds its place instantly." },
              { n: "3", title: "Reflect and share", body: "A window of time, distilled. Send it onward." },
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
                Moments, distilled
              </h2>
              <p className="mt-4 max-w-xl text-base leading-relaxed text-neutral-600 dark:text-neutral-400">
                Any window of time, gathered and shaped. Attendance, progress,
                blockers, action items, summary &mdash; all emerging from what
                actually happened.
              </p>
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center gap-2 rounded-full border border-neutral-300 px-4 py-2 text-sm font-semibold text-neutral-800 dark:border-neutral-700 dark:text-neutral-200">
                  <FileText className="size-4" /> PDF
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-neutral-300 px-4 py-2 text-sm font-semibold text-neutral-800 dark:border-neutral-700 dark:text-neutral-200">
                  <Download className="size-4" /> Word
                </span>
              </div>
              <p className="mt-4 text-sm text-neutral-600 dark:text-neutral-400">
                Those who lead can see it all. What is written stays unseen by us.
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
              Quietly guarded
            </h2>
            <p className="mt-3 text-base leading-relaxed text-neutral-600 dark:text-neutral-400">
              What you write stays yours. We never see it.
            </p>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { title: "Sealed", body: "Your words are sealed before they leave your device." },
              { title: "Born from you", body: "A secret born from your own words. No plaintext leaves." },
              { title: "A way back", body: "A phrase that brings it all back. Lose one thing, keep everything." },
              { title: "Shared, carefully", body: "Those who lead grant access. It is scoped, not open." },
              { title: "Always with you", body: "Carry it all, even in silence. It finds its way back." },
              { title: "No starting over", body: "What came before is woven in. Nothing to migrate." },
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
              Whispers from those who use it
            </h2>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {[
              { quote: "Finally something that doesn't make everyone create an account before I can hand them work.", name: "Ama", role: "team lead" },
              { quote: "The reports save me half an hour every morning. Clean, ready, done.", name: "Kwame", role: "scrum master" },
              { quote: "It follows me onto the train with no signal. That alone is worth it.", name: "Efua", role: "freelancer" },
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
              Questions, answered
            </h2>
          </div>
          <div className="mt-8 space-y-3">
            {[
              {
                q: "Is it really private?",
                a: "Yes. Your words are sealed before they leave your device. We hold only what we cannot read.",
              },
              {
                q: "Does it work without a connection?",
                a: "Yes. Everything lives with you. It finds its way back when connected.",
              },
              {
                q: "Can I hand work to people without accounts?",
                a: "Yes. Bring them in by name. They arrive when they are ready.",
              },
              {
                q: "What can be shared?",
                a: "Moments in time, in familiar forms. Those who lead can see it all.",
              },
              {
                q: "What if I forget my key?",
                a: "A phrase brings it back. Those without a password receive a key they can carry.",
              },
              {
                q: "Is there a phone app?",
                a: "The web follows you anywhere. A native companion is on the horizon.",
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
            Begin when you are ready.
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-base leading-relaxed text-neutral-600 dark:text-neutral-400">
            No barriers. No waiting. Your first step takes seconds.
          </p>
          <div className="mt-7">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 rounded-full bg-[#21005D] px-7 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-[#2E0480] dark:bg-white dark:text-black dark:hover:bg-neutral-200"
            >
              Start
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
