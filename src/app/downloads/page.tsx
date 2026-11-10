import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Download Scrum Master",
  description:
    "Download the Scrum Master desktop app for Windows, or use the web app and PWA. Free and open source.",
};

const RELEASE_TAG = "v2.0.0";
const EXE_NAME = "Scrum.Master.Setup.0.1.0.exe";
const EXE_DISPLAY = "Scrum Master Setup 0.1.0.exe";
const EXE_URL = `https://github.com/AbelTattah/SCRUMMaster/releases/download/${RELEASE_TAG}/${EXE_NAME}`;

export default function DownloadsPage() {
  return (
    <div className="min-h-full flex flex-col bg-white dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100">
      <header className="sticky top-0 z-30 border-b border-neutral-200/80 dark:border-neutral-800/80 bg-white/90 dark:bg-neutral-950/90 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link href="/" className="flex min-w-0 shrink-0 items-center" aria-label="Scrum Master home">
            <img src="/logo-wordmark.png" alt="Scrum Master" className="h-7 w-auto sm:h-8 dark:hidden" />
            <img src="/logo-wordmark-white.png" alt="Scrum Master" className="h-7 w-auto sm:h-8 hidden dark:block" />
          </Link>
          <nav className="hidden items-center gap-6 md:flex">
            <Link href="/#features" className="text-sm text-neutral-600 transition-colors hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white">Features</Link>
            <Link href="/#security" className="text-sm text-neutral-600 transition-colors hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white">Security</Link>
            <Link href="/#faq" className="text-sm text-neutral-600 transition-colors hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white">FAQ</Link>
          </nav>
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

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-white sm:text-4xl">
            Download Scrum Master
          </h1>
          <p className="mt-3 text-base leading-relaxed text-neutral-600 dark:text-neutral-400">
            Free and open source. Pick the platform that fits your workflow.
          </p>
        </div>

        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {/* Desktop */}
          <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900/60">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#21005D]/10 text-[#21005D] dark:bg-[#B9A6F5]/15 dark:text-[#B9A6F5]">
              <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="14" x="2" y="3" rx="2" /><line x1="8" x2="16" y1="21" y2="21" /><line x1="12" x2="12" y1="17" y2="21" /></svg>
            </div>
            <h2 className="mt-4 text-lg font-semibold text-neutral-900 dark:text-white">Windows desktop</h2>
            <p className="mt-2 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
              Offline-first native app. Bundled server, sticky notes, notifications.
              Installer: <code className="text-xs">{EXE_DISPLAY}</code> (118 MB).
            </p>
            <a
              href={EXE_URL}
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#21005D] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#2E0480] dark:bg-white dark:text-black dark:hover:bg-neutral-200"
            >
              Download for Windows
            </a>
            <p className="mt-3 text-xs text-neutral-500 dark:text-neutral-400">
              Windows 10/11, 64-bit. Unsigned build &mdash; Smart App Control may
              prompt; use &ldquo;More info &rarr; Run anyway&rdquo; or turn SAC off.
            </p>
          </div>

          {/* Web */}
          <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900/60">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#21005D]/10 text-[#21005D] dark:bg-[#B9A6F5]/15 dark:text-[#B9A6F5]">
              <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" /><path d="M2 12h20" /></svg>
            </div>
            <h2 className="mt-4 text-lg font-semibold text-neutral-900 dark:text-white">Web app</h2>
            <p className="mt-2 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
              Use instantly in any browser. Installable as a PWA on phones and tablets.
              Works offline after the first visit.
            </p>
            <Link
              href="/"
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#21005D] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#2E0480] dark:bg-white dark:text-black dark:hover:bg-neutral-200"
            >
              Open web app
            </Link>
            <p className="mt-3 text-xs text-neutral-500 dark:text-neutral-400">
              Chrome, Edge, Firefox, Safari. No install required.
            </p>
          </div>

          {/* Source */}
          <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900/60">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#21005D]/10 text-[#21005D] dark:bg-[#B9A6F5]/15 dark:text-[#B9A6F5]">
              <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" /><path d="M9 18c-4.51 2-5-2-7-2" /></svg>
            </div>
            <h2 className="mt-4 text-lg font-semibold text-neutral-900 dark:text-white">Source code</h2>
            <p className="mt-2 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
              MIT licensed. Build it yourself, contribute, or fork it.
            </p>
            <a
              href="https://github.com/AbelTattah/SCRUMMaster"
              target="_blank"
              rel="noreferrer"
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full border border-neutral-300 px-4 py-2.5 text-sm font-semibold text-neutral-800 transition-colors hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-900"
            >
              View on GitHub
            </a>
            <p className="mt-3 text-xs text-neutral-500 dark:text-neutral-400">
              Requires Node.js 20+ and a Supabase project.
            </p>
          </div>
        </div>

        <div className="mt-12 mx-auto max-w-2xl text-center">
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            Looking for a specific version or older release?
            <a
              href="https://github.com/AbelTattah/SCRUMMaster/releases"
              target="_blank"
              rel="noreferrer"
              className="ml-1 font-semibold text-[#21005D] transition-colors hover:text-[#2E0480] dark:text-[#B9A6F5]"
            >
              All releases on GitHub &rarr;
            </a>
          </p>
        </div>
      </main>

      <footer className="mt-auto border-t border-neutral-200/80 dark:border-neutral-800/80">
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
