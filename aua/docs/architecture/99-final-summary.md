# Final Summary — Agentic Universal Accessibility Runtime

## A. Recommended architecture (concise)

A browser-resident **deterministic shell** (DOM reading, semantic modeling, skill execution,
verification) driven by **narrow, single-shot agentic decisions** (barrier→plan reasoning,
ambiguous intent resolution) that select from a closed, versioned **Skill Registry** — never
generated code. Voice is a provider-agnostic subsystem defaulting to realtime speech-to-speech
with a chained-pipeline fallback. Orchestration is split: no framework in the latency-critical
browser path; **LangGraph** for genuinely stateful backend workflows (mobile pairing,
multi-turn summarization). Everything is bound together by ten frozen contracts that let
independent agents implement in parallel without inferring each other's APIs.

## B. Major decisions

| Decision | Choice | ADR | Confidence | Revisit trigger |
|---|---|---|---|---|
| Runtime topology | Deterministic shell, agentic decisions, split browser/backend | ADR-001 | High | MV3 service worker restrictions tighten further |
| Semantic representation | Hybrid tree + relationship graph | ADR-003 | High | Profiling shows diff cost dominates frame budget |
| Orchestration (browser) | No framework, thin custom orchestrator | ADR-005 | Medium | Vertical-slice latency data disagrees |
| Orchestration (backend) | LangGraph | ADR-005 | Medium | LangGraph/alternative reaches materially different 1.0 |
| LLM provider | Abstracted `ReasoningProvider`, fallback chain | ADR-006 | High | Provider offers materially better structured output |
| Voice default mode | Realtime speech-to-speech, chained fallback | ADR-007 | Medium (vendor PROPOSED) | Benchmark spike (WP-004) results |
| Adaptation execution | Closed Skill Registry, no generated code | ADR-008 | High | — (hard constraint, Section 22) |
| Web Component strategy | Proxy/Adapter, closed Shadow DOM | ADR-009 | High | Accessibility-tree/Shadow DOM interop changes |
| Form writes | Native-setter + synthetic events + mandatory verification | ADR-010 | Medium | Framework internals change |
| Persistence | Pattern accepted, vendor deferred | ADR-019 | Medium | Phase 2 sizing data |

## C. Dependency DAG

See `docs/diagrams/dependency-dag.md` for the full Mermaid graph and parallel-group breakdown.

## D. Parallel execution plan

**PG-0 (all can start simultaneously, no shared paths):** WP-001 Contracts, WP-002 Extension
Skeleton, WP-003 Web Component SDK, WP-004 Voice Spike, WP-005 Skill SDK (registry authoring
only), WP-006 Observability Foundation.

**PG-1 (after SYNC-1, contracts frozen):** WP-007 Semantic Page Model, WP-008 Agent Runtime,
WP-009 Mobile Pairing Protocol, WP-010 Skill Executor, WP-011 Accessible Adapters.

**PG-2 (after SYNC-2, semantic model frozen):** WP-012 Barrier Detection Engine, WP-013 Routing
Layer, WP-015 Speech Provider implementation.

**PG-3 (after SYNC-3, skill API frozen):** WP-014 Adaptation Planner, WP-016 Intent Engine,
WP-017 Mobile Companion App.

**PG-4:** WP-018 Verification Engine, WP-019 Form Agent.

**PG-5 (SYNC-4):** WP-020 First Vertical Slice Integration.

## E. Critical path

WP-001 → WP-007 → WP-012 → WP-014 → WP-018 → WP-020. This chain, not the total Work Package
count, determines minimum wall-clock time to the first demoable slice.

## F. Agent spawn plan (first wave)

| Agent | Work Package | Can start after | Owned paths | Expected output | Parallel group |
|---|---|---|---|---|---|
| AGENT-CONTRACTS | WP-001 | P0 baseline | packages/contracts/** | Frozen types+schemas+redact() | PG-0 |
| AGENT-EXTENSION-SKELETON | WP-002 | P0 baseline | apps/browser-extension/** | MV3 skeleton + Bootstrap | PG-0 |
| AGENT-WC-SDK | WP-003 | P0 baseline | packages/web-components/** | Shadow DOM base framework | PG-0 |
| (spike, not an implementation agent) | WP-004 | P0 baseline | spikes/voice-benchmark/** | Vendor benchmark report | PG-0 |
| AGENT-SKILL-SDK | WP-005 | P0 baseline (registry) / SYNC-1 (typed SDK) | packages/skill-sdk/** | 22 skill definitions + loader | PG-0/PG-1 |
| AGENT-OBSERVABILITY | WP-006 | P0 baseline | packages/observability/** | OTel client + redaction gate | PG-0 |

Manifests for AGENT-CONTRACTS, AGENT-EXTENSION-SKELETON, AGENT-WC-SDK are ready to spawn now in
`docs/agents/`. Remaining PG-1+ manifests are generated the same way once SYNC-1 lands.

## G. Architecture risks (ranked)

| Risk | Likelihood | Impact | Mitigation | Owner |
|---|---|---|---|---|
| Cross-browser accessibility-tree API parity gaps | High | Medium | DOM/ARIA fallback baseline everywhere; browser API treated as enhancement only (ADR-002) | Browser Extension Architect |
| React/framework-internal write technique breaks on version change | Medium | High | Mandatory verification, never trust write success blindly (ADR-010, ADR-017) | Form Agent owner |
| Realtime voice vendor lacks required EU data-residency guarantee | Medium | High | Chained-pipeline fallback is mandatory, not optional (ADR-007) | Voice Architect |
| Agent-generated plan references an unregistered/stale skill | Low | High | Hard rejection at Skill Executor, independent of Planner's request (ADR-008) | Security Architect |
| Redaction bypass (sensitive data reaches LLM/telemetry) | Low | Critical | Two independent enforcement points (contracts + observability ingestion) with adversarial test coverage | Security & Privacy Architect |
| Legal/GDPR review not completed before EU launch | Medium | Critical | Explicit open question tracked in ADR-015; hard launch gate | Security & Privacy Architect |

## H. Open questions (materially blocking)

1. Default voice vendor selection — blocked on WP-004 benchmark results (ADR-007).
2. Exact audit-record retention windows — blocked on legal/DPO review (ADR-015).
3. Cross-browser accessibility-tree API parity — blocked on per-browser verification spike
   (ADR-002).
4. LangGraph checkpoint store durability requirements — blocked on Phase 2 sizing (ADR-005,
   ADR-019).

## I. First recommended implementation wave

Spawn **AGENT-CONTRACTS, AGENT-EXTENSION-SKELETON, AGENT-WC-SDK, AGENT-OBSERVABILITY**
immediately (PG-0, fully non-overlapping ownership). Run **WP-004 (voice benchmark)** as a
research spike in parallel, not gated on anything. Do not spawn PG-1 agents until SYNC-1
(Contracts frozen) is confirmed — starting them earlier risks exactly the kind of rework the
frozen-contract discipline exists to prevent.
