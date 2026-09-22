id: WP-002
title: Browser Extension Skeleton + Universal Accessibility Bootstrap
phase: Foundation
parallel_group: PG-0

goal: >
  Stand up the Manifest V3 extension skeleton (content script, service worker, page-context
  bridge) and implement the Universal Accessibility Bootstrap: a deterministic, LLM-independent
  UI for creating/editing the InteractionContract.

depends_on: []
blocks: [WP-007]

architecture_refs:
  - ADR-001
  - ADR-002
  - ADR-004

input_contracts:
  - InteractionContract (mocked locally until WP-001 lands; do not block on it — use a
    hand-copied type stub and reconcile at SYNC-1)

output_contracts:
  - Extension message envelope (content script <-> service worker <-> page-context bridge)

owned_paths:
  - apps/browser-extension/**

read_only_paths:
  - docs/adr/ADR-001-runtime-topology.md
  - docs/adr/ADR-002-browser-extension-architecture.md

forbidden_paths:
  - packages/contracts/**
  - apps/mobile-app/**
  - apps/backend/**

responsibilities:
  - MV3 manifest, content script (isolated world), service worker, narrowly-scoped page-context
    bridge with origin-checked postMessage envelope (no eval).
  - Universal Accessibility Bootstrap UI: create/edit InteractionContract, stored in
    chrome.storage.local, fully functional with zero network calls.
  - Incremental host permission request flow (activeTab + optional host permissions), not
    <all_urls> at install.

non_goals:
  - No DOM semantic analysis (WP-007).
  - No skill execution (WP-010).

implementation_requirements:
  - Bootstrap UI must pass automated accessibility checks (axe-core class) as a merge gate.
  - Bootstrap must remain fully operational with the service worker artificially killed
    (simulate MV3 lifecycle termination) — test this explicitly.

security_requirements:
  - No inline scripts/styles; CSP-compliant resource loading via chrome.runtime.getURL.
  - Page-context bridge messages are versioned and origin-validated; reject unknown origins/
    malformed envelopes without throwing unhandled exceptions.

accessibility_requirements:
  - Bootstrap keyboard-navigable end to end; screen-reader tested (manual pass required before
    merge, automated axe-core as a baseline only).

observability_requirements:
  - Bootstrap logs interaction-contract edits locally; no telemetry required at this stage
    (Observability Pipeline is WP-006, integrate later).

tests_required:
  unit: true
  integration: true
  e2e: false

acceptance_criteria:
  - Extension loads unpacked in Chrome and Firefox dev mode.
  - Bootstrap creates/edits/persists an InteractionContract-shaped object with zero network
    dependency.
  - Service-worker-killed scenario: Bootstrap still opens and functions.

deliverables:
  - apps/browser-extension/ (loadable, testable skeleton)

integration_notes:
  - At SYNC-1, swap the local InteractionContract type stub for the real
    packages/contracts export; this must be a small, mechanical diff — do not couple business
    logic to the stub's shape in a way that makes swapping costly.

risks:
  - Firefox MV3 lifecycle differences (ADR-002 open question) — track as a known risk, do not
    silently assume parity.

definition_of_done:
  - Merged; Bootstrap independently demoable without any other Work Package present.
