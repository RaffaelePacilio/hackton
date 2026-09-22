import { describe, it, expect } from "vitest";
import { redact } from "../src/redact.js";
import type { SemanticElement, SemanticPageModel } from "../src/semantic-page-model.js";

function makeModel(overrides: Partial<SemanticPageModel> = {}): SemanticPageModel {
  return {
    version: "1.0.0",
    page: { url: "https://example.com", title: "Test", route: "/", capturedAt: "2024-01-01T00:00:00Z" },
    regions: [],
    forms: [],
    navigation: [],
    actions: [],
    dialogs: [],
    errors: [],
    visibleElements: [],
    modelId: "model-1",
    generation: 1,
    ...overrides,
  };
}

function makeElement(overrides: Partial<SemanticElement> = {}): SemanticElement {
  return {
    id: "el-1",
    role: "textbox",
    accessibleName: "Phone number",
    requiredCapabilities: ["keyboard"],
    visible: true,
    focusable: true,
    geometry: { x: 0, y: 0, width: 100, height: 30 },
    sensitive: false,
    confidence: 0.9,
    provenance: "dom",
    ...overrides,
  };
}

describe("redact()", () => {
  // Branch: sensitive === false — state preserved unchanged
  it("leaves non-sensitive elements untouched", () => {
    const el = makeElement({ sensitive: false, state: { value: "hello" } });
    const model = makeModel({ forms: [el] });
    const result = redact(model);
    expect(result.forms[0].state).toEqual({ value: "hello" });
  });

  // Branch: sensitive === true, state undefined
  it("sets hasValue:false when sensitive element has no state", () => {
    const el = makeElement({ sensitive: true, state: undefined });
    const model = makeModel({ forms: [el] });
    const result = redact(model);
    expect(result.forms[0].state).toEqual({ hasValue: false });
  });

  // Branch: sensitive === true, state is empty object {}
  it("sets hasValue:false when sensitive element has empty state", () => {
    const el = makeElement({ sensitive: true, state: {} });
    const model = makeModel({ forms: [el] });
    const result = redact(model);
    expect(result.forms[0].state).toEqual({ hasValue: false });
  });

  // Branch: sensitive === true, state has values
  it("sets hasValue:true and strips all values when sensitive element has populated state", () => {
    const el = makeElement({ sensitive: true, state: { value: "secret", length: 6 } });
    const model = makeModel({ forms: [el] });
    const result = redact(model);
    expect(result.forms[0].state).toEqual({ hasValue: true });
    expect(result.forms[0].state).not.toHaveProperty("value");
    expect(result.forms[0].state).not.toHaveProperty("length");
  });

  // Adversarial: nested object in state (state values are string|number|boolean — nested object
  // isn't in the type, but a runtime bypass attempt might coerce it; the key count still > 0)
  it("adversarial: state with boolean true value still produces hasValue:true", () => {
    const el = makeElement({ sensitive: true, state: { checked: true } });
    const model = makeModel({ forms: [el] });
    const result = redact(model);
    expect(result.forms[0].state).toEqual({ hasValue: true });
  });

  // Adversarial: state already contains a 'hasValue' key — must be recomputed, not copied
  it("adversarial: does not forward an existing hasValue key from original state", () => {
    // If original state had hasValue: false but other real values, result must be hasValue: true
    const el = makeElement({ sensitive: true, state: { hasValue: false, realField: "data" } });
    const model = makeModel({ forms: [el] });
    const result = redact(model);
    // Two keys in original state → Object.keys.length = 2 → hasValue: true
    expect(result.forms[0].state).toEqual({ hasValue: true });
  });

  // Mixed array: only sensitive elements are redacted
  it("only redacts sensitive elements in a mixed array", () => {
    const sensitive = makeElement({ id: "s-1", sensitive: true, state: { value: "secret" } });
    const plain     = makeElement({ id: "p-1", sensitive: false, state: { value: "public" } });
    const model = makeModel({ forms: [sensitive, plain] });
    const result = redact(model);
    expect(result.forms[0].state).toEqual({ hasValue: true });
    expect(result.forms[1].state).toEqual({ value: "public" });
  });

  // All six element arrays are processed
  it("redacts sensitive elements across all six element arrays", () => {
    const el = makeElement({ sensitive: true, state: { pw: "x" } });
    const model = makeModel({
      regions:    [makeElement({ id: "r1", sensitive: true, state: { v: "1" } })],
      forms:      [makeElement({ id: "f1", sensitive: true, state: { v: "2" } })],
      navigation: [makeElement({ id: "n1", sensitive: true, state: { v: "3" } })],
      actions:    [makeElement({ id: "a1", sensitive: true, state: { v: "4" } })],
      dialogs:    [makeElement({ id: "d1", sensitive: true, state: { v: "5" } })],
      errors:     [makeElement({ id: "e1", sensitive: true, state: { v: "6" } })],
    });
    const result = redact(model);
    for (const arr of [result.regions, result.forms, result.navigation, result.actions, result.dialogs, result.errors]) {
      expect(arr[0].state).toEqual({ hasValue: true });
    }
    void el; // suppress unused warning
  });

  // Model metadata must survive redaction unchanged
  it("preserves model metadata (page, visibleElements, modelId, generation) unchanged", () => {
    const model = makeModel({ visibleElements: ["el-1"], modelId: "abc", generation: 42 });
    const result = redact(model);
    expect(result.page).toEqual(model.page);
    expect(result.visibleElements).toEqual(["el-1"]);
    expect(result.modelId).toBe("abc");
    expect(result.generation).toBe(42);
  });
});
