export type CapabilityClass =
  | "READ"
  | "FOCUS"
  | "NAVIGATE"
  | "WRITE_LOW_RISK"
  | "WRITE_PERSONAL_DATA"
  | "SUBMIT"
  | "AUTHENTICATE"
  | "PAYMENT"
  | "DESTRUCTIVE";

export interface SkillDefinition {
  id: string;                 // e.g. "fill_field"
  version: string;            // semver
  purpose: string;
  inputSchema: object;        // JSON Schema
  preconditions: string[];
  permissions: CapabilityClass[];
  sideEffects: string[];
  outputSchema: object;
  errorModel: { code: string; retryable: boolean }[];
  rollback: "supported" | "not-applicable" | "manual-only";
  verificationStrategy: string; // reference to a Verification Engine check
  telemetry: { emits: string[] };
  securityClassification: CapabilityClass;
}

export interface SkillInvocation {
  invocationId: string;
  skillId: string;
  skillVersion: string;
  targetElementId?: string; // SemanticElement.id
  inputs: Record<string, unknown>;
  requestedBy: "agent" | "deterministic-rule" | "user-direct";
  interactionId: string;    // correlation
}

export interface SkillResult {
  invocationId: string;
  status: "success" | "failed" | "requires-confirmation" | "rolled-back";
  output?: Record<string, unknown>;
  errorCode?: string;
  verification?: VerificationResult;
}

export interface VerificationResult {
  invocationId: string;
  verified: boolean;
  method: "dom-read" | "route-check" | "state-diff" | "accessibility-check";
  observedValue?: unknown;
  expectedValue?: unknown;
  failureClass?: "timeout" | "mismatch" | "element-gone" | "framework-blocked";
}
