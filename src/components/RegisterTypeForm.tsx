"use client";

/**
 * Registration step 2: account type, plus — for accounts created since
 * encryption — the 24-word recovery phrase. The phrase wraps the same key
 * package the password does, so it restores every task if the password is
 * lost. It must be saved (the checkbox) before the account completes.
 */
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";

import { completeRegistration } from "@/app/actions/auth";
import { AuthLoading } from "@/components/AuthLoading";
import { clearMnemonic, createRecoveryBlob, takeMnemonic } from "@/lib/keys";

export function RegisterTypeForm() {
  const router = useRouter();
  const [type, setType] = useState<"personal" | "organization">("personal");
  const [orgName, setOrgName] = useState("");
  const [mnemonic, setMnemonic] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void takeMnemonic().then(setMnemonic);
  }, []);

  async function copyPhrase() {
    if (!mnemonic) {
      return;
    }

    try {
      await navigator.clipboard.writeText(mnemonic);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked — the words are selectable as a fallback.
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();

    if (busy) {
      return;
    }

    if (type === "organization" && (orgName.trim().length < 2 || orgName.trim().length > 80)) {
      setError("Enter an organization name (2–80 characters).");
      return;
    }

    if (mnemonic && !confirmed) {
      setError("Save your recovery phrase first.");
      return;
    }

    setBusy(true);
    setError(null);

    try {
      const data = new FormData();
      data.set("account_type", type);

      if (type === "organization") {
        data.set("org_name", orgName.trim());
      }

      if (mnemonic) {
        const recovery = await createRecoveryBlob(mnemonic);

        if (!recovery) {
          setError("Could not prepare your recovery phrase — go back and sign in again.");
          setBusy(false);
          return;
        }

        data.set("crypto_recovery", recovery);
      }

      const result = await completeRegistration(data);

      if (result.error) {
        setError(result.error);
        setBusy(false);
        return;
      }

      if (mnemonic) {
        await clearMnemonic();
      }

      router.push(result.next);
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
      setBusy(false);
    }
  }

  return (
    <form className="auth-form" onSubmit={submit}>
      <div className="seg-wrap">
        <span className="seg-label" id="account-type-label">
          Account type
        </span>
        <div className="seg" role="radiogroup" aria-labelledby="account-type-label">
          <label>
            <input
              type="radio"
              name="account_type"
              value="personal"
              checked={type === "personal"}
              onChange={() => setType("personal")}
            />
            Personal
          </label>
          <label>
            <input
              type="radio"
              name="account_type"
              value="organization"
              checked={type === "organization"}
              onChange={() => setType("organization")}
            />
            Organization
          </label>
        </div>
        <span className="field-hint">
          Personal keeps a private task list. Organization lets you add members
          and see the tasks they share with the organization.
        </span>
      </div>

      {type === "organization" ? (
        <label className="field">
          <span>Organization name</span>
          <input
            className="input"
            type="text"
            name="org_name"
            placeholder="e.g. Acme Studio"
            maxLength={80}
            required
            value={orgName}
            onChange={(event) => setOrgName(event.target.value)}
          />
          <span className="field-hint">Only used for organization accounts.</span>
        </label>
      ) : null}

      {mnemonic ? (
        <div className="recovery-block">
          <p className="recovery-title">Your recovery phrase</p>
          <p className="field-hint">
            These 24 words restore your tasks if you ever forget your
            password. Save them somewhere safe — we cannot recover them for
            you.
          </p>

          <ol className="recovery-words" aria-label="Recovery phrase">
            {mnemonic.split(" ").map((word, index) => (
              <li key={`${word}-${index}`}>
                <span className="recovery-index">{index + 1}</span>
                {word}
              </li>
            ))}
          </ol>

          <button className="btn-ghost recovery-copy" type="button" onClick={() => void copyPhrase()}>
            {copied ? "Copied" : "Copy phrase"}
          </button>

          <label className="recovery-confirm">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(event) => setConfirmed(event.target.checked)}
            />
            <span>I have saved my recovery phrase.</span>
          </label>
        </div>
      ) : null}

      {error ? (
        <p className="auth-error" role="alert">
          {error}
        </p>
      ) : null}

      <AuthLoading active={busy} />

      <button className="btn-primary" type="submit" disabled={busy}>
        {busy ? "Creating account…" : "Create account"}
      </button>
    </form>
  );
}
