import { describe, expect, it } from "vitest";
import type { InteractionContract } from "@aua/contracts";
import { deriveAvailableCapabilities } from "../capability-mapping.js";

function makeContract(overrides: Partial<InteractionContract> = {}): InteractionContract {
  return {
    version: "1.0.0",
    contractId: "contract-1",
    updatedAt: "2026-09-22T00:00:00.000Z",
    input: {
      keyboard: "unavailable",
      pointer: "unavailable",
      touch: "unavailable",
      voice: "unavailable",
      switch: "unavailable",
    },
    actions: {
      drag: "unavailable",
      precisionTargeting: "unavailable",
      complexShortcuts: "unavailable",
    },
    perception: {
      smallText: "unavailable",
    },
    preferences: {
      largeTargets: false,
      linearNavigation: false,
      reducedMotion: false,
      spokenFeedback: false,
    },
    ...overrides,
  };
}

describe("deriveAvailableCapabilities", () => {
  it("includes 'pointer' when input.pointer is 'available'", () => {
    const contract = makeContract({
      input: {
        keyboard: "unavailable",
        pointer: "available",
        touch: "unavailable",
        voice: "unavailable",
        switch: "unavailable",
      },
    });

    expect(deriveAvailableCapabilities(contract)).toContain("pointer");
  });

  it("does NOT include 'pointer' when input.pointer is 'difficult'", () => {
    const contract = makeContract({
      input: {
        keyboard: "unavailable",
        pointer: "difficult",
        touch: "unavailable",
        voice: "unavailable",
        switch: "unavailable",
      },
    });

    expect(deriveAvailableCapabilities(contract)).not.toContain("pointer");
  });

  it("does NOT include 'pointer' when input.pointer is 'unknown' — conservative default per ADR-004", () => {
    const contract = makeContract({
      input: {
        keyboard: "unavailable",
        pointer: "unknown",
        touch: "unavailable",
        voice: "unavailable",
        switch: "unavailable",
      },
    });

    expect(deriveAvailableCapabilities(contract)).not.toContain("pointer");
  });

  it("returns an empty list when every field is 'unavailable'", () => {
    const contract = makeContract();

    expect(deriveAvailableCapabilities(contract)).toEqual([]);
  });

  it("derives 'hover' from pointer availability, not a dedicated field", () => {
    const available = makeContract({
      input: {
        keyboard: "unavailable",
        pointer: "available",
        touch: "unavailable",
        voice: "unavailable",
        switch: "unavailable",
      },
    });
    const unavailable = makeContract();

    expect(deriveAvailableCapabilities(available)).toContain("hover");
    expect(deriveAvailableCapabilities(unavailable)).not.toContain("hover");
  });

  it("maps every field that IS 'available' to its capability tag", () => {
    const contract = makeContract({
      input: {
        keyboard: "available",
        pointer: "available",
        touch: "available",
        voice: "available",
        switch: "available",
      },
      actions: {
        drag: "available",
        precisionTargeting: "available",
        complexShortcuts: "available",
      },
    });

    const result = deriveAvailableCapabilities(contract);

    expect(result).toEqual(
      expect.arrayContaining([
        "keyboard",
        "pointer",
        "touch",
        "voice",
        "switch",
        "drag",
        "precision-targeting",
        "complex-shortcuts",
        "hover",
      ]),
    );
  });
});
