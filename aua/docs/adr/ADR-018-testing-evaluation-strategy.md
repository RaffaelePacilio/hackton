# ADR-018: Testing & Evaluation Strategy

**Status:** ACCEPTED | **Date:** 2026-09-22 | **Owners:** Testing/Evaluation Architect

## Testing pyramid
Unit → contract tests (validate every message against `docs/contracts/*` JSON Schemas in CI) →
component tests (Web Components in isolation) → agent/tool tests (mocked `ReasoningProvider`,
`SpeechProvider`) → deterministic skill tests (each `SkillDefinition` gets input/output/error
cases) → integration tests → browser extension tests (per-browser) → cross-browser tests →
STT/TTS mock tests → provider integration tests (real, rate-limited, non-CI-blocking) → security
tests (permission boundary, redaction enforcement) → prompt-injection tests (adversarial page
content fixtures) → accessibility tests (axe-core class automated checks) → E2E tests (real
browser, Playwright-class tooling, against golden demo sites).

## Golden/reference demo sites (owned fixtures, not third-party sites, for CI determinism)
Drag-only slider, hover-only menu, custom select, modal focus trap, inaccessible SPA navigation,
controlled React inputs, dynamic validation, route transition, Shadow DOM component — one fixture
site per pattern, versioned alongside the test suite in `packages/testing`.

## Evaluation framework (separate from pass/fail testing)
Metrics tracked as first-class, separately reported (never collapsed into one score, per
Section 3.17): Task Completion Rate, Barrier Resolution Rate, False Barrier Detection Rate,
Incorrect Adaptation Rate, Semantic Field Match Accuracy, Navigation Intent Accuracy, Form
Completion Accuracy, Voice Intent Accuracy, Accessibility Regression Rate, Median Voice
Roundtrip Latency, P95 Agent Decision Latency.

Separated evaluation tiers: (1) automated AI evaluation (reasoning quality against a labeled
barrier/plan dataset), (2) deterministic tests (skills/verification), (3) automated accessibility
testing (axe-core class), (4) human testing (internal), (5) **user testing with people who
actually use assistive technologies** — required before general availability, not optional
(Section 3.17/25 quality bar).

## Consequences
Significant fixture/tooling investment up front (owned demo sites) — accepted because testing
against live third-party sites is non-deterministic and would make CI unreliable.

## Revisit triggers
New difficult-interaction-pattern discovered in production → add a corresponding golden fixture.

## References
Section 3.17, 3.18.
