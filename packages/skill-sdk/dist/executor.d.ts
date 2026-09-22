import type { CapabilityClass, SkillDefinition, SkillInvocation, SkillResult, VerificationResult } from "./types.js";
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
export declare const CONFIRMATION_POLICY: Record<CapabilityClass, "auto" | "auto-verified" | "auto-announce" | "confirm" | "confirm-always" | "prohibited-unless-rollback-confirmed">;
interface HandlerOutcome {
    output?: Record<string, unknown>;
    rollback?: () => Promise<void>;
}
/**
 * Performs the actual effect of a skill. Injected by the caller (e.g. the Form Agent) so this
 * package never touches the DOM directly. Per ADR-008/AGENT-008: do not implement actual DOM
 * interaction inside this package — that behavior is supplied here by the caller.
 */
export type SkillHandler = (invocation: SkillInvocation, skillDef: SkillDefinition) => Promise<HandlerOutcome>;
/**
 * Performs post-hoc verification of a skill's effect. Injected by the caller — production
 * callers bind this to `@aua/verification-engine` (built in parallel; not a dependency of this
 * package). Uses the FROZEN `VerificationResult` shape from `@aua/contracts`.
 */
export type Verifier = (skillDef: SkillDefinition, invocation: SkillInvocation, output: Record<string, unknown> | undefined) => Promise<VerificationResult>;
type ConfirmFn = (skillDef: SkillDefinition, invocation: SkillInvocation) => Promise<boolean>;
export declare class SkillExecutor {
    private readonly handlers;
    private readonly verifier?;
    private readonly confirm?;
    constructor(opts: {
        handlers: Map<string, SkillHandler>;
        verifier?: Verifier;
        confirm?: ConfirmFn;
    });
    execute(invocation: SkillInvocation): Promise<SkillResult>;
}
export {};
//# sourceMappingURL=executor.d.ts.map