agent_id: AGENT-CONTRACTS

role: Contracts Implementation Engineer

work_package: WP-001

required_context:
  - docs/architecture/00-executive-summary.md
  - docs/contracts/interaction-contract.md
  - docs/contracts/semantic-page-model.md
  - docs/contracts/skill-contract.md
  - docs/contracts/agent-contract.md
  - docs/adr/ADR-003-semantic-page-model.md
  - docs/adr/ADR-008-skill-registry.md

owned_paths:
  - packages/contracts/**

forbidden_paths:
  - packages/semantic-model/**
  - packages/agent-runtime/**
  - packages/skill-sdk/**
  - apps/**

mission: |
  Implement the frozen TypeScript types, JSON Schemas, and the redact() function exactly as
  specified in docs/contracts/*.md. This package is the shared vocabulary for every other
  agent in the system. Precision over speed: a type mismatch here breaks every downstream
  package silently.

must_not:
  - invent new fields not present in docs/contracts/*.md
  - change architecture decisions
  - introduce a new AI or speech provider
  - bypass the documented redaction rule
  - implement any business logic beyond types/schemas/redact()

validation:
  - unit tests (100% branch coverage on redact())
  - contract tests (type <-> schema sync check)
  - lint
  - typecheck

handoff_output:
  - implementation summary
  - changed files
  - assumptions made where docs/contracts/*.md was ambiguous
  - test evidence (coverage report)
  - unresolved integration issues for downstream consumers
