import { describe, it, expect } from "vitest";
import { list, get } from "../../src/loader.js";
import type { CapabilityClass } from "../../src/types.js";

const HIGH_RISK: Set<CapabilityClass> = new Set([
  "AUTHENTICATE",
  "PAYMENT",
  "DESTRUCTIVE",
]);

describe("ADR-014 capability-class policy", () => {
  it("no AUTHENTICATE/PAYMENT/DESTRUCTIVE skill has rollback not-applicable", () => {
    for (const skill of list()) {
      if (HIGH_RISK.has(skill.securityClassification)) {
        expect(
          skill.rollback,
          `${skill.id} has high-risk classification but rollback is "not-applicable"`
        ).not.toBe("not-applicable");
      }
    }
  });

  it("all permissions arrays are non-empty", () => {
    for (const skill of list()) {
      expect(
        skill.permissions.length,
        `${skill.id}.permissions is empty`
      ).toBeGreaterThan(0);
    }
  });

  it("fill_field is classified WRITE_PERSONAL_DATA", () => {
    const skill = get("fill_field");
    expect(skill?.securityClassification).toBe("WRITE_PERSONAL_DATA");
  });

  it("fill_field has rollback supported", () => {
    const skill = get("fill_field");
    expect(skill?.rollback).toBe("supported");
  });

  it("all verify_* skills are classified READ", () => {
    for (const skill of list()) {
      if (skill.id.startsWith("verify_")) {
        expect(
          skill.securityClassification,
          `${skill.id} should be READ`
        ).toBe("READ");
      }
    }
  });

  it("all read_* skills are classified READ", () => {
    for (const skill of list()) {
      if (skill.id.startsWith("read_")) {
        expect(
          skill.securityClassification,
          `${skill.id} should be READ`
        ).toBe("READ");
      }
    }
  });

  it("all inject_* skills have rollback supported", () => {
    for (const skill of list()) {
      if (skill.id.startsWith("inject_")) {
        expect(
          skill.rollback,
          `${skill.id}.rollback should be "supported"`
        ).toBe("supported");
      }
    }
  });

  it("focus_semantic_field and restore_focus are classified FOCUS", () => {
    for (const id of ["focus_semantic_field", "restore_focus"] as const) {
      expect(get(id)?.securityClassification).toBe("FOCUS");
    }
  });

  it("navigate_to_intent is classified NAVIGATE", () => {
    expect(get("navigate_to_intent")?.securityClassification).toBe("NAVIGATE");
  });

  it("securityClassification is always in the permissions array", () => {
    for (const skill of list()) {
      expect(
        skill.permissions,
        `${skill.id}: securityClassification not listed in permissions`
      ).toContain(skill.securityClassification);
    }
  });
});
