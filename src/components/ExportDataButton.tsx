"use client";

import { useState } from "react";

import { decryptRows, visibleHomeRows, visibleTeamRows } from "@/lib/sync";

export function ExportDataButton() {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function exportData() {
    setBusy(true);
    setMessage(null);
    try {
      const [home, team] = await Promise.all([visibleHomeRows(), visibleTeamRows()]);
      const [homeDecrypted, teamDecrypted] = await Promise.all([
        decryptRows(home),
        decryptRows(team),
      ]);

      const payload = {
        exported_at: new Date().toISOString(),
        home: homeDecrypted,
        team: teamDecrypted,
      };

      const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `scrum-master-data-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setMessage("Your data has been downloaded.");
    } catch (err) {
      setMessage("Could not export data. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => void exportData()}
        disabled={busy}
        className="inline-flex items-center gap-2 rounded-full bg-[#21005D] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#2E0480] disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-neutral-200"
      >
        {busy ? "Exporting…" : "Export my data (JSON)"}
      </button>
      {message ? (
        <p className="text-xs text-neutral-500 dark:text-neutral-400">{message}</p>
      ) : null}
    </div>
  );
}
