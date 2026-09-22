import { describe, it, expect } from "vitest";
import { SKILL_REGISTRY, get, list } from "../../src/loader.js";

const EXPECTED_IDS = [
  "focus_semantic_field",
  "fill_field",
  "read_element",
  "read_region",
  "read_errors",
  "navigate_to_intent",
  "restore_focus",
  "inject_field_proxy",
  "inject_stepper",
  "inject_choice_list",
  "inject_command_palette",
  "inject_route_navigation",
  "replace_drag",
  "replace_hover",
  "increase_target_size",
  "simplify_interaction",
  "announce",
  "listen",
  "speak",
  "verify_field_value",
  "verify_action_result",
  "verify_navigation",
] as const;

describe("SKILL_REGISTRY", () => {
  it("is a ReadonlyMap", () => {
    expect(SKILL_REGISTRY).toBeInstanceOf(Map);
  });

  it("contains exactly 22 entries", () => {
    expect(SKILL_REGISTRY.size).toBe(22);
  });

  it("has all 22 expected skill IDs", () => {
    for (const id of EXPECTED_IDS) {
      expect(SKILL_REGISTRY.has(id), `Missing skill id: ${id}`).toBe(true);
    }
  });

  it("registry keys match each entry's id field", () => {
    for (const [key, skill] of SKILL_REGISTRY) {
      expect(key).toBe(skill.id);
    }
  });
});

describe("get()", () => {
  it("returns the correct skill for a known id", () => {
    const skill = get("fill_field");
    expect(skill).toBeDefined();
    expect(skill!.id).toBe("fill_field");
  });

  it("returns undefined for an unknown id", () => {
    expect(get("nonexistent_skill")).toBeUndefined();
  });

  it("returns a skill with a valid semver version", () => {
    for (const id of EXPECTED_IDS) {
      const skill = get(id);
      expect(skill?.version).toMatch(/^\d+\.\d+\.\d+$/);
    }
  });
});

describe("list()", () => {
  it("returns an array of length 22", () => {
    expect(list()).toHaveLength(22);
  });

  it("returns a new array on each call (mutation safety)", () => {
    const a = list();
    const b = list();
    expect(a).not.toBe(b);
  });

  it("contains no duplicate ids", () => {
    const ids = list().map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
