import { describe, it, expect, vi } from "vitest";
import { SkillExecutor } from "../../src/executor.js";
import { get } from "../../src/loader.js";
import type {
  CapabilityClass,
  SkillDefinition,
  SkillInvocation,
  VerificationResult,
} from "../../src/types.js";

const FILL_FIELD = get("fill_field")!;
const VERIFY_FIELD_VALUE = get("verify_field_value")!;

function fillFieldInvocation(
  overrides: Partial<SkillInvocation> = {}
): SkillInvocation {
  return {
    invocationId: "inv-1",
    skillId: "fill_field",
    skillVersion: FILL_FIELD.version,
    inputs: { elementId: "el-1", value: "hello" },
    requestedBy: "agent",
    interactionId: "interaction-1",
    ...overrides,
  };
}

function verifyFieldValueInvocation(
  overrides: Partial<SkillInvocation> = {}
): SkillInvocation {
  return {
    invocationId: "inv-2",
    skillId: "verify_field_value",
    skillVersion: VERIFY_FIELD_VALUE.version,
    inputs: { elementId: "el-1", expectedValue: "hello" },
    requestedBy: "agent",
    interactionId: "interaction-1",
    ...overrides,
  };
}

const ALL_CLASSES: ReadonlySet<CapabilityClass> = new Set([
  "READ",
  "FOCUS",
  "NAVIGATE",
  "WRITE_LOW_RISK",
  "WRITE_PERSONAL_DATA",
  "SUBMIT",
  "AUTHENTICATE",
  "PAYMENT",
  "DESTRUCTIVE",
]);

describe("SkillExecutor.validate", () => {
  it("rejects an unknown skillId", () => {
    const executor = new SkillExecutor(ALL_CLASSES, async () => ({}));
    const result = executor.validate(
      fillFieldInvocation({ skillId: "nonexistent_skill" })
    );
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("unknown skillId"))).toBe(
      true
    );
  });

  it("rejects a version mismatch", () => {
    const executor = new SkillExecutor(ALL_CLASSES, async () => ({}));
    const result = executor.validate(
      fillFieldInvocation({ skillVersion: "999.0.0" })
    );
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("version mismatch"))).toBe(
      true
    );
  });

  it("rejects a capability class not in allowedClasses", () => {
    const executor = new SkillExecutor(
      new Set<CapabilityClass>(["READ"]),
      async () => ({})
    );
    const result = executor.validate(fillFieldInvocation());
    expect(result.valid).toBe(false);
    expect(
      result.errors.some((e) => e.includes("capability class not allowed"))
    ).toBe(true);
  });

  it("rejects inputs missing a required field per the skill's inputSchema", () => {
    const executor = new SkillExecutor(ALL_CLASSES, async () => ({}));
    const result = executor.validate(
      fillFieldInvocation({ inputs: { elementId: "el-1" } })
    );
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.startsWith("input schema:"))).toBe(
      true
    );
  });

  it("accepts a valid invocation", () => {
    const executor = new SkillExecutor(ALL_CLASSES, async () => ({}));
    const result = executor.validate(fillFieldInvocation());
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });
});

describe("SkillExecutor.execute — hard rejections (ADR-008)", () => {
  it("unknown skillId -> failed / FRAMEWORK_BLOCKED / framework-blocked", async () => {
    const performSkill = vi.fn();
    const executor = new SkillExecutor(ALL_CLASSES, performSkill);
    const result = await executor.execute(
      fillFieldInvocation({ skillId: "nonexistent_skill" })
    );
    expect(result.status).toBe("failed");
    expect(result.errorCode).toBe("FRAMEWORK_BLOCKED");
    expect(result.verification?.failureClass).toBe("framework-blocked");
    expect(result.verification?.verified).toBe(false);
    expect(performSkill).not.toHaveBeenCalled();
  });

  it("version mismatch -> failed / FRAMEWORK_BLOCKED / framework-blocked", async () => {
    const performSkill = vi.fn();
    const executor = new SkillExecutor(ALL_CLASSES, performSkill);
    const result = await executor.execute(
      fillFieldInvocation({ skillVersion: "0.0.1" })
    );
    expect(result.status).toBe("failed");
    expect(result.errorCode).toBe("FRAMEWORK_BLOCKED");
    expect(result.verification?.failureClass).toBe("framework-blocked");
    expect(performSkill).not.toHaveBeenCalled();
  });

  it("valid invocation but capability class not allowed -> framework-blocked (fill_field requires WRITE_PERSONAL_DATA, only READ allowed)", async () => {
    const performSkill = vi.fn();
    const executor = new SkillExecutor(
      new Set<CapabilityClass>(["READ"]),
      performSkill
    );
    const result = await executor.execute(fillFieldInvocation());
    expect(result.status).toBe("failed");
    expect(result.errorCode).toBe("FRAMEWORK_BLOCKED");
    expect(result.verification?.failureClass).toBe("framework-blocked");
    expect(performSkill).not.toHaveBeenCalled();
  });

  it("invalid inputs (missing required 'value') -> framework-blocked with an input-schema error message", async () => {
    const performSkill = vi.fn();
    const executor = new SkillExecutor(ALL_CLASSES, performSkill);
    const result = await executor.execute(
      fillFieldInvocation({ inputs: { elementId: "el-1" } })
    );
    expect(result.status).toBe("failed");
    expect(result.errorCode).toBe("FRAMEWORK_BLOCKED");
    expect(result.verification?.failureClass).toBe("framework-blocked");

    const validation = executor.validate(
      fillFieldInvocation({ inputs: { elementId: "el-1" } })
    );
    expect(
      validation.errors.some(
        (e) => e.startsWith("input schema:") && e.includes("value")
      )
    ).toBe(true);
    expect(performSkill).not.toHaveBeenCalled();
  });
});

describe("SkillExecutor.execute — happy paths and verification", () => {
  it("valid invocation, performSkill resolves success, no verify injected -> success", async () => {
    const executor = new SkillExecutor(ALL_CLASSES, async () => ({
      output: { filled: true },
    }));
    const result = await executor.execute(fillFieldInvocation());
    expect(result.status).toBe("success");
    expect(result.output).toEqual({ filled: true });
    expect(result.verification).toBeUndefined();
  });

  it("valid invocation, verify injected and returns verified: false -> failed", async () => {
    const verify = async (): Promise<VerificationResult> => ({
      invocationId: "inv-1",
      verified: false,
      method: "dom-read",
      observedValue: "wrong",
      expectedValue: "hello",
      failureClass: "mismatch",
    });
    const executor = new SkillExecutor(
      ALL_CLASSES,
      async () => ({ output: { filled: true } }),
      verify
    );
    const result = await executor.execute(fillFieldInvocation());
    expect(result.status).toBe("failed");
    expect(result.verification?.verified).toBe(false);
    expect(result.verification?.failureClass).toBe("mismatch");
  });

  it("valid invocation, verify injected and returns verified: true -> success", async () => {
    const verify = async (): Promise<VerificationResult> => ({
      invocationId: "inv-1",
      verified: true,
      method: "dom-read",
      observedValue: "hello",
      expectedValue: "hello",
    });
    const executor = new SkillExecutor(
      ALL_CLASSES,
      async () => ({ output: { filled: true } }),
      verify
    );
    const result = await executor.execute(fillFieldInvocation());
    expect(result.status).toBe("success");
    expect(result.verification?.verified).toBe(true);
  });

  it("performSkill throws -> failed / EXECUTION_ERROR", async () => {
    const executor = new SkillExecutor(ALL_CLASSES, async () => {
      throw new Error("boom");
    });
    const result = await executor.execute(fillFieldInvocation());
    expect(result.status).toBe("failed");
    expect(result.errorCode).toBe("EXECUTION_ERROR");
  });

  it("performSkill resolves an errorCode -> failed with that errorCode, no verify called", async () => {
    const verify = vi.fn();
    const executor = new SkillExecutor(
      ALL_CLASSES,
      async () => ({ errorCode: "ELEMENT_NOT_FOUND" }),
      verify
    );
    const result = await executor.execute(fillFieldInvocation());
    expect(result.status).toBe("failed");
    expect(result.errorCode).toBe("ELEMENT_NOT_FOUND");
    expect(verify).not.toHaveBeenCalled();
  });

  it("works end-to-end with a READ-classified skill (verify_field_value)", async () => {
    const executor = new SkillExecutor(
      new Set<CapabilityClass>(["READ"]),
      async () => ({ output: { verified: true, observedValue: "hello" } })
    );
    const result = await executor.execute(verifyFieldValueInvocation());
    expect(result.status).toBe("success");
    expect(result.output).toEqual({ verified: true, observedValue: "hello" });
  });

  it("if verify throws, treated as timeout failure", async () => {
    const executor = new SkillExecutor(
      ALL_CLASSES,
      async () => ({ output: { filled: true } }),
      async () => {
        throw new Error("verification backend unreachable");
      }
    );
    const result = await executor.execute(fillFieldInvocation());
    expect(result.status).toBe("failed");
    expect(result.verification?.verified).toBe(false);
    expect(result.verification?.failureClass).toBe("timeout");
  });
});

describe("SkillExecutor — SkillDefinition passed to callbacks", () => {
  it("passes the resolved SkillDefinition (not just the invocation) to performSkill", async () => {
    let received: SkillDefinition | undefined;
    const executor = new SkillExecutor(ALL_CLASSES, async (def) => {
      received = def;
      return { output: {} };
    });
    await executor.execute(fillFieldInvocation());
    expect(received?.id).toBe("fill_field");
    expect(received?.securityClassification).toBe("WRITE_PERSONAL_DATA");
  });
});
