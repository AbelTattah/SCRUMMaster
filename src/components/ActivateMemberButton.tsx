"use client";

/**
 * Team page — hand a waiting member their organization key.
 *
 * The owner's browser wraps the org key (which it holds after unlock) to the
 * member's published public key and stores the grant on their account. The
 * member's waiting screen re-checks every few seconds and enters the app as
 * soon as the grant lands — no re-login needed.
 */
import { useState } from "react";

import { grantOrgKeyToMember } from "@/app/actions/crypto";
import { grantOrgKey } from "@/lib/crypto";
import { keys } from "@/lib/keys";

export function ActivateMemberButton({
  memberId,
  memberName,
  pub,
}: {
  memberId: string;
  memberName: string;
  pub: string;
}) {
  const [state, setState] = useState<"idle" | "working" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  if (state === "done") {
    return (
      <span
        className="member-activate member-activate--done"
        title={`${memberName} can now open the organization's tasks`}
      >
        Activated
      </span>
    );
  }

  return (
    <button
      type="button"
      className={`member-activate${state === "error" ? " is-error" : ""}`}
      disabled={state === "working"}
      title={
        error ??
        `Share the organization key with ${memberName} so they can open tasks`
      }
      onClick={async () => {
        const session = keys();

        if (!session?.orgKey) {
          setError("Unlock your account first.");
          setState("error");
          return;
        }

        setState("working");
        setError(null);

        try {
          const grant = await grantOrgKey(pub, session.orgKey);
          const result = await grantOrgKeyToMember(memberId, grant);

          if (result.error) {
            setError(result.error);
            setState("error");
            return;
          }

          setState("done");
        } catch (err) {
          setError(err instanceof Error ? err.message : "Could not share the key.");
          setState("error");
        }
      }}
    >
      {state === "working" ? "Activating…" : state === "error" ? "Retry" : "Activate"}
    </button>
  );
}
