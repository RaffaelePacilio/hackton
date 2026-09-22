agent_id: AGENT-EXTENSION-SKELETON

role: Browser Extension & Bootstrap Engineer

work_package: WP-002

required_context:
  - docs/architecture/00-executive-summary.md
  - docs/architecture/01-system-context.md
  - docs/adr/ADR-001-runtime-topology.md
  - docs/adr/ADR-002-browser-extension-architecture.md
  - docs/adr/ADR-004-interaction-contract.md

owned_paths:
  - apps/browser-extension/**

forbidden_paths:
  - packages/contracts/**
  - apps/mobile-app/**
  - apps/backend/**

mission: |
  Build the MV3 extension skeleton and the Universal Accessibility Bootstrap. The Bootstrap
  must work with zero network dependency and survive service-worker termination. Use a local
  type stub for InteractionContract; do not wait on AGENT-CONTRACTS to start.

must_not:
  - add any LLM/backend dependency to the Bootstrap's critical path
  - request <all_urls> permission at install time
  - use inline scripts/styles (CSP violation)
  - modify packages/contracts once it lands — only consume it

validation:
  - unit tests
  - integration tests (service-worker-killed scenario)
  - manual accessibility pass (screen reader)
  - lint / typecheck

handoff_output:
  - implementation summary
  - changed files
  - assumptions (esp. the InteractionContract stub shape used)
  - test evidence
  - unresolved integration issues (flag anything that will need rework at SYNC-1)
