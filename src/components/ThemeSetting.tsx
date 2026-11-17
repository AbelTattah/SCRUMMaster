"use client";

import { useEffect, useState } from "react";

const KEY = "scrum-master.theme";

type Mode = "system" | "light" | "dark";

const MODES: { id: Mode; label: string }[] = [
  { id: "system", label: "System" },
  { id: "light", label: "Light" },
  { id: "dark", label: "Dark" },
];

function systemTheme(): "light" | "dark" {
  if (typeof window === "undefined" || !window.matchMedia) return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function resolve(mode: Mode): "light" | "dark" {
  return mode === "system" ? systemTheme() : mode;
}

function readMode(): Mode {
  try {
    const stored = localStorage.getItem(KEY);
    if (stored === "dark" || stored === "light" || stored === "system") {
      return stored;
    }
  } catch {
    // Storage unavailable - fall back to the system preference.
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
  const theme = resolve(mode);
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
}

export function ThemeSetting() {
  const [mode, setMode] = useState<Mode>("system");
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const m = readMode();
    setMode(m);
    apply(m);
    setChecked(true);

    const mq = window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null;
    if (!mq) return;
    const onChange = () => {
      const current = readMode();
      if (current === "system") apply("system");
    };
    try {
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    } catch {
      mq.addListener(onChange);
      return () => mq.removeListener(onChange);
    }
  }, []);

  const hint = !checked
    ? "Checking..."
    : mode === "system"
      ? "Follows your device (" + resolve("system") + " now)."
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