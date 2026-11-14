import { afterEach, describe, expect, it, vi } from "vitest";

describe("connectivity", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("detects desktop client by hostname", async () => {
    vi.stubGlobal("window", { location: { hostname: "127.0.0.1" } });
    const { isDesktopClient } = await import("@/lib/connectivity");
    expect(isDesktopClient()).toBe(true);

    vi.stubGlobal("window", { location: { hostname: "localhost" } });
    const mod2 = await import("@/lib/connectivity");
    expect(mod2.isDesktopClient()).toBe(true);

    vi.stubGlobal("window", { location: { hostname: "scrum-master-two.vercel.app" } });
    const mod3 = await import("@/lib/connectivity");
    expect(mod3.isDesktopClient()).toBe(false);
  });

  it("returns navigator.onLine on web", async () => {
    vi.stubGlobal("window", { location: { hostname: "example.com" } });
    vi.stubGlobal("navigator", { onLine: false });
    const { checkOnline } = await import("@/lib/connectivity");
    await expect(checkOnline()).resolves.toBe(false);
  });
});
