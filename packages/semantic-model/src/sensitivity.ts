// sensitivity.ts — flags elements whose *value* must never leave the
// browser-extension process unredacted (Scenario E,
// `aua/docs/architecture/04-runtime-flows.md`). This function only decides
// IF an element is sensitive; the actual redaction (stripping `state` down
// to `{ hasValue }`) lives once, in `@aua/contracts`'s `redact()` — never
// duplicated here.

const SENSITIVE_AUTOCOMPLETE_VALUES = new Set([
  "cc-number",
  "cc-csc",
  "cc-exp",
  "cc-exp-month",
  "cc-exp-year",
  "current-password",
  "new-password",
]);

const SSN_PATTERN = /ssn|social.?security/i;

export function inferSensitive(el: Element): boolean {
  const type = (el.getAttribute("type") || "").toLowerCase();
  if (type === "password") return true;

  const autocomplete = (el.getAttribute("autocomplete") || "").toLowerCase();
  if (SENSITIVE_AUTOCOMPLETE_VALUES.has(autocomplete)) return true;
  if (autocomplete === "name") return false; // "name" alone is never sensitive by itself

  const name = el.getAttribute("name") || "";
  const id = el.getAttribute("id") || "";
  if (SSN_PATTERN.test(name) || SSN_PATTERN.test(id) || SSN_PATTERN.test(autocomplete)) {
    return true;
  }

  return false;
}
