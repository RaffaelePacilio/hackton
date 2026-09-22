id: WP-005
title: Skill SDK + Baseline Registry
phase: Foundation
parallel_group: PG-0 (registry defs) / PG-1 (typed SDK, needs WP-001 contracts)

goal: >
  Implement the SkillDefinition/SkillInvocation/SkillResult runtime SDK and author the
  baseline registry entries (JSON definitions) for all 22 skills listed in
  docs/contracts/skill-contract.md.

depends_on: [WP-001]
blocks: [WP-010]

architecture_refs:
  - ADR-008
  - ADR-017 (verificationStrategy references)

input_contracts:
  - SkillDefinition / SkillInvocation / SkillResult (packages/contracts)

output_contracts:
  - packages/skill-sdk/registry/*.json (22 baseline skill definitions)
  - packages/skill-sdk/src (loader, schema validator, capability-class lookup)

owned_paths:
  - packages/skill-sdk/**

forbidden_paths:
  - packages/contracts/** (consume, do not modify)
  - packages/semantic-model/**

responsibilities:
  - Author SkillDefinition JSON for: focus_semantic_field, fill_field, read_element,
    read_region, read_errors, navigate_to_intent, restore_focus, inject_field_proxy,
    inject_stepper, inject_choice_list, inject_command_palette, inject_route_navigation,
    replace_drag, replace_hover, increase_target_size, simplify_interaction, announce, listen,
    speak, verify_field_value, verify_action_result, verify_navigation.
  - Each definition fully populated per SkillDefinition shape: no placeholder fields.
  - Loader that validates every registry entry against the SkillDefinition JSON Schema at build
    time (CI fails on any malformed entry).

non_goals:
  - No execution logic (that's the Skill Executor, WP-010).

implementation_requirements:
  - Registry is additive-versioned per skill (skill-contract.md rule) — each entry carries its
    own semver independent of the SDK package version.

security_requirements:
  - Every entry's securityClassification must be one of the defined CapabilityClass values;
    no skill may declare AUTHENTICATE/PAYMENT/DESTRUCTIVE without a documented rollback or
    explicit "manual-only" declaration.

tests_required:
  unit: true
  integration: false
  e2e: false

acceptance_criteria:
  - All 22 skills present, schema-valid, capability classes assigned and reviewed against
    ADR-014's confirmation policy table.

deliverables:
  - packages/skill-sdk/

integration_notes:
  - WP-010 (Skill Executor) and WP-014 (Adaptation Planner) both consume this registry as their
    source of truth for what skills exist.

risks:
  - Under-specified inputSchema on any skill blocks safe execution — require a second reviewer
    on every skill definition before merge.

definition_of_done:
  - SYNC-3 declared complete once this + WP-010 both land.
