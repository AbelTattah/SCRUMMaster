"use client";

import { useEffect, useState } from "react";

const KEY = "scrum-master.theme";

type Mode = "system" | "light" | "dark";

const MODES: { id: Mode; label: string }[] = [
  { id: "system", label: "System" },
  { id: "light", label: "Light" },
  { id: "dark", label: "Dark" },
];

function readMode(): Mode {
  try {
    const stored = localStorage.getItem(KEY);

    if (stored === "dark" || stored === "light" || stored === "system") {
      return stored;
    }
  } catch {
    // Storage unavailable — fall back to the system preference.
  }

  return "system";
}

function apply(mode: Mode) {
  try {
    if (mode === "system") {
      localStorage.removeItem(KEY);
    } else {
      localStorage.setItem(KEY, mode);
    }
  } catch {
    // Preference still applies for this page view even if it cannot persist.
  }

  if (mode === "dark" || mode === "light") {
    document.documentElement.dataset.theme = mode;
  } else {
    delete document.documentElement.dataset.theme;
  }
}

/**
 * System / Light / Dark picker. "System" is the default and needs no JS —
 * the dark values live behind prefers-color-scheme; choosing Light or Dark
 * pins it via data-theme on <html> (set before paint by the root layout).
 */
export function ThemeSetting() {
  const [mode, setMode] = useState<Mode>("system");
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    setMode(readMode());
    setChecked(true);
  }, []);

  const hint = !checked
    ? "Checking…"
    : mode === "system"
      ? "Follows your device's light/dark setting."
      : mode === "dark"
        ? "Dark theme is on for this browser."
        : "Light theme is on for this browser.";

  return (
    <>
      <p className="setting-status">{hint}</p>

      <div className="seg" role="radiogroup" aria-label="Theme">
        {MODES.map((option) => (
          <label key={option.id}>
            <input
              type="radio"
              name="theme"
              value={option.id}
              checked={mode === option.id}
              onChange={() => {
                setMode(option.id);
                apply(option.id);
              }}
            />
            {option.label}
          </label>
        ))}
      </div>
    </>
  );
}
