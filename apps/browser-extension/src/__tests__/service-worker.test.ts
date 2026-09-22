import { ServiceWorkerSession } from "../background/service-worker.js";

// Minimal BackendTransport stub
function makeTransport(available: boolean) {
  return {
    async send() {
      return { type: "degraded-mode", reason: "provider-unavailable" };
    },
    async isAvailable() {
      return available;
    },
  };
}

describe("ServiceWorkerSession", () => {
  it("sets DEGRADED_MODE=true when transport is unavailable", async () => {
    const session = new ServiceWorkerSession(makeTransport(false));
    await session.install();

    // Import the module-level DEGRADED_MODE to verify it was updated
    const mod = await import("../background/service-worker.js");
    expect(mod.DEGRADED_MODE).toBe(true);
  });

  it("sets DEGRADED_MODE=false when transport is available", async () => {
    const session = new ServiceWorkerSession(makeTransport(true));
    await session.install();

    const mod = await import("../background/service-worker.js");
    expect(mod.DEGRADED_MODE).toBe(false);
  });

  it("assigns a non-empty sessionId on construction", () => {
    const session = new ServiceWorkerSession(makeTransport(false));
    expect(typeof session.sessionId).toBe("string");
    expect(session.sessionId.length).toBeGreaterThan(0);
  });

  it("handles AUA_HEALTH_CHECK message without throwing", () => {
    const session = new ServiceWorkerSession(makeTransport(false));
    let response: unknown;
    const sendResponse = (r: unknown) => { response = r; };

    expect(() => {
      session.handleMessage({ type: "AUA_HEALTH_CHECK" }, sendResponse);
    }).not.toThrow();

    expect(response).toHaveProperty("sessionId", session.sessionId);
  });

  it("handles unknown message types without throwing", () => {
    const session = new ServiceWorkerSession(makeTransport(false));
    let response: unknown;
    const sendResponse = (r: unknown) => { response = r; };

    expect(() => {
      session.handleMessage({ type: "SOME_UNKNOWN_TYPE" }, sendResponse);
    }).not.toThrow();

    expect(response).toMatchObject({ error: "unknown-type" });
  });

  it("handles null message gracefully", () => {
    const session = new ServiceWorkerSession(makeTransport(false));
    let response: unknown;
    const sendResponse = (r: unknown) => { response = r; };

    expect(() => {
      session.handleMessage(null, sendResponse);
    }).not.toThrow();

    expect(response).toMatchObject({ error: "invalid-message" });
  });

  it("SW-killed scenario: Bootstrap storage functions work without SW", async () => {
    // This test confirms that storage.ts (used by popup.ts) operates independently
    // of the service worker — the in-memory fallback kicks in when chrome.storage is absent.
    const { loadContract, saveContract } = await import("../shared/storage.js");
    const { DEFAULT_CONTRACT } = await import("../shared/interaction-contract.js");

    const toSave = { ...DEFAULT_CONTRACT, contractId: "sw-killed-test", updatedAt: new Date().toISOString() };
    await expect(saveContract(toSave)).resolves.toBeUndefined();

    const loaded = await loadContract();
    expect(loaded.contractId).toBe("sw-killed-test");
  });
});
