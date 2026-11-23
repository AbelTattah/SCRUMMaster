"use client";

import { useRef, useState, type ChangeEvent } from "react";

import { Icon } from "@/components/icons";
import { importTodosLocal } from "@/lib/sync";

interface ExportRow {
  title?: string;
  [key: string]: unknown;
}

interface ExportPayload {
  exported_at?: string;
  home?: ExportRow[];
  team?: ExportRow[];
}

/** Import a Scrum Master JSON export back into the current account/device. */
export function ImportDataButton() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [payload, setPayload] = useState<ExportPayload | null>(null);
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  function reset() {
    setPayload(null);
    setFileName("");
    setError(null);
    setMessage(null);
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }

  async function onFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    setError(null);
    setMessage(null);

    if (!file) {
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError("That file is too large (max 10 MB).");
      return;
    }

    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as ExportPayload;

      if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.home) && !Array.isArray(parsed.team)) {
        setError("This doesn't look like a Scrum Master export (missing home/team tasks).");
        return;
      }

      setPayload({
        exported_at: parsed.exported_at,
        home: Array.isArray(parsed.home) ? parsed.home : [],
        team: Array.isArray(parsed.team) ? parsed.team : [],
      });
      setFileName(file.name);
    } catch {
      setError("Could not read that file. Make sure it's a valid JSON export.");
    }
  }

  async function doImport() {
    if (!payload || busy) {
      return;
    }

    setBusy(true);
    setError(null);
    setMessage(null);

    try {
      const byId = new Map<string, ExportRow>();

      for (const row of [...(payload.home ?? []), ...(payload.team ?? [])]) {
        const key = typeof row.id === "string" && row.id ? row.id : crypto.randomUUID();
        byId.set(key, row);
      }

      const result = await importTodosLocal([...byId.values()]);

      if (result.error) {
        setError(result.error);
        return;
      }

      setMessage(`Imported ${result.imported} task${result.imported === 1 ? "" : "s"}${result.skipped ? `, skipped ${result.skipped} duplicate/empty` : ""}.`);
      setPayload(null);
      setFileName("");
      if (inputRef.current) {
        inputRef.current.value = "";
      }
      window.dispatchEvent(new Event("Scrum Master:sync"));
    } catch {
      setError("Could not import data. Try again.");
    } finally {
      setBusy(false);
    }
  }

  const count = payload ? (payload.home?.length ?? 0) + (payload.team?.length ?? 0) : 0;

  return (
    <div className="import-data">
      <input
        ref={inputRef}
        type="file"
        accept="application/json,.json"
        className="import-file-input"
        onChange={(event) => void onFile(event)}
        aria-label="Choose export file"
      />

      <button
        type="button"
        className="btn-small import-trigger"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
      >
        <Icon name="plus" />
        Import data (JSON)
      </button>

      {payload ? (
        <div className="import-review">
          <p className="import-file-name">{fileName}</p>
          <p className="field-hint">
            {count} task{count === 1 ? "" : "s"} found
            {payload.exported_at ? ` · exported ${payload.exported_at.slice(0, 10)}` : ""}
          </p>
          <div className="import-actions">
            <button type="button" className="btn-small" onClick={() => void doImport()} disabled={busy}>
              {busy ? "Importing…" : "Import tasks"}
            </button>
            <button type="button" className="btn-ghost btn-small" onClick={reset} disabled={busy}>
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      {error ? <p className="auth-error" role="alert">{error}</p> : null}
      {message ? <p className="field-hint" role="status">{message}</p> : null}
    </div>
  );
}
