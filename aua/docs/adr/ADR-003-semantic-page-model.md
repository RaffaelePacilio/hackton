# ADR-003: Semantic Page Model

**Status:** ACCEPTED | **Date:** 2026-09-22 | **Owners:** Principal Architect, Browser Extension Architect

## Context
Raw DOM is too large, too noisy, and too privacy-sensitive to hand an LLM directly. We need a
deterministic intermediate representation.

## Decision drivers
Token-efficiency, incremental update cost, ability to express relationships (labels, form
ownership), redaction correctness.

## Options considered: Tree | Graph | Hybrid graph/tree | Event-sourced state | Normalized entities

## Decision matrix

| Criterion (weight) | Tree | Graph | Hybrid (chosen) | Event-sourced |
|---|---|---|---|---|
| Incremental diff cost (5) | 5 | 2 | 4 | 3 |
| Expresses non-tree relations (4) | 1 | 5 | 5 | 3 |
| Implementation complexity (3, lower=better score) | 5 | 2 | 3 | 2 |
| Serialization simplicity (3) | 5 | 2 | 4 | 2 |

## Decision
Internal model is a **DOM-shaped tree** (cheap `MutationObserver`-aligned incremental diffing)
**augmented with an explicit relationship graph** for `labelledBy`/`describedBy`/`controls`/
`formOwner` edges that are not tree-shaped. External/serialized form is a flat, redacted JSON
projection (`SemanticPageModel` in `docs/contracts/semantic-page-model.md`).

## Element identity strategy
Stable `ElementId` derived from a composite key (DOM path shape + role + accessible name +
a monotonic disambiguator), persisted across re-renders that preserve semantic identity (e.g.
React re-render of the same logical field) but correctly invalidated when the element is
genuinely removed. Framework re-mounts that change the underlying DOM node but not the semantic
role/position are treated as the *same* logical element — this heuristic is a documented,
tunable component, not a guarantee (NEEDS VERIFICATION against real SPA re-render patterns in
Phase 2 vertical slice).

## Lifecycle, invalidation, caching
See `docs/contracts/semantic-page-model.md` "Lifecycle" section — full build on load/route
change, incremental diff on mutation, last-known-good retained during rebuild.

## Token-reduction strategy for AI models
Only `regions`, `forms`, `navigation`, `actions`, `dialogs`, `errors` reach the LLM by default,
with `visibleElements` filtering out off-screen/hidden nodes; `sensitive` elements are redacted
per the shared `redact.ts` function. Full-page summarization requests get a further-compressed
"landmarks + primary actions" view rather than the full element list.

## Security/Privacy considerations
Redaction is enforced at serialization, not by consumer discipline (see contract doc). This is
the single most safety-critical function in the codebase and requires 100% branch test coverage
as a release gate.

## Failure modes
Model build failure on pathological pages (huge DOM, infinite mutation loops) → capped
element-count and mutation-rate limiter, degrading to "landmarks only" rather than hanging the
tab.

## Consequences
Extra complexity vs. a plain tree, justified by correctness of relationship-dependent barrier
detection (e.g., a control's accessible name coming from an external label).

## Revisit triggers
If profiling in Phase 2 shows incremental diff cost dominates frame budget on real sites.

## References
Section 3.2.
