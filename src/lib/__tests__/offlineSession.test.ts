import { describe, expect, it } from "vitest";

import { decodeSession, encodeSession } from "@/lib/offlineSession";
import type { CurrentUser } from "@/lib/types";

function makeUser(): CurrentUser {
  return {
    id: "user-1",
    email: "ada@example.com",
    profile: {
      id: "user-1",
      name: "Ada",
      email: "ada@example.com",
      avatar_url: null,
      organization_id: "org-1",
      scrum_role: "developer",
      notify_browser: false,
      notify_email: false,
      notify_lead_minutes: 30,
      onboarding_complete: true,
      xp: 0,
      created_at: "2026-11-14T00:00:00Z",
      invited_at: null,
    },
    organization: null,
    isOwner: false,
    hasPassword: true,
  } as any;
}

describe("offlineSession encode/decode", () => {
  it("round-trips a session", () => {
    const user = makeUser();
    const encoded = encodeSession(user);
    expect(typeof encoded).toBe("string");
    expect(encoded.length).toBeGreaterThan(10);
    const decoded = decodeSession(encoded);
    expect(decoded?.id).toBe(user.id);
    expect(decoded?.email).toBe(user.email);
    expect(decoded?.profile.name).toBe("Ada");
  });

  it("returns null for invalid or missing data", () => {
    expect(decodeSession(undefined)).toBeNull();
    expect(decodeSession("")).toBeNull();
    expect(decodeSession("not-base64-json")).toBeNull();
  });
});
