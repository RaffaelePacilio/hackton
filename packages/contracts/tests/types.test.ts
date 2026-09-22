/**
 * Compile-time and runtime type correctness tests.
 * @ts-expect-error annotations below assert that invalid assignments are rejected by TypeScript.
 * The file must compile without unexpected TS errors for the suite to pass.
 */
import { describe, it, expect } from "vitest";
import {
  INTERACTION_CONTRACT_VERSION,
  SEMANTIC_MODEL_VERSION,
} from "../src/index.js";
import type {
  InteractionContract,
  AuditEvent,
  AgentDecision,
  AdaptationPlan,
  Barrier,
  UserIntent,
} from "../src/index.js";

describe("exported constants", () => {
  it("INTERACTION_CONTRACT_VERSION is 1.0.0", () => {
    expect(INTERACTION_CONTRACT_VERSION).toBe("1.0.0");
  });

  it("SEMANTIC_MODEL_VERSION is 1.0.0", () => {
    expect(SEMANTIC_MODEL_VERSION).toBe("1.0.0");
  });
});

describe("compile-time type guards (checked by tsc, not at runtime)", () => {
  it("InteractionContract accepts valid shape", () => {
    const contract: InteractionContract = {
      version: "1.0.0",
      contractId: "user-abc",
      updatedAt: "2024-01-01T00:00:00Z",
      input: { keyboard: "available", pointer: "difficult", touch: "unknown", voice: "unavailable", switch: "unknown" },
      actions: { drag: "unavailable", precisionTargeting: "difficult", complexShortcuts: "unavailable" },
      perception: { smallText: "difficult" },
      preferences: { largeTargets: true, linearNavigation: true, reducedMotion: true, spokenFeedback: true },
    };
    expect(contract.version).toBe("1.0.0");
  });

  it("AuditEvent requires redacted field (confirmed by compile check below)", () => {
    const audit: AuditEvent = {
      eventId: "evt-1",
      correlationIds: { sessionId: "s1", pageId: "p1" },
      type: "skill.executed",
      redacted: true,
      timestamp: "2024-01-01T00:00:00Z",
    };
    expect(typeof audit.redacted).toBe("boolean");
  });

  it("AgentDecision output union covers plan / confirm / decline", () => {
    const barrier: Barrier = {
      barrierId: "b-1", elementId: "e-1",
      requiredCapabilities: ["drag"], availableCapabilities: [],
      severity: "blocking", confidence: 0.95, determinedBy: "rule",
    };
    const intent: UserIntent = { intentId: "i-1", intent: "set-value", confidence: 0.9 };
    const plan: AdaptationPlan = {
      planId: "p-1", barrierId: "b-1", chosenSkillId: "inject_stepper",
      rationale: "drag barrier resolved by stepper proxy", determinedBy: "rule",
    };

    const d1: AgentDecision = { decisionId: "d-1", agentRunId: "r-1", input: { barrier, intent }, output: plan, latencyMs: 120 };
    const d2: AgentDecision = { decisionId: "d-2", agentRunId: "r-2", input: {}, output: { action: "decline", reason: "outside registry" }, latencyMs: 5 };
    const d3: AgentDecision = { decisionId: "d-3", agentRunId: "r-3", input: {}, output: { action: "confirm-with-user" }, latencyMs: 2 };

    expect(d1.latencyMs).toBeGreaterThan(0);
    expect(d2.output).toHaveProperty("action", "decline");
    expect(d3.output).toHaveProperty("action", "confirm-with-user");
  });
});

// ── @ts-expect-error compile-time assertions (not executed at runtime) ────────
// These lines must be present for tsc to verify invalid assignments are rejected.
// If any @ts-expect-error annotation is wrong (no error exists), tsc will fail.

/* tslint:disable */
// @ts-expect-error — version must be literal "1.0.0", arbitrary strings are rejected
const _badVersion: InteractionContract["version"] = "2.0.0";

// @ts-expect-error — AuditEvent.redacted is required; omitting it is a type error
const _missingRedacted: AuditEvent = {
  eventId: "x", correlationIds: { sessionId: "s", pageId: "p" },
  type: "t", timestamp: "ts",
};
/* tslint:enable */

void _badVersion;
void _missingRedacted;
