"use client";

import { useState } from "react";

import { completeRegistration } from "@/app/actions/auth";
import { AuthLoading } from "@/components/AuthLoading";

export function RegisterTypeForm() {
  const [type, setType] = useState<"personal" | "organization">("personal");

  return (
    <form action={completeRegistration} className="auth-form">
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
          Personal keeps a private task list. Organization lets you add members and see the
          tasks they share with the organization.
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
          />
          <span className="field-hint">Only used for organization accounts.</span>
        </label>
      ) : null}

      <AuthLoading />

      <button className="btn-primary" type="submit">
        Create account
      </button>
    </form>
  );
}
