import { describe, expect, it } from "vitest";
import type { AdaptationPlan, Barrier, UserIntent } from "@aua/contracts";
import { BrowserOrchestrator } from "../orchestrator.js";
import { StubProvider } from "../providers/stub-provider.js";
import type { ReasoningProvider, RedactedSemanticSlice } from "../reasoning-provider.js";

const context: RedactedSemanticSlice = {
  elements: [
    { id: "el-1", role: "textbox", accessibleName: "Email", visible: true, sensitive: false },
  ],
};

function makeBarrier(overrides: Partial<Barrier> = {}): Barrier {
  return {
    barrierId: "barrier-1",
    elementId: "el-1",
    requiredCapabilities: ["pointer"],
    availableCapabilities: [],
    severity: "blocking",
    confidence: 0.9,
    determinedBy: "inference",
    ...overrides,
  };
}

/** Hand-rolled provider that always rejects — exercises the catch path. */
class FailingProvider implements ReasoningProvider {
  readonly name = "failing";
  async planAdaptation(): Promise<AdaptationPlan> {
    throw new Error("boom");
  }
  async resolveIntent(): Promise<UserIntent> {
    throw new Error("boom");
  }
  async healthCheck(): Promise<boolean> {
    return false;
  }
}

describe("BrowserOrchestrator.resolveBarrier", () => {
  it("returns a decline decision with no modelProvider when the provider throws", async () => {
    const orchestrator = new BrowserOrchestrator(new FailingProvider());
    const barrier = makeBarrier();

    const decision = await orchestrator.resolveBarrier(barrier, context, ["skill-a"], "run-1");

    expect(decision.output).toEqual({ action: "decline", reason: "boom" });
    expect(decision.modelProvider).toBeUndefined();
    expect(decision.input).toEqual({ barrier });
    expect(decision.latencyMs).toBeGreaterThanOrEqual(0);
  });

  it("declines when the provider selects an unregistered skill", async () => {
    const barrier = makeBarrier();
    const plan: AdaptationPlan = {
      planId: "plan-1",
      barrierId: barrier.barrierId,
      chosenSkillId: "skill-not-registered",
      rationale: "because",
      determinedBy: "inference",
    };
    const provider = new StubProvider(new Map([[barrier.barrierId, plan]]));
    const orchestrator = new BrowserOrchestrator(provider);

    const decision = await orchestrator.resolveBarrier(barrier, context, ["skill-a"], "run-1");

    expect(decision.output).toEqual({
      action: "decline",
      reason: 'provider selected unregistered skill "skill-not-registered"',
    });
    expect(decision.modelProvider).toBe("stub");
  });

  it("returns the plan when the provider selects a registered skill", async () => {
    const barrier = makeBarrier();
    const plan: AdaptationPlan = {
      planId: "plan-2",
      barrierId: barrier.barrierId,
      chosenSkillId: "skill-a",
      rationale: "because",
      determinedBy: "inference",
    };
    const provider = new StubProvider(new Map([[barrier.barrierId, plan]]));
    const orchestrator = new BrowserOrchestrator(provider);

    const decision = await orchestrator.resolveBarrier(barrier, context, ["skill-a"], "run-1");

    expect(decision.output).toEqual(plan);
    expect(decision.modelProvider).toBe("stub");
    expect(decision.latencyMs).toBeGreaterThanOrEqual(0);
    expect(decision.agentRunId).toBe("run-1");
  });

  it("throws no-stub-response for an unmapped barrierId, which the orchestrator turns into a decline", async () => {
    const barrier = makeBarrier({ barrierId: "unmapped-barrier" });
    const provider = new StubProvider(new Map());
    const orchestrator = new BrowserOrchestrator(provider);

    const decision = await orchestrator.resolveBarrier(barrier, context, ["skill-a"], "run-1");

    expect(decision.output).toEqual({ action: "decline", reason: "no-stub-response" });
  });
});

describe("BrowserOrchestrator.resolveIntent", () => {
  it("returns the resolved intent on success", async () => {
    const provider = new StubProvider(new Map());
    const orchestrator = new BrowserOrchestrator(provider);

    const result = await orchestrator.resolveIntent("read the page", context);

    expect(result.intent).toEqual({
      intentId: expect.any(String),
      intent: "describe-page",
      confidence: 1,
    });
    expect(result.modelProvider).toBe("stub");
    expect(result.error).toBeUndefined();
    expect(result.latencyMs).toBeGreaterThanOrEqual(0);
  });

  it("returns intent: null and an error message when the provider throws", async () => {
    const orchestrator = new BrowserOrchestrator(new FailingProvider());

    const result = await orchestrator.resolveIntent("read the page", context);

    expect(result.intent).toBeNull();
    expect(result.error).toBe("boom");
    expect(result.modelProvider).toBeUndefined();
    expect(result.latencyMs).toBeGreaterThanOrEqual(0);
  });
});
