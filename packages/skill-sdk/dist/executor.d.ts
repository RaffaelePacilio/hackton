import type { CapabilityClass, SkillDefinition, SkillInvocation, SkillResult, VerificationResult } from "./types.js";
export interface ValidationResult {
    valid: boolean;
    errors: string[];
}
export type PerformSkill = (def: SkillDefinition, invocation: SkillInvocation) => Promise<{
    output?: Record<string, unknown>;
    errorCode?: string;
}>;
export type VerifySkill = (def: SkillDefinition, invocation: SkillInvocation) => Promise<VerificationResult>;
export declare class SkillExecutor {
    private allowedClasses;
    private performSkill;
    private verify?;
    constructor(allowedClasses: ReadonlySet<CapabilityClass>, performSkill: PerformSkill, verify?: VerifySkill | undefined);
    /**
     * Independently re-validates a requested invocation against the registry
     * (ADR-008): unknown skillId, version mismatch, disallowed capability class,
     * and inputSchema violations are all reported here, regardless of what the
     * Adaptation Planner claims.
     */
    validate(invocation: SkillInvocation): ValidationResult;
    /**
     * Validates then executes an invocation. A failed validation is a hard
     * rejection (ADR-008/ADR-014) — it never falls back to any other behavior.
     */
    execute(invocation: SkillInvocation): Promise<SkillResult>;
}
//# sourceMappingURL=executor.d.ts.map