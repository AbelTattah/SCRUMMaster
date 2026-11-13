import { describe, expect, it } from "vitest";

import { avatarUrl, cn, firstParam, initials, isUuid, safeNext, withMessage } from "@/lib/utils";

describe("utils", () => {
  describe("cn", () => {
    it("merges class names", () => {
      expect(cn("foo", "bar")).toBe("foo bar");
      expect(cn("px-2", "px-4")).toBe("px-4");
    });
  });

  describe("firstParam", () => {
    it("returns string value or first array element", () => {
      expect(firstParam("a")).toBe("a");
      expect(firstParam(["a", "b"])).toBe("a");
      expect(firstParam([])).toBe("");
      expect(firstParam(undefined)).toBe("");
    });
  });

  describe("withMessage", () => {
    it("appends notice/error query params", () => {
      expect(withMessage("/", "notice", "Hi")).toBe("/?notice=Hi");
      expect(withMessage("/?a=1", "error", "Bad")).toBe("/?a=1&error=Bad");
      expect(withMessage("/x", "notice", "A B")).toBe("/x?notice=A%20B");
    });
  });

  describe("safeNext", () => {
    it("allows internal paths and rejects external/invalid targets", () => {
      expect(safeNext("/dashboard")).toBe("/dashboard");
      expect(safeNext("/")).toBe("/");
      expect(safeNext(null)).toBe("/");
      expect(safeNext(undefined)).toBe("/");
      expect(safeNext("https://evil.com")).toBe("/");
      expect(safeNext("//evil.com")).toBe("/");
      expect(safeNext("/\\evil.com")).toBe("/");
      expect(safeNext("")).toBe("/");
    });
  });

  describe("isUuid", () => {
    it("validates UUIDs", () => {
      expect(isUuid("123e4567-e89b-12d3-a456-426614174000")).toBe(true);
      expect(isUuid("123E4567-E89B-12D3-A456-426614174000")).toBe(true);
      expect(isUuid("not-a-uuid")).toBe(false);
      expect(isUuid("123e4567-e89b-62d3-a456-426614174000")).toBe(false); // invalid version
      expect(isUuid("")).toBe(false);
    });
  });

  describe("initials", () => {
    it("returns up to two initials", () => {
      expect(initials("Ada Lovelace")).toBe("AL");
      expect(initials("Ada")).toBe("A");
      expect(initials("  ada   byron  king ")).toBe("AB");
      expect(initials("")).toBe("");
    });
  });

  describe("avatarUrl", () => {
    it("returns provided image url when present", () => {
      expect(avatarUrl("https://example.com/a.png", "Ada", "seed")).toBe("https://example.com/a.png");
      expect(avatarUrl("  https://example.com/a.png  ", "Ada", "seed")).toBe("https://example.com/a.png");
    });

    it("returns an initials SVG data url when no image is provided", () => {
      const url = avatarUrl(null, "Ada Lovelace", "user-1");
      expect(url.startsWith("data:image/svg+xml,")).toBe(true);
      const decoded = decodeURIComponent(url.replace("data:image/svg+xml,", ""));
      expect(decoded).toContain(">A<");
      expect(decoded).toContain('fill="#');
    });

    it("is stable for the same seed", () => {
      expect(avatarUrl(null, "Bob", "same-seed")).toBe(avatarUrl(null, "Bob", "same-seed"));
    });
  });
});
