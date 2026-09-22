// Skill Executor (WP-010).
//
// ADR-008: capability-class gating is enforced here, not in the Adaptation Planner.
// The Planner can *request* any skill; only the Executor can *run* one, and it
// re-validates permissions independent of what the Planner claims.
//
// ADR-014: this is the only execution surface — no eval, no dynamic code from the
// page or the LLM. Actual DOM interaction (`performSkill`) and actual verification
// (`verify`) are injected dependencies so this package stays decoupled from the
// Form Agent and from @aua/verification-engine (both being built in parallel).
//
// Unknown skillId, version mismatch, disallowed capability class, or invalid inputs
// all produce the same hard-rejection outcome: status "failed",
// errorCode "FRAMEWORK_BLOCKED", verification.failureClass "framework-blocked" —
// never a fallback to generated code.
import Ajv from "ajv";
import { get } from "./loader.js";
function frameworkBlocked(invocationId) {
    return {
        invocationId,
        status: "failed",
        errorCode: "FRAMEWORK_BLOCKED",
        verification: {
            invocationId,
            verified: false,
            method: "dom-read",
            failureClass: "framework-blocked",
        },
    };
}
export class SkillExecutor {
    constructor(allowedClasses, performSkill, verify) {
        this.allowedClasses = allowedClasses;
        this.performSkill = performSkill;
        this.verify = verify;
    }
    /**
     * Independently re-validates a requested invocation against the registry
     * (ADR-008): unknown skillId, version mismatch, disallowed capability class,
     * and inputSchema violations are all reported here, regardless of what the
     * Adaptation Planner claims.
     */
    validate(invocation) {
        const errors = [];
        const def = get(invocation.skillId);
        if (!def) {
            errors.push(`unknown skillId "${invocation.skillId}"`);
            return { valid: false, errors };
        }
        if (def.version !== invocation.skillVersion) {
            errors.push(`version mismatch: invocation requests "${invocation.skillVersion}" but registry has "${def.version}"`);
        }
        if (!def.permissions.every((p) => this.allowedClasses.has(p))) {
            errors.push(`capability class not allowed: skill requires [${def.permissions.join(", ")}], allowed=[${[...this.allowedClasses].join(", ")}]`);
        }
        const ajv = new Ajv({ allErrors: true, strict: false });
        const validateInputs = ajv.compile(def.inputSchema);
        if (!validateInputs(invocation.inputs)) {
            for (const e of validateInputs.errors ?? []) {
                errors.push(`input schema: ${e.instancePath || "/"} ${e.message}`);
            }
        }
        return { valid: errors.length === 0, errors };
    }
    /**
     * Validates then executes an invocation. A failed validation is a hard
     * rejection (ADR-008/ADR-014) — it never falls back to any other behavior.
     */
    async execute(invocation) {
        const check = this.validate(invocation);
        if (!check.valid) {
            return frameworkBlocked(invocation.invocationId);
        }
        const def = get(invocation.skillId);
        let output;
        let errorCode;
        try {
            const result = await this.performSkill(def, invocation);
            output = result.output;
            errorCode = result.errorCode;
        }
        catch {
            return {
                invocationId: invocation.invocationId,
                status: "failed",
                errorCode: "EXECUTION_ERROR",
            };
        }
        if (errorCode) {
            return {
                invocationId: invocation.invocationId,
                status: "failed",
                errorCode,
            };
        }
        let verification;
        if (this.verify) {
            try {
                verification = await this.verify(def, invocation);
            }
            catch {
                verification = {
                    invocationId: invocation.invocationId,
                    verified: false,
                    method: "dom-read",
                    failureClass: "timeout",
                };
            }
        }
        const status = verification && !verification.verified ? "failed" : "success";
        return {
            invocationId: invocation.invocationId,
            status,
            output,
            verification,
        };
    }
}
//# sourceMappingURL=executor.js.map