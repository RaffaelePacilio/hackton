# ADR-005: Agent Orchestration Framework

**Status:** ACCEPTED (browser runtime), PROPOSED (backend control plane) | **Date:** 2026-09-22
**Owners:** AI/Agent Framework Architect | **Evidence verification date:** 2026-09-22

## Context
Section 3.11 requires an explicit evaluation of OpenAI Agents SDK, LangGraph, Claude Agent SDK,
and "no framework," and forbids defaulting to a multi-agent framework without justification.

## Evidence gathered (first-party + current secondary sources, verified 2026-09-22)

- **OpenAI Agents SDK**: minimalist primitives (agents, handoffs, guardrails, sessions),
  provider-agnostic beyond OpenAI via Chat Completions-compatible providers (100+ models via
  LiteLLM/any-llm integrations), built-in tracing, first-class realtime/voice support. Still on
  0.x versioning with frequent releases (NEEDS VERIFICATION at build time for breaking-change
  risk).
- **LangGraph**: graph-based orchestration with explicit nodes/edges and typed state, built for
  stateful, resumable, checkpointed multi-step workflows -- the standard industry choice for
  durable, long-running, or human-in-the-loop orchestration where transparency and debuggability
  of the decision graph matter more than minimal boilerplate.
- **Claude Agent SDK**: strong for coding-agent style tasks, with built-in tool execution and
  subagent spawning for parallel task decomposition -- this is the mechanism used to author this
  very architecture package (Section 14) -- but a poor fit for *browser-runtime* barrier
  resolution, which needs low-latency single-shot reasoning, not a coding-agent loop.
- Consolidated 2026 industry assessment: LangGraph offers the most control at the cost of more
  boilerplate; lightweight vendor SDKs (Claude Agent SDK, Strands) trade fine-grained
  orchestration for simplicity; OpenAI Agents SDK sits between the two via its handoff model.
  The broader field is converging on **multi-framework compositions** -- a vendor SDK for native
  tool execution paired with a dedicated orchestration framework for multi-agent/stateful
  workflows -- rather than one framework covering every need.

## Decision drivers
Determinism, latency in-browser, checkpointing/resumability for long-running backend workflows,
provider portability, operational complexity, avoidance of agent proliferation (Section 3.12).

## Decision matrix (weighted 1–5)

| Criterion (weight) | No framework (custom, chosen for browser runtime) | OpenAI Agents SDK | LangGraph (chosen for backend control-plane workflows) | Claude Agent SDK |
|---|---|---|---|---|
| Determinism (5) | 5 | 3 | 4 | 3 |
| Latency overhead in browser context (5) | 5 | 2 | 1 | 2 |
| Checkpointing/resumability (5) | 2 (must build) | 2 | 5 | 3 |
| Provider portability (4) | 5 | 3 | 4 | 2 |
| TS support (4) | 5 (native) | 5 | 4 | 3 |
| Operational complexity (3, lower=better) | 5 | 4 | 3 | 4 |
| Multi-agent/handoff support (3) | 2 | 5 | 5 | 4 |
| Ecosystem maturity (3) | 3 | 3 | 5 | 3 |

## Decision
**Split decision, not a single framework:**

1. **Browser-runtime barrier→plan reasoning** uses a **thin custom orchestrator**: a single,
   tightly-scoped LLM call per unresolved barrier, constrained to emit an `AdaptationPlan`
   referencing only registered skills (structured output / tool-call style constrained
   generation). No framework is adopted here — the overhead of any of the evaluated frameworks
   is not justified for a single-shot, low-latency, browser-adjacent decision, and "deterministic
   shell, agentic decisions" (Section 3.11) is best served by keeping the agentic surface as
   small and inspectable as possible.
2. **Backend control-plane workflows** that are genuinely stateful, long-running, and benefit
   from checkpointing/resumability — mobile pairing session lifecycle, evaluation pipelines,
   multi-step "describe this page and offer options" conversational flows — use **LangGraph**,
   chosen for its explicit graph/typed-state model and checkpointing, which map directly onto
   Section 3.11's "state graph" and "deterministic workflow" candidate patterns.
3. **OpenAI Agents SDK is not adopted** as the orchestration backbone: its handoff/guardrail
   primitives are a good fit for open-ended multi-agent conversational products, which this
   platform deliberately is not (Section 3.12 warns against agent proliferation). It remains a
   valid **implementation detail inside the Voice Architecture** (ADR-007) if realtime voice-agent
   tool-calling is used there — that is a narrower, justified use.
4. **Claude Agent SDK subagents** are used only as a **development-time tool** (as in this very
   document's own authoring process, Section 14) — not as a production runtime component.

## Agent roles resolution (Section 3.12)
Of the eight logical roles proposed, only two are *true LLM agents* in production:
- **Adaptation Reasoning step** (barrier → plan, ambiguous intent resolution, page
  summarization).
- **Voice Realtime Agent** (ADR-007), when realtime mode is active.

All others (Page Understanding, Form, Navigation, Barrier Analysis, Verification) are
**deterministic services/libraries**, per Section 3.11's "deterministic shell" principle —
avoiding the agent-proliferation anti-pattern explicitly called out in Section 3.12.

## Consequences
Two orchestration technologies in the codebase (custom + LangGraph) rather than one — accepted
because they serve genuinely different latency/statefulness regimes. Contract discipline
(`AgentDecision`, `AdaptationPlan`) is what prevents this from becoming incoherent: both paths
must terminate in the same `AdaptationPlan` shape.

## Rejected alternatives
Single-framework-for-everything (any of the three) rejected: none of them is simultaneously
low-latency-in-browser-context AND strong at durable backend workflows.

## Revisit triggers
- OpenAI Agents SDK or LangGraph reaching a stable 1.0 with materially different guarantees.
- Measured p95 latency in the vertical slice showing the custom orchestrator underperforms a
  framework-provided alternative by a wide margin.

## Open questions
- Exact LangGraph checkpointer backend (in-memory vs. DB-backed) — NEEDS VERIFICATION against
  Phase 2 durability requirements for mobile pairing sessions.

## References
Section 3.11, 3.12, 14.
