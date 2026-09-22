// TODO SYNC-3: replace with import from @aua/contracts
// Frozen verbatim from aua/docs/contracts/skill-contract.md v1.0.0

export const SKILL_CONTRACT_VERSION = "1.0.0" as const;

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
  id: string;
  version: string;
  purpose: string;
  inputSchema: object;
  preconditions: string[];
  permissions: CapabilityClass[];
  sideEffects: string[];
  outputSchema: object;
  errorModel: { code: string; retryable: boolean }[];
  rollback: "supported" | "not-applicable" | "manual-only";
  verificationStrategy: string;
  telemetry: { emits: string[] };
  securityClassification: CapabilityClass;
}

export interface SkillInvocation {
  invocationId: string;
  skillId: string;
  skillVersion: string;
  targetElementId?: string;
  inputs: Record<string, unknown>;
  requestedBy: "agent" | "deterministic-rule" | "user-direct";
  interactionId: string;
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
