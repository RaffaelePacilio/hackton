/**
 * Infers the interaction capabilities required to operate an element of the
 * given `role`.
 *
 * This is a minimal, extensible table — not exhaustive coverage of every
 * possible role. The `"slider"` → `["pointer","drag"]` mapping is
 * acceptance-critical: it is Scenario B's fixture
 * (`aua/docs/architecture/04-runtime-flows.md`, "drag-only slider"), where a
 * drag-blocked slider must produce a `severity: "blocking"` Barrier
 * downstream.
 */
const REQUIRED_CAPABILITIES: Record<string, string[]> = {
  slider: ["pointer", "drag"],
  button: ["pointer", "keyboard"],
  link: ["pointer", "keyboard"],
  textbox: ["pointer", "keyboard"],
  spinbutton: ["pointer", "keyboard"],
};

export function inferRequiredCapabilities(role: string, _el: Element): string[] {
  return REQUIRED_CAPABILITIES[role] ?? [];
}
