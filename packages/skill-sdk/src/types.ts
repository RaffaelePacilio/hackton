// SYNC-3 resolved: shared contract types are re-exported from @aua/contracts,
// the canonical frozen source of truth (aua/docs/contracts/skill-contract.md v1.0.0).
// SKILL_CONTRACT_VERSION remains defined locally — it is skill-sdk-specific
// (not part of the @aua/contracts package).

export const SKILL_CONTRACT_VERSION = "1.0.0" as const;

export type {
  CapabilityClass,
  SkillDefinition,
  SkillInvocation,
  SkillResult,
  VerificationResult,
} from "@aua/contracts";
