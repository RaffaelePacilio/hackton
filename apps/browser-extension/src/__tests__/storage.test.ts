// Each test gets a fresh module instance so the in-memory store is clean
// (chrome.storage is unavailable in jsdom; storage.ts falls back to a module-level Map)

import type { InteractionContract } from "../shared/interaction-contract.js";

async function freshStorage() {
  jest.resetModules();
  const storage = await import("../shared/storage.js");
  const ic = await import("../shared/interaction-contract.js");
  return { storage, ic };
}

describe("storage — loadContract / saveContract", () => {
  it("returns a fresh default when storage is empty", async () => {
    const { storage, ic } = await freshStorage();
    const contract = await storage.loadContract();
    expect(contract.version).toBe(ic.INTERACTION_CONTRACT_VERSION);
    expect(contract.contractId).toBeTruthy();
    expect(contract.input.keyboard).toBe("unknown");
    expect(contract.preferences.confirmBeforeAction).toBe(true);
  });

  it("generates a non-empty contractId on fresh load", async () => {
    const { storage } = await freshStorage();
    const contract = await storage.loadContract();
    expect(typeof contract.contractId).toBe("string");
    expect(contract.contractId.length).toBeGreaterThan(0);
  });

  it("round-trips a contract through save and load", async () => {
    const { storage, ic } = await freshStorage();

    const toSave: InteractionContract = {
      ...ic.DEFAULT_CONTRACT,
      contractId: "test-id-001",
      updatedAt: "2026-09-22T00:00:00.000Z",
      input: {
        keyboard: "available",
        pointer: "difficult",
        touch: "unavailable",
        voice: "unknown",
        switch: "unavailable",
      },
      preferences: {
        largeTargets: true,
        linearNavigation: false,
        reducedMotion: true,
        spokenFeedback: true,
        confirmBeforeAction: false,
      },
    };

    await storage.saveContract(toSave);
    const loaded = await storage.loadContract();

    expect(loaded.contractId).toBe("test-id-001");
    expect(loaded.input.keyboard).toBe("available");
    expect(loaded.input.pointer).toBe("difficult");
    expect(loaded.preferences.largeTargets).toBe(true);
    expect(loaded.preferences.reducedMotion).toBe(true);
  });

  it("rejects saveContract when version is wrong", async () => {
    const { storage, ic } = await freshStorage();
    const bad = { ...ic.DEFAULT_CONTRACT, version: "9.9.9" } as unknown as InteractionContract;
    await expect(storage.saveContract(bad)).rejects.toThrow(/Invalid InteractionContract/);
  });

  it("rejects saveContract when input fields have invalid values", async () => {
    const { storage, ic } = await freshStorage();
    const bad = {
      ...ic.DEFAULT_CONTRACT,
      input: { ...ic.DEFAULT_CONTRACT.input, keyboard: "yes" },
    } as unknown as InteractionContract;
    await expect(storage.saveContract(bad)).rejects.toThrow(/Invalid InteractionContract/);
  });

  it("rejects saveContract for null input", async () => {
    const { storage } = await freshStorage();
    await expect(storage.saveContract(null as unknown as InteractionContract)).rejects.toThrow(
      /Invalid InteractionContract/
    );
  });
});
