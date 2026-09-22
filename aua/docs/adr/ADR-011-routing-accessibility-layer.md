# ADR-011: Accessible Routing Layer

**Status:** ACCEPTED | **Date:** 2026-09-22 | **Owners:** Browser Extension Architect

## Context
SPA navigation frequently breaks screen-reader focus/announcement expectations (Section 3.8).

## Decision
Framework-agnostic observation only: intercept `history.pushState`/`replaceState` (via
monkey-patching in the page-context bridge, since these are not observable events by default),
listen to native `popstate`, and correlate with DOM mutation/heading-change signals to detect
navigations that don't use the History API at all (fragment-based routers, full re-renders).
Optional framework adapters (React Router, Vue Router, etc.) may subscribe to
richer native events **where present**, layered on top of, never replacing, the
framework-agnostic baseline.

## Capabilities
Route-change announcement via `<a11y-live-region>`, logical focus restoration to the page's
main heading or primary landmark, accessible breadcrumb abstraction derived from the
`SemanticPageModel`'s `navigation` array, back/forward handling, "next logical action" hinting
sourced from `page.mainIntent`.

## Failure modes
Ambiguous/no detectable route change signal on a poorly-instrumented SPA → falls back to
heading-mutation heuristics; if none available, no false announcement is made (silence is safer
than an incorrect announcement).

## Consequences
Framework adapters are optional enhancements, not dependencies — keeps the baseline working on
any SPA without per-framework integration work, per Section 3.8's explicit requirement.

## Revisit triggers
New History API standards (e.g., Navigation API) reaching broad support — track as an upgrade
path, not a blocking dependency.

## References
Section 3.8.
