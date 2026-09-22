# Implementation Dependency DAG

Architecture dependency (decisions that must be made first) is distinguished from
implementation dependency (code that must exist first). This graph is implementation
dependency, used to derive Work Packages and Agent Spawn Manifests.

```mermaid
graph TD
    P0[P0: Architecture Baseline<br/>ADR-001..020 ACCEPTED, contracts frozen]

    P0 --> WP_CONTRACTS[WP-001: Contracts package]
    P0 --> WP_EXT_SKEL[WP-002: Extension skeleton]
    P0 --> WP_WC_SDK[WP-003: Web Component SDK]
    P0 --> WP_VOICE_SPIKE[WP-004: Voice provider spike]
    P0 --> WP_SKILL_SDK[WP-005: Skill SDK + baseline registry]
    P0 --> WP_OBS[WP-006: Observability foundation]

    WP_CONTRACTS --> WP_SPM[WP-007: Semantic Page Model]
    WP_CONTRACTS --> WP_AGENT_RT[WP-008: Agent Runtime]
    WP_CONTRACTS --> WP_MOBILE_PROTO[WP-009: Mobile Pairing Protocol]
    WP_CONTRACTS --> WP_SKILL_SDK

    WP_EXT_SKEL --> WP_SPM
    WP_SKILL_SDK --> WP_SKILL_EXEC[WP-010: Skill Executor]
    WP_WC_SDK --> WP_ADAPTERS[WP-011: Accessible Adapters (a11y-* components)]

    WP_SPM --> WP_BARRIER[WP-012: Barrier Detection Engine]
    WP_SPM --> WP_ROUTING[WP-013: Accessible Routing Layer]
    WP_AGENT_RT --> WP_PLANNER[WP-014: Adaptation Planner]
    WP_BARRIER --> WP_PLANNER
    WP_SKILL_EXEC --> WP_PLANNER
    WP_ADAPTERS --> WP_PLANNER

    WP_VOICE_SPIKE --> WP_VOICE_IMPL[WP-015: Speech Provider implementation]
    WP_VOICE_IMPL --> WP_INTENT[WP-016: Intent Engine]
    WP_AGENT_RT --> WP_INTENT

    WP_MOBILE_PROTO --> WP_MOBILE_APP[WP-017: Mobile Companion App]

    WP_PLANNER --> WP_VERIFY[WP-018: Verification Engine]
    WP_INTENT --> WP_FORM_AGENT[WP-019: Form Agent]
    WP_PLANNER --> WP_FORM_AGENT

    WP_VERIFY --> WP_SLICE[WP-020: First Vertical Slice Integration]
    WP_FORM_AGENT --> WP_SLICE
    WP_ROUTING --> WP_SLICE
    WP_MOBILE_APP --> WP_SLICE
    WP_OBS --> WP_SLICE
```

## Parallel groups

- **PG-0 (after architecture baseline, fully parallel, no shared-path conflicts):**
  WP-001 Contracts, WP-002 Extension Skeleton, WP-003 Web Component SDK, WP-004 Voice Spike,
  WP-005 Skill SDK, WP-006 Observability Foundation.
- **PG-1 (after Contracts frozen — SYNC-1):**
  WP-007 Semantic Page Model, WP-008 Agent Runtime, WP-009 Mobile Pairing Protocol,
  WP-010 Skill Executor (needs WP-005), WP-011 Accessible Adapters (needs WP-003).
- **PG-2 (after Semantic Page Model API frozen — SYNC-2):**
  WP-012 Barrier Detection Engine, WP-013 Accessible Routing Layer, WP-015 Speech Provider impl
  (needs WP-004).
- **PG-3 (after Skill API frozen — SYNC-3):**
  WP-014 Adaptation Planner, WP-016 Intent Engine, WP-017 Mobile Companion App.
- **PG-4:** WP-018 Verification Engine, WP-019 Form Agent.
- **PG-5 (integration barrier — SYNC-4):** WP-020 First Vertical Slice Integration.

## Synchronization barriers
- **SYNC-1**: `InteractionContract` + all shared type contracts frozen (end of WP-001).
- **SYNC-2**: `SemanticPageModel` API frozen (end of WP-007).
- **SYNC-3**: Skill API / registry v1.0.0 frozen (end of WP-005 + WP-010).
- **SYNC-4**: First end-to-end vertical slice passes its acceptance scenario (Scenario B).

## Critical path
WP-001 → WP-007 → WP-012 → WP-014 → WP-018 → WP-020
(Contracts → Semantic Model → Barrier Engine → Adaptation Planner → Verification → Integration)

This is the longest dependency chain and determines the minimum wall-clock time to the first
vertical slice regardless of how many agents are spawned in parallel.
