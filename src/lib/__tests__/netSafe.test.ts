import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({
  isServerOffline: () => process.env.SCRUM_OFFLINE === "1",
}));

describe("netSafe.safeServer", () => {
  const origOffline = process.env.SCRUM_OFFLINE;

  afterEach(() => {
    process.env.SCRUM_OFFLINE = origOffline;
    vi.useRealTimers();
  });

  it("returns fallback immediately when server marked offline", async () => {
    process.env.SCRUM_OFFLINE = "1";
    const { safeServer } = await import("@/lib/netSafe");
    const work = vi.fn(async () => "live");
    const result = await safeServer(work, "fallback", 1000);
    expect(result).toBe("fallback");
    expect(work).not.toHaveBeenCalled();
  });

  it("returns work result when online and fast", async () => {
    delete process.env.SCRUM_OFFLINE;
    const { safeServer } = await import("@/lib/netSafe");
    await expect(safeServer(async () => 42, 0, 1000)).resolves.toBe(42);
  });

  it("returns fallback when work throws", async () => {
    delete process.env.SCRUM_OFFLINE;
    const { safeServer } = await import("@/lib/netSafe");
    const result = await safeServer(async () => {
      throw new Error("boom");
    }, "fb", 1000);
    expect(result).toBe("fb");
  });

  it("returns fallback on timeout", async () => {
    vi.useFakeTimers();
    delete process.env.SCRUM_OFFLINE;
    const { safeServer } = await import("@/lib/netSafe");
    const promise = safeServer(() => new Promise<string>(() => {}), "fb", 50);
    await vi.advanceTimersByTimeAsync(60);
    await expect(promise).resolves.toBe("fb");
  });
});
