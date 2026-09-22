import { describe, it, expect, beforeAll } from "vitest";
import Ajv from "ajv";
import { list } from "../../src/loader.js";
import schema from "../../schemas/skill-definition.schema.json";

let validate: ReturnType<Ajv["compile"]>;

beforeAll(() => {
  const ajv = new Ajv({ allErrors: true, strict: false });
  validate = ajv.compile(schema);
});

describe("Registry JSON Schema compliance", () => {
  it("loads exactly 22 skills", () => {
    expect(list()).toHaveLength(22);
  });

  for (const skill of list()) {
    it(`${skill.id} passes SkillDefinition JSON Schema`, () => {
      const valid = validate(skill);
      if (!valid) {
        const errorMessages = (validate.errors ?? [])
          .map((e) => `${e.instancePath || "/"} ${e.message}`)
          .join("; ");
        expect.fail(`${skill.id} schema errors: ${errorMessages}`);
      }
    });
  }

  it("every skill has a non-empty purpose (minLength 10)", () => {
    for (const skill of list()) {
      expect(
        skill.purpose.length,
        `${skill.id}.purpose is too short`
      ).toBeGreaterThanOrEqual(10);
    }
  });

  it("every skill's telemetry.emits entries start with 'aua.skill.'", () => {
    for (const skill of list()) {
      for (const event of skill.telemetry.emits) {
        expect(
          event,
          `${skill.id} emits event without aua.skill. prefix: "${event}"`
        ).toMatch(/^aua\.skill\./);
      }
    }
  });

  it("every skill's errorModel codes are SCREAMING_SNAKE_CASE", () => {
    for (const skill of list()) {
      for (const entry of skill.errorModel) {
        expect(
          entry.code,
          `${skill.id} error code "${entry.code}" is not SCREAMING_SNAKE_CASE`
        ).toMatch(/^[A-Z][A-Z0-9_]*$/);
      }
    }
  });
});
