# ADR-002: Browser Extension Architecture

**Status:** ACCEPTED | **Date:** 2026-09-22 | **Owners:** Browser Extension Architect

## Context
Must read/observe/modify third-party pages across browsers, respecting CSP, isolated worlds,
Shadow DOM, and iframes.

## Decision
**Manifest V3**, WebExtensions-compatible where feasible (Chrome, Edge, Firefox MV3 support
varies — see below), structured as:

- **Content script** (isolated world) — DOM read + `MutationObserver`, builds
  `SemanticPageModel` locally, injects Web Components into the page's DOM via Shadow DOM roots
  it creates (not requiring page-context execution for the accessible adapters themselves).
- **Page-context bridge** (a narrowly scoped injected script) — required only where isolated
  worlds cannot observe framework-internal state (e.g., some React fiber inspection edge cases,
  NEEDS VERIFICATION per target framework). Communicates with the content script via
  `window.postMessage` with an origin-checked, versioned message envelope — never `eval`.
- **Service worker** (background) — session lifecycle, backend communication, skill cache.

## Browser API availability (verification date: 2026-09-22)
- MV3 content scripts, `MutationObserver`, ARIA/accessible-name computation via
  `getComputedAccessibleNode`-class APIs: **NEEDS VERIFICATION per browser** — availability and
  behavior of accessibility-tree-adjacent APIs differs across Chromium and Firefox; do not
  assume feature parity. Treat these as an *optional enhancement* layer, with a DOM/ARIA-based
  computation fallback (accessible-name-and-description computation implemented locally) as the
  baseline that must work everywhere.
- Universally available: DOM read, `MutationObserver`, `history.pushState`/`popstate`
  interception, Shadow DOM creation, `postMessage`.
- Browser-specific: background page vs. service worker lifecycle differences (Firefox MV3
  timelines have historically lagged Chrome — **NEEDS VERIFICATION** against current Firefox
  release notes before committing a cross-browser ship date).

## Shadow DOM / iframe handling
Accessible Web Components are mounted in **closed or open Shadow DOM roots created by the
extension**, attached as siblings/overlays to the target element rather than replacing it
(Proxy/Adapter pattern, ADR-009). Cross-origin iframes are read-only from the extension's
perspective unless the iframe is same-origin or the site opts in; this is documented as a
**known coverage boundary**, not silently ignored.

## CSP implications
Injected Web Component styles/scripts run as extension-origin resources (via
`chrome.runtime.getURL` patterns), not inline strings, to remain compatible with strict target
site CSPs.

## Permission model
Minimum permissions requested: `activeTab`, `scripting`, `storage`. Host permissions requested
incrementally (optional permissions) rather than `<all_urls>` at install time, to reduce install
friction and align with least-privilege (ADR-014).

## Failure modes
Content script fails to inject (CSP/extension blocked by enterprise policy) → Bootstrap detects
and surfaces a clear "accessibility runtime unavailable on this page" state rather than failing
silently.

## Consequences
Firefox parity is a **tracked risk**, not assumed. Chromium-family browsers are the primary
target for v1.

## Revisit triggers
Any MV3 service worker lifecycle change from Chromium or Firefox release notes.

## Open questions
- Exact cross-browser accessibility-tree API parity — NEEDS VERIFICATION before ADR-009 finalizes
  its "optionally leverage browser accessibility-tree APIs" clause.

## References
Section 3.1.
