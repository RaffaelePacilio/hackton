import { describe, expect, it } from "vitest";
import type { InteractionContract, SemanticElement, SemanticPageModel } from "@aua/contracts";
import { BarrierDetectionEngine } from "../detector.js";

function makeElement(overrides: Partial<SemanticElement> = {}): SemanticElement {
  return {
    id: "el-1",
    role: "button",
    accessibleName: "Submit",
    requiredCapabilities: ["pointer"],
    visible: true,
    focusable: true,
    geometry: { x: 0, y: 0, width: 100, height: 40 },
    sensitive: false,
    confidence: 0.9,
    provenance: "dom",
    ...overrides,
  };
}

function makeModel(elements: SemanticElement[]): SemanticPageModel {
  return {
    version: "1.0.0",
    page: {
      url: "https://example.com/",
      title: "Example",
      route: "/",
      capturedAt: "2026-09-22T00:00:00.000Z",
    },
    regions: [],
    forms: [],
    navigation: [],
    actions: elements,
    dialogs: [],
    errors: [],
    visibleElements: elements.filter((el) => el.visible).map((el) => el.id),
    modelId: "model-1",
    generation: 1,
  };
}

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

const pointerOnlyContract = makeContract({
  input: {
    keyboard: "unavailable",
    pointer: "available",
    touch: "unavailable",
    voice: "unavailable",
    switch: "unavailable",
  },
});

describe("BarrierDetectionEngine.detect", () => {
  it("produces no barrier when the element's only required capability is available", () => {
    const engine = new BarrierDetectionEngine();
    const model = makeModel([makeElement({ requiredCapabilities: ["pointer"] })]);

    const barriers = engine.detect(model, pointerOnlyContract);

    expect(barriers).toEqual([]);
  });

  it("returns severity 'blocking' when 'drag' is missing and has no substitute, even though pointer is available", () => {
    const engine = new BarrierDetectionEngine();
    const model = makeModel([makeElement({ requiredCapabilities: ["pointer", "drag"] })]);

    const barriers = engine.detect(model, pointerOnlyContract);

    expect(barriers).toHaveLength(1);
    expect(barriers[0].severity).toBe("blocking");
    expect(barriers[0].requiredCapabilities).toEqual(["pointer", "drag"]);
  });

  it("returns severity 'blocking' when 'keyboard' is required and ALL required capabilities are missing", () => {
    const engine = new BarrierDetectionEngine();
    const model = makeModel([makeElement({ requiredCapabilities: ["keyboard"] })]);

    // pointer is available on the user side, but the element doesn't
    // require pointer at all — it requires keyboard, which is unavailable,
    // so 100% of its required capabilities are missing.
    const barriers = engine.detect(model, pointerOnlyContract);

    expect(barriers).toHaveLength(1);
    expect(barriers[0].severity).toBe("blocking");
  });

  it("returns severity 'usability' when a substitutable capability is missing but a partial path exists", () => {
    const engine = new BarrierDetectionEngine();
    const model = makeModel([
      makeElement({ requiredCapabilities: ["pointer", "complex-shortcuts"] }),
    ]);

    const barriers = engine.detect(model, pointerOnlyContract);

    expect(barriers).toHaveLength(1);
    expect(barriers[0].severity).toBe("usability");
  });

  it("returns severity 'unknown' when element confidence is below the minConfidenceForBlocking threshold", () => {
    const engine = new BarrierDetectionEngine();
    const model = makeModel([
      makeElement({ requiredCapabilities: ["pointer", "drag"], confidence: 0.3 }),
    ]);

    const barriers = engine.detect(model, pointerOnlyContract, { minConfidenceForBlocking: 0.5 });

    expect(barriers).toHaveLength(1);
    expect(barriers[0].severity).toBe("unknown");
  });

  it("returns severity 'preference-mismatch' for a fully-capable but undersized element when largeTargets is preferred", () => {
    const engine = new BarrierDetectionEngine();
    const model = makeModel([
      makeElement({
        requiredCapabilities: ["pointer"],
        geometry: { x: 0, y: 0, width: 20, height: 20 },
      }),
    ]);
    const contract = makeContract({
      input: {
        keyboard: "unavailable",
        pointer: "available",
        touch: "unavailable",
        voice: "unavailable",
        switch: "unavailable",
      },
      preferences: {
        largeTargets: true,
        linearNavigation: false,
        reducedMotion: false,
        spokenFeedback: false,
      },
    });

    const barriers = engine.detect(model, contract);

    expect(barriers).toHaveLength(1);
    expect(barriers[0].severity).toBe("preference-mismatch");
  });

  it("produces no barrier for an invisible element even if it has missing required capabilities", () => {
    const engine = new BarrierDetectionEngine();
    const model = makeModel([
      makeElement({ requiredCapabilities: ["pointer", "drag"], visible: false }),
    ]);

    const barriers = engine.detect(model, makeContract());

    expect(barriers).toEqual([]);
  });

  it("returns an empty array when every element on the page is fully satisfied", () => {
    const engine = new BarrierDetectionEngine();
    const model = makeModel([
      makeElement({ id: "el-1", requiredCapabilities: ["pointer"] }),
      makeElement({ id: "el-2", requiredCapabilities: ["keyboard"] }),
    ]);
    const contract = makeContract({
      input: {
        keyboard: "available",
        pointer: "available",
        touch: "unavailable",
        voice: "unavailable",
        switch: "unavailable",
      },
    });

    const barriers = engine.detect(model, contract);

    expect(barriers).toEqual([]);
  });
});
