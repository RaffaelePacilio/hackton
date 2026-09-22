# Agentic Universal Accessibility Runtime (AUA) — Executive Summary

**Status:** ACCEPTED (baseline) | **Date:** 2026-09-22 | **Owner:** Principal Architect

## What the platform is

AUA is a site-agnostic runtime that augments ordinary websites with accessible interaction
mechanisms **without requiring source-code changes to the target site**. It ships as:

1. A **browser extension** (Manifest V3) that observes a page and injects accessible adapters.
2. A **Universal Accessibility Bootstrap** — a small, deterministic, LLM-independent surface
   that lets a user declare their interaction capabilities and preferences.
3. An **Agentic Accessibility Runtime** that interprets a frozen `InteractionContract`, builds a
   `SemanticPageModel` of the current page, detects `Barrier`s between what the page demands and
   what the user can do, and resolves them by invoking a closed set of deterministic **Skills**
   (never arbitrary generated code).
4. A **Mobile Companion App** that can act as a paired remote control (push-to-talk, STT/TTS,
   command confirmation).
5. A **Voice subsystem** abstracted behind a `SpeechProvider` interface, supporting both a
   chained STT→Agent→TTS pipeline and a realtime speech-to-speech mode.

## What problem it solves

Most inaccessible interaction failures are not "the user can't perceive the page" — they are
**modality mismatches**: a control demands drag, hover, or precision pointing that the user's
declared capabilities don't support. AUA's job is to detect that mismatch and substitute an
accessible, verified equivalent interaction, on live third-party sites, in real time, without
waiting for the site owner to fix it.

## What it deliberately does not solve

- It does **not** diagnose disability. It only reasons over a self-declared, editable
  `InteractionContract`.
- It does **not** claim WCAG compliance for the target site — it claims that a specific
  *blocking barrier* was *resolved and verified* for a specific user session.
- It does **not** execute arbitrary LLM-generated JavaScript against the page. All runtime
  actions go through the versioned **Skill Registry**.
- It does **not** commit to a single LLM vendor or a single speech vendor. Both are behind
  provider-abstraction interfaces (ADR-006, ADR-007).
- It does **not** guarantee that every possible target site interaction can be adapted;
  degraded/no-adaptation is an explicit, first-class outcome, never a silent failure.

## Principal architecture choices (see ADRs for full rationale)

| # | Decision | Chosen | Confidence |
|---|---|---|---|
| 1 | Runtime topology | Deterministic shell, agentic decisions (browser-resident core, thin backend control plane) | High |
| 2 | Semantic representation | Hybrid graph/tree `SemanticPageModel`, not raw DOM to LLM | High |
| 3 | Agent orchestration | No heavyweight multi-agent framework in the browser runtime; a thin custom deterministic orchestrator in the extension, calling a single "Adaptation Reasoning" LLM step per barrier; LangGraph-style **state-graph orchestration is used only in the backend control plane** for cross-session / long-running workflows (e.g. mobile pairing, evaluation pipelines) | Medium — revisit at first vertical slice |
| 4 | Voice architecture | Provider-agnostic `SpeechProvider`; default backend uses realtime speech-to-speech (OpenAI Realtime class of API) with a chained STT→intent→TTS **fallback** mode for degraded/offline/data-residency-constrained sessions | Medium |
| 5 | Adaptation execution | Closed Skill Registry; LLM selects skills, never generates DOM code | High |
| 6 | Repository | Monorepo with strict package boundaries and frozen contracts | High |

Full detail: `docs/adr/ADR-001` … `ADR-020`. Full contracts: `docs/contracts/`. Executable
decomposition: `docs/work-packages/` and `docs/agents/`. Dependency graph:
`docs/diagrams/dependency-dag.md`.

## Reading order for a new contributor

1. This document.
2. `01-system-context.md`, `02-container-architecture.md`
3. `docs/contracts/*` (the frozen interfaces — read before touching any package)
4. The ADR for your assigned package
5. Your `docs/agents/AGENT-*.md` spawn manifest
