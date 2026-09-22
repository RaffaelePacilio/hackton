id: WP-001
title: Contracts Package
phase: Foundation
parallel_group: PG-0

goal: >
  Implement the frozen TypeScript types + JSON Schemas for InteractionContract,
  SemanticPageModel, SemanticElement, UserIntent, Barrier, AdaptationPlan, SkillDefinition,
  SkillInvocation, SkillResult, VerificationResult, SpeechEvent, NavigationEvent,
  AgentDecision, AuditEvent exactly as specified in docs/contracts/*.md, with runtime
  validators (e.g. zod or ajv-generated from JSON Schema) and 100% type-level test coverage.

depends_on: []
blocks: [WP-005, WP-007, WP-008, WP-009, WP-010]

architecture_refs:
  - ADR-003
  - ADR-004
  - ADR-005 (agent-contract types only)
  - ADR-008

input_contracts: []
output_contracts:
  - InteractionContract v1.0.0
  - SemanticPageModel v1.0.0
  - SkillDefinition / SkillInvocation / SkillResult v1.0.0
  - UserIntent / Barrier / AdaptationPlan / AgentDecision v1.0.0
  - SpeechEvent / NavigationEvent / AuditEvent v1.0.0

owned_paths:
  - packages/contracts/**

read_only_paths:
  - docs/contracts/**
  - docs/adr/**

forbidden_paths:
  - packages/semantic-model/**
  - packages/agent-runtime/**
  - apps/**

responsibilities:
  - Transcribe every type in docs/contracts/*.md into packages/contracts/src/*.ts exactly.
  - Generate/hand-write matching JSON Schemas under packages/contracts/schemas/*.json.
  - Implement redact() function per semantic-page-model.md redaction rule as a pure, tested
    function exported from this package (single source of truth, ADR-003).
  - Publish a versioned package (semver) consumable by all other packages.

non_goals:
  - No business logic beyond types, schemas, and the redact() function.
  - Do not implement the Semantic Page Model builder itself (WP-007).

implementation_requirements:
  - TypeScript strict mode.
  - Every exported type has a corresponding JSON Schema kept in sync via a build-time check
    (schema and type must not drift — add a CI check that fails on mismatch).
  - No dependency on any browser or Node-specific API in this package (must be usable from both
    the extension bundle and backend services).

security_requirements:
  - redact() must strip `state` on any SemanticElement with sensitive: true to
    { hasValue: boolean } exactly as specified; add adversarial test cases (nested objects,
    unexpected keys) to prevent redaction bypass.

accessibility_requirements: []

observability_requirements:
  - AuditEvent type must make `redacted: boolean` a required, non-optional field.

tests_required:
  unit: true
  integration: false
  e2e: false

acceptance_criteria:
  - All types compile and match docs/contracts/*.md exactly (reviewed diff against source docs).
  - redact() has 100% branch coverage including adversarial cases.
  - Package builds and is importable from a throwaway consumer script with zero runtime errors.

deliverables:
  - packages/contracts/ (published, versioned)
  - Test report showing 100% branch coverage on redact()

integration_notes:
  - This package is a dependency for nearly everything else; any breaking change after SYNC-1
    requires a dedicated change-control ADR update, not a silent PR.

risks:
  - Type/schema drift if the JSON Schema is hand-maintained separately from the TS types —
    mitigate with a generation step or a CI diff check.

definition_of_done:
  - Merged, versioned, SYNC-1 declared complete, dependent Work Packages unblocked.
