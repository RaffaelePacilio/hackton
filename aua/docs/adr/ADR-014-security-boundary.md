# ADR-014: Security Boundary

**Status:** ACCEPTED | **Date:** 2026-09-22 | **Owners:** Security & Privacy Architect

## Threat model (summary; full model tracked as a living document alongside this ADR)

| Threat | Mitigation |
|---|---|
| Prompt injection via page content (a page instructs the LLM through hidden text) | Redacted `SemanticPageModel` strips free-form text where possible; reasoning outputs are constrained to `{skillId, inputs}` validated against schema — injected instructions cannot escape into arbitrary action, only into a mis-selected but still-registry-bound skill, which the confirmation policy further gates for anything above WRITE_LOW_RISK |
| Malicious DOM content / tool injection | Skill Executor is the only execution surface (ADR-008); no `eval`, no dynamic code from page or LLM |
| Cross-site data leakage | Extension enforces per-origin isolation of `InteractionContract`/session state; no cross-origin `SemanticPageModel` sharing |
| Arbitrary JS execution | Prohibited by construction (ADR-008) |
| Extension privilege abuse | Least-privilege permission model (ADR-002): `activeTab`, `scripting`, `storage`, incremental host permissions |
| DOM exfiltration | Redaction at serialization boundary (ADR-003); telemetry redaction (ADR-015/016) |
| PII / password / payment handling | `sensitive` flag strips values before any upstream transmission (ADR-003); AUTHENTICATE/PAYMENT capability classes require explicit per-action confirmation, never automatic (skill-contract.md) |
| CSP / iframe isolation | Extension-origin resources only, no inline eval (ADR-002); cross-origin iframes are a documented coverage boundary |
| Extension messaging | Origin-checked, versioned `postMessage` envelope only (ADR-002) |
| Mobile pairing / replay | Single-use ephemeral tokens, short TTL, backend-mediated (ADR-012) |
| Confused deputy (mobile/voice command triggering unintended browser action) | Mobile/voice commands enter through the same `UserIntent` contract and same confirmation gating as any other input — no privileged bypass path |
| Model/provider data retention | Contractually reviewed per provider/deployment (ADR-006, ADR-007); redaction reduces exposure regardless of provider policy |
| Logs containing sensitive information | `AuditEvent.redacted` is enforced true for any event touching a `sensitive` element; redaction is a shared library function, not per-emitter discipline |

## Capability classes and execution mode
Defined once in `docs/contracts/skill-contract.md` and enforced in the Skill Executor
(browser-side), which independently re-validates capability class regardless of what the
Adaptation Planner requests — this is a deliberate defense-in-depth: a compromised or
misled reasoning step cannot escalate its own permissions.

## LLMs never receive unrestricted privileged browser APIs
This is a hard invariant (Section 22). Reasoning providers (ADR-006) receive only redacted
`SemanticPageModel` slices and return schema-constrained structured output; they hold no browser
API access of any kind.

## Consequences
Defense-in-depth adds implementation cost (schema validation at multiple layers) — accepted as
non-negotiable given the platform's privileged position on third-party pages.

## Revisit triggers
Any new skill with capability class SUBMIT or above must pass a security review against this
ADR before merge (quality gate, Section 18).

## References
Section 3.14, 22.
