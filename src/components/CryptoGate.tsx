"use client";

/**
 * Encryption bootstrap — non-blocking.
 *
 * The app renders immediately after sign-in. Key restoration, the org-key
 * handshake and the first sync all happen in the background from this device's
 * stored key package. If the keys cannot be restored (offline first launch,
 * pending org grant, ...) we show a small dismissible notice instead of a
 * second sign-in screen — the shell and all local/offline features stay usable.
 */
import { useEffect, useRef, useState, type ReactNode } from "react";

import { fetchMaterial, provisionAndUnlock, restoreFromDevice, unlockWithPassword } from "@/lib/keys";
import { initSync, pullSprints, startSync, syncNow } from "@/lib/sync";

interface GateUser {
  id: string;
  email: string;
  name: string;
  isOwner: boolean;
  inOrg: boolean;
  hasPassword: boolean;
}

export function CryptoGate({ user, children }: { user: GateUser; children: ReactNode }) {
  const [notice, setNotice] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const startedRef = useRef(false);
  const ctx = { isOwner: user.isOwner, inOrg: user.inOrg };

  useEffect(() => {
    if (startedRef.current) {
      return;
    }
    startedRef.current = true;

    if (user.id !== "guest") {
      try {
        document.cookie = "scrum-guest=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
        localStorage.removeItem("scrum-guest");
      } catch {
        // ignore
      }
    }

    initSync({ id: user.id, name: user.name, isOwner: user.isOwner, inOrg: user.inOrg });
    startSync();
    void pullSprints();

    void (async () => {
      try {
        if (await restoreFromDevice(ctx)) {
          setNotice(null);
          void syncNow();
          return;
        }
      } catch (err) {
        if (err instanceof Error && err.message === "WAITING") {
          setNotice("Waiting for the organization key. Your tasks will appear once it arrives.");
          return;
        }
      }

      // A password handed over by the login form lets us finish the unlock
      // transparently — no second prompt, no reload loop. It is read once and
      // removed immediately.
      let pendingPassword: string | null = null;

      try {
        pendingPassword = sessionStorage.getItem("scrum-master.pending-unlock");
        sessionStorage.removeItem("scrum-master.pending-unlock");
      } catch {
        // ignore
      }

      if (pendingPassword) {
        try {
          const fetched = await fetchMaterial();
          const result = fetched.material?.salt
            ? await unlockWithPassword(pendingPassword, ctx)
            : await provisionAndUnlock(pendingPassword, ctx);

          if (!result.error || result.waiting) {
            setNotice(result.waiting ? "Waiting for the organization key." : null);
            void syncNow();
            return;
          }
        } catch {
          // Fall through to the non-blocking notice below.
        }
      }

      setNotice(
        "Your encrypted tasks could not be unlocked on this device. Sign out and sign in again to restore access.",
      );
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id, user.name, user.isOwner, user.inOrg]);

  return (
    <>
      {notice && !dismissed ? (
        <div className="gate-notice" role="status">
          <span>{notice}</span>
          <button type="button" aria-label="Dismiss" onClick={() => setDismissed(true)}>
            ×
          </button>
        </div>
      ) : null}
      {children}
    </>
  );
}
