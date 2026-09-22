id: WP-003
title: Web Component SDK (Shadow DOM adapter framework)
phase: Foundation
parallel_group: PG-0

goal: >
  Build the reusable base class / mounting framework that all a11y-* Web Components extend:
  Shadow DOM creation, CSS isolation, lifecycle (mount/rebind/unmount), and the
  AccessibilityAdapter contract implementation.

depends_on: []
blocks: [WP-011]

architecture_refs:
  - ADR-009

output_contracts:
  - AccessibilityAdapter base class / interface implementation

owned_paths:
  - packages/web-components/**

forbidden_paths:
  - packages/semantic-model/**
  - packages/agent-runtime/**

responsibilities:
  - Base custom element class handling closed Shadow DOM creation, isolated stacking context
    z-index strategy, CSS custom property theming API, mount/rebind/unmount lifecycle bound to
    a targetElementId.
  - Focus management utilities (trap-safe, restore-on-unmount).
  - Do NOT implement the specific components (a11y-stepper etc.) — that's WP-011, which extends
    this base.

non_goals:
  - No specific adapter components.
  - No skill execution wiring (that happens in WP-011/WP-014).

implementation_requirements:
  - Zero external runtime dependencies beyond the platform (no framework lock-in — must work
    injected into a React, Angular, Vue, or plain-HTML page equally).
  - Must degrade safely if targetElementId's element is not found at mount time.

security_requirements:
  - No inline style/script injection into the host page's light DOM.

accessibility_requirements:
  - Base class enforces that every subclass sets an accessible role/name before first paint
    (fails a lint/test rule otherwise).

observability_requirements:
  - Emits mount/unmount/rebind lifecycle events for later telemetry wiring.

tests_required:
  unit: true
  integration: true
  e2e: false

acceptance_criteria:
  - A throwaway test component built on this base mounts into a fixture page's Shadow DOM,
    survives a simulated SPA re-render, and unmounts cleanly with no detached listeners.

deliverables:
  - packages/web-components/ (base framework, no product components yet)

integration_notes:
  - WP-011 depends on this; keep the public API surface small and documented since multiple
    concrete components will extend it in parallel.

risks:
  - Cross-boundary ARIA referencing (ADR-009 open question) — flag, do not silently drop.

definition_of_done:
  - Merged, documented, one working example component demonstrates the lifecycle end-to-end.
