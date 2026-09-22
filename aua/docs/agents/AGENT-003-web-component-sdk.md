agent_id: AGENT-WC-SDK

role: Web Component Framework Engineer

work_package: WP-003

required_context:
  - docs/architecture/01-system-context.md
  - docs/adr/ADR-009-web-component-adaptation.md

owned_paths:
  - packages/web-components/**

forbidden_paths:
  - packages/semantic-model/**
  - packages/agent-runtime/**
  - apps/**

mission: |
  Build the base custom-element class (Shadow DOM lifecycle, CSS isolation, focus management,
  mount/rebind/unmount) that every a11y-* component (built later in WP-011) will extend. Ship
  one throwaway example component proving the lifecycle works end-to-end, including surviving
  a simulated SPA re-render.

must_not:
  - implement any specific a11y-* product component (that is WP-011's job)
  - introduce a framework dependency (React/Vue/etc.) into this base package
  - inject scripts/styles into the host page's light DOM

validation:
  - unit tests
  - integration tests against a fixture page with simulated re-renders
  - lint / typecheck

handoff_output:
  - implementation summary
  - changed files
  - documented public API surface for WP-011 to build against
  - test evidence
  - unresolved integration issues (esp. cross-shadow-boundary ARIA referencing, ADR-009 open question)
