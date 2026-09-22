# ADR-008: Skill Registry

**Status:** ACCEPTED | **Date:** 2026-09-22 | **Owners:** Principal Architect

## Context
Adaptations must not be arbitrary LLM-generated code (Section 3.7, 22).

## Decision
A closed, versioned registry of `SkillDefinition`s (`docs/contracts/skill-contract.md`) is the
**only** execution surface. The LLM output space is constrained to `{ skillId, inputs }` pairs
validated against each skill's `inputSchema` before execution. New skills are added through a
reviewed PR to `packages/skill-sdk/registry/`, never dynamically registered at runtime by an
agent.

## Interfaces
See `skill-contract.md` for `SkillDefinition`, `SkillInvocation`, `SkillResult`.

## Security considerations
Capability-class gating (READ..DESTRUCTIVE) is enforced in the Skill Executor, a component the
Adaptation Planner cannot bypass — the Planner can *request* any skill, only the Executor can
*run* one, and it re-validates permissions independent of what the Planner claims.

## Failure modes
Unknown `skillId` from a `AdaptationPlan` → hard rejection + `failureClass:
"framework-blocked"`, never a best-effort fallback to generated code.

## Consequences
Adaptation coverage is bounded by registered skills — an explicit, accepted trade-off in
exchange for auditability and safety (Section 22 prohibits unrestricted generated JS
execution).

## Revisit triggers
Recurring barrier patterns with no matching skill, tracked via `Barrier.severity: "unknown"`
telemetry, feed a backlog for new skill proposals (human-reviewed).

## References
Section 3.7, 22.
