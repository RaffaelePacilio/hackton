// sensitivity.ts — flags elements whose *value* must never leave the extension
// process unredacted (ADR-003 / ADR-015 data-minimization intent). This function
// only decides IF an element is sensitive; the actual redaction (stripping
// `state` down to `{ hasValue }`) lives once in `@aua/contracts`'s `redact()` —
// never duplicated here.

const SENSITIVE_AUTOCOMPLETE_TOKENS = ["cc-", "current-password", "new-password", "one-time-code"];
const SENSITIVE_NAME_PATTERN = /\b(password|ssn|card[-_ ]?number|cvv|cvc|pin)\b/i;

export function isSensitive(el: Element): boolean {
  const type = (el.getAttribute("type") || "").toLowerCase();
  const autocomplete = (el.getAttribute("autocomplete") || "").toLowerCase();
  const name = (el.getAttribute("name") || "").toLowerCase();
  const id = (el.getAttribute("id") || "").toLowerCase();

  // The single strongest, least ambiguous signal: the browser itself treats it
  // as a password field.
  if (type === "password") return true;

  // Autocomplete tokens that name a credential or payment field are sensitive
  // regardless of the input's declared `type` (sites frequently still use
  // type="text" for "new password" or one-time-code fields).
  if (SENSITIVE_AUTOCOMPLETE_TOKENS.some((token) => autocomplete.includes(token))) return true;

  // Fallback for fields with no autocomplete hint at all: match common
  // credential/payment identifiers in the field's own name/id. Hyphens and
  // underscores are common word separators in name/id attributes (e.g.
  // "user_ssn", "card-number") but `\b` doesn't treat "_" as a boundary
  // (it's a \w character), so normalize both to spaces before matching.
  const normalizedName = name.replace(/[-_]+/g, " ");
  const normalizedId = id.replace(/[-_]+/g, " ");
  if (SENSITIVE_NAME_PATTERN.test(normalizedName) || SENSITIVE_NAME_PATTERN.test(normalizedId)) {
    return true;
  }

  // Deliberately NOT sensitive: type="email" or autocomplete="username" alone.
  // An email/username by itself isn't a secret — only credential/payment
  // fields are, per ADR-015's data-minimization intent. No rule above matches
  // this case, so it falls through to `false`.
  return false;
}
