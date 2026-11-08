"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const KEY = "scrum-master.cookie-consent";

export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(KEY)) {
        setVisible(true);
      }
    } catch {
      // localStorage unavailable — don't block the UI.
    }
  }, []);

  if (!visible) return null;

  function accept() {
    try {
      localStorage.setItem(KEY, "1");
    } catch {
      // ignore
    }
    setVisible(false);
  }

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Cookie notice"
      className="fixed bottom-4 left-1/2 z-[200] w-[calc(100%-2rem)] max-w-2xl -translate-x-1/2 rounded-2xl border border-neutral-200 bg-white p-4 shadow-lg dark:border-neutral-800 dark:bg-neutral-900 sm:bottom-6"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs leading-relaxed text-neutral-600 dark:text-neutral-300 sm:text-sm">
          We use only strictly necessary cookies and local storage to keep you
          signed in and power the offline app. No tracking or advertising.
          See our{" "}
          <Link href="/cookies" className="underline underline-offset-4 hover:text-neutral-900 dark:hover:text-white">
            Cookie Policy
          </Link>
          .
        </p>
        <div className="flex shrink-0 items-center gap-2">
          <Link
            href="/privacy"
            className="inline-flex items-center rounded-full px-3 py-1.5 text-xs font-medium text-neutral-600 transition-colors hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
          >
            Privacy
          </Link>
          <button
            type="button"
            onClick={accept}
            className="inline-flex items-center rounded-full bg-[#21005D] px-4 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#2E0480] dark:bg-white dark:text-black dark:hover:bg-neutral-200"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
