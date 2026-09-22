// Skill Executor (WP-010).
//
// ADR-008: capability-class gating and the confirmation policy are enforced here, in the
// Executor — not in the Adaptation Planner. The Planner may *request* any skill; only the
// Executor can *run* one, and it independently re-validates the skill's declared
// `securityClassification` against the binding confirmation-policy table
// (aua/docs/contracts/skill-contract.md), regardless of what the Planner claims.
//
// ADR-014 / Section 3.7, 22: this package never falls back to arbitrary/generated DOM code.
// An unknown skillId, invalid inputs, a missing handler, or a policy violation are all hard
// rejections. Actual DOM interaction (SkillHandler) and actual post-hoc verification (Verifier)
// are injected dependencies so this package stays decoupled from the Form Agent (which owns the
// DOM) and from @aua/verification-engine (built in parallel by another package). This module
// must never import DOM types (`Element`, `document`, etc.).

import Ajv from "ajv";

import { get } from "./loader.js";
import type {
  CapabilityClass,
  SkillDefinition,
  SkillInvocation,
  SkillResult,
  VerificationResult,
} from "./types.js";

/**
 * Binding confirmation policy — aua/docs/contracts/skill-contract.md, "Confirmation policy"
 * table. Enforced in `SkillExecutor.execute`, independent of what the Adaptation Planner claims
 * (ADR-008).
 *
 * - `"auto"`                                   READ, FOCUS, NAVIGATE — automatic.
 * - `"auto-verified"`                          WRITE_LOW_RISK — automatic, always verified
 *                                               post-hoc.
 * - `"auto-announce"`                          WRITE_PERSONAL_DATA — automatic with a
 *                                               visible/audible pre-announcement (the
 *                                               announcement itself is a caller concern, e.g. an
 *                                               `announce` skill invoked upstream of this one);
 *                                               the user may additionally configure
 *                                               `confirmBeforeAction: true` outside this package.
 * - `"confirm"`                                SUBMIT — confirmation required by default.
 * - `"confirm-always"`                         AUTHENTICATE, PAYMENT — explicit confirmation
 *                                               every time; this executor never memoizes a
 *                                               "remember my choice" decision across calls.
 * - `"prohibited-unless-rollback-confirmed"`   DESTRUCTIVE — prohibited unless the target skill
 *                                               declares `rollback: "supported"` AND
 *                                               confirmation is given.
 */
export const CONFIRMATION_POLICY: Record<
  CapabilityClass,
  | "auto"
  | "auto-verified"
  | "auto-announce"
  | "confirm"
  | "confirm-always"
  | "prohibited-unless-rollback-confirmed"
> = {
  READ: "auto",
  FOCUS: "auto",
  NAVIGATE: "auto",
  WRITE_LOW_RISK: "auto-verified",
  WRITE_PERSONAL_DATA: "auto-announce",
  SUBMIT: "confirm",
  AUTHENTICATE: "confirm-always",
  PAYMENT: "confirm-always",
  DESTRUCTIVE: "prohibited-unless-rollback-confirmed",
};

interface HandlerOutcome {
  output?: Record<string, unknown>;
  rollback?: () => Promise<void>;
}

/**
 * Performs the actual effect of a skill. Injected by the caller (e.g. the Form Agent) so this
 * package never touches the DOM directly. Per ADR-008/AGENT-008: do not implement actual DOM
 * interaction inside this package — that behavior is supplied here by the caller.
 */
export type SkillHandler = (
  invocation: SkillInvocation,
  skillDef: SkillDefinition
) => Promise<HandlerOutcome>;

/**
 * Performs post-hoc verification of a skill's effect. Injected by the caller — production
 * callers bind this to `@aua/verification-engine` (built in parallel; not a dependency of this
 * package). Uses the FROZEN `VerificationResult` shape from `@aua/contracts`.
 */
export type Verifier = (
  skillDef: SkillDefinition,
  invocation: SkillInvocation,
  output: Record<string, unknown> | undefined
) => Promise<VerificationResult>;

type ConfirmFn = (
  skillDef: SkillDefinition,
  invocation: SkillInvocation
) => Promise<boolean>;

const ajv = new Ajv({ allErrors: true, strict: false });

export class SkillExecutor {
  private readonly handlers: Map<string, SkillHandler>;
  private readonly verifier?: Verifier;
  private readonly confirm?: ConfirmFn;

  constructor(opts: {
    handlers: Map<string, SkillHandler>;
    verifier?: Verifier;
    confirm?: ConfirmFn;
  }) {
    this.handlers = opts.handlers;
    this.verifier = opts.verifier;
    this.confirm = opts.confirm;
  }

  async execute(invocation: SkillInvocation): Promise<SkillResult> {
    // 1. Unknown skillId is a hard rejection — never a fallback to generated code (ADR-008).
    const skillDef = get(invocation.skillId);
    if (!skillDef) {
      return {
        invocationId: invocation.invocationId,
        status: "failed",
        errorCode: "UNKNOWN_SKILL",
      };
    }

    // 2. Inputs must conform to the skill's own inputSchema.
    const validateInputs = ajv.compile(skillDef.inputSchema);
    if (!validateInputs(invocation.inputs)) {
      return {
        invocationId: invocation.invocationId,
        status: "failed",
        errorCode: "INVALID_INPUT",
      };
    }

    // 3. Confirmation-policy gating, keyed on the skill's declared securityClassification —
    // never on what the Planner requested (ADR-008).
    const mode = CONFIRMATION_POLICY[skillDef.securityClassification];

    if (mode === "confirm" || mode === "confirm-always") {
      const confirmed = this.confirm
        ? await this.confirm(skillDef, invocation)
        : false;
      if (!confirmed) {
        return {
          invocationId: invocation.invocationId,
          status: "requires-confirmation",
        };
      }
    }

    if (mode === "prohibited-unless-rollback-confirmed") {
      if (skillDef.rollback !== "supported") {
        return {
          invocationId: invocation.invocationId,
          status: "failed",
          errorCode: "PROHIBITED",
        };
      }
      const confirmed = this.confirm
        ? await this.confirm(skillDef, invocation)
        : false;
      if (!confirmed) {
        return {
          invocationId: invocation.invocationId,
          status: "failed",
          errorCode: "PROHIBITED",
        };
      }
    }

    // 4. A known, policy-cleared skill with no bound handler is still a hard rejection — never
    // a fallback.
    const handler = this.handlers.get(invocation.skillId);
    if (!handler) {
      return {
        invocationId: invocation.invocationId,
        status: "failed",
        errorCode: "NO_HANDLER_REGISTERED",
      };
    }

    // 5. Execute the injected handler.
    let handlerResult: HandlerOutcome;
    try {
      handlerResult = await handler(invocation, skillDef);
    } catch {
      return {
        invocationId: invocation.invocationId,
        status: "failed",
        errorCode: "HANDLER_ERROR",
      };
    }

    // 6/7. Verification is opt-in at this layer: it only runs when the skill declares a
    // verificationStrategy AND the caller supplied a Verifier. Per ADR-017, every skill WITH a
    // verificationStrategy SHOULD have a verifier supplied by production callers — this package
    // cannot enforce that from inside itself, since the verifier is an injected dependency
    // (this module stays decoupled from @aua/verification-engine).
    if (skillDef.verificationStrategy && this.verifier) {
      const verification = await this.verifier(
        skillDef,
        invocation,
        handlerResult.output
      );

      if (
        !verification.verified &&
        skillDef.rollback === "supported" &&
        handlerResult.rollback
      ) {
        await handlerResult.rollback();
        return {
          invocationId: invocation.invocationId,
          status: "rolled-back",
          output: handlerResult.output,
          verification,
        };
      }

      return {
        invocationId: invocation.invocationId,
        status: verification.verified ? "success" : "failed",
        output: handlerResult.output,
        verification,
      };
    }

    return {
      invocationId: invocation.invocationId,
      status: "success",
      output: handlerResult.output,
    };
  }
}
