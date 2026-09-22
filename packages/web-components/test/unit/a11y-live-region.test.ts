import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { A11yLiveRegion } from "../../src/adapters/a11y-live-region.js";

// ── Helpers ──────────────────────────────────────────────────────────────────

// See a11y-field-proxy.test.ts for why this is needed: AuaElement always
// attaches a CLOSED shadow root, so tests force attachShadow() to open mode
// to assert on rendered content.
function forceOpenShadow(): () => void {
  const original = Element.prototype.attachShadow;
  Element.prototype.attachShadow = function (init: ShadowRootInit): ShadowRoot {
    return original.call(this, { ...init, mode: "open" });
  };
  return () => {
    Element.prototype.attachShadow = original;
  };
}

function createTarget(id: string): HTMLElement {
  const el = document.createElement("div");
  el.id = id;
  document.body.appendChild(el);
  return el;
}

function mountLiveRegion(targetId: string, attrs: Record<string, string> = {}): A11yLiveRegion {
  const el = document.createElement("a11y-live-region") as A11yLiveRegion;
  el.targetElementId = targetId;
  for (const [name, value] of Object.entries(attrs)) {
    el.setAttribute(name, value);
  }
  document.body.appendChild(el);
  return el;
}

function shadowOf(el: A11yLiveRegion): ShadowRoot {
  const root = el.shadowRoot;
  if (!root) throw new Error("expected an accessible shadow root (did forceOpenShadow run?)");
  return root;
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe("A11yLiveRegion", () => {
  let restoreShadow: () => void;

  beforeEach(() => {
    document.body.innerHTML = "";
    restoreShadow = forceOpenShadow();
    vi.useFakeTimers();
  });

  afterEach(() => {
    restoreShadow();
    vi.useRealTimers();
  });

  it("renders a role=status div with default polite/non-atomic ARIA state", () => {
    createTarget("l1");
    const el = mountLiveRegion("l1");
    const div = shadowOf(el).querySelector("div");

    expect(div).not.toBeNull();
    expect(div?.getAttribute("role")).toBe("status");
    expect(div?.getAttribute("aria-live")).toBe("polite");
    expect(div?.getAttribute("aria-atomic")).toBe("false");
  });

  it("accessibleRole is status and accessibleName is non-empty", () => {
    createTarget("l2");
    const el = mountLiveRegion("l2");
    expect(el.accessibleRole).toBe("status");
    expect(el.accessibleName.length).toBeGreaterThan(0);
  });

  it("announce() sets the div's textContent", () => {
    createTarget("l3");
    const el = mountLiveRegion("l3");
    const div = shadowOf(el).querySelector("div") as HTMLDivElement;

    el.announce("Item added to cart");

    expect(div.textContent).toBe("Item added to cart");
  });

  it("clearAfterMs clears the message after the given timeout", () => {
    createTarget("l4");
    const el = mountLiveRegion("l4");
    const div = shadowOf(el).querySelector("div") as HTMLDivElement;

    el.announce("Saved", 2000);
    expect(div.textContent).toBe("Saved");

    vi.advanceTimersByTime(1999);
    expect(div.textContent).toBe("Saved");

    vi.advanceTimersByTime(1);
    expect(div.textContent).toBe("");
  });

  it("a second announce() before the first's timeout cancels the first clear and keeps the new message", () => {
    createTarget("l5");
    const el = mountLiveRegion("l5");
    const div = shadowOf(el).querySelector("div") as HTMLDivElement;

    el.announce("First message", 1000);
    vi.advanceTimersByTime(500);

    el.announce("Second message", 1000);
    // The first announce's clear (originally due at t=1000) must not fire and
    // wipe out the second message.
    vi.advanceTimersByTime(500);
    expect(div.textContent).toBe("Second message");

    // The second announce's own timeout still fires on schedule.
    vi.advanceTimersByTime(500);
    expect(div.textContent).toBe("");
  });

  it("announce() without clearAfterMs leaves the message in place indefinitely", () => {
    createTarget("l6");
    const el = mountLiveRegion("l6");
    const div = shadowOf(el).querySelector("div") as HTMLDivElement;

    el.announce("Persistent message");
    vi.advanceTimersByTime(60_000);

    expect(div.textContent).toBe("Persistent message");
  });

  it("politeness attribute reflects onto aria-live without clearing the announced message", () => {
    createTarget("l7");
    const el = mountLiveRegion("l7", { politeness: "polite" });
    const div = shadowOf(el).querySelector("div") as HTMLDivElement;

    el.announce("Urgent update");
    el.setAttribute("politeness", "assertive");

    expect(div.getAttribute("aria-live")).toBe("assertive");
    expect(div.textContent).toBe("Urgent update");
  });

  it("atomic attribute reflects onto aria-atomic", () => {
    createTarget("l8");
    const el = mountLiveRegion("l8");
    const div = shadowOf(el).querySelector("div") as HTMLDivElement;

    el.setAttribute("atomic", "");
    expect(div.getAttribute("aria-atomic")).toBe("true");

    el.removeAttribute("atomic");
    expect(div.getAttribute("aria-atomic")).toBe("false");
  });

  it("unrecognized politeness values fall back to polite", () => {
    createTarget("l9");
    const el = mountLiveRegion("l9", { politeness: "loud" });
    const div = shadowOf(el).querySelector("div") as HTMLDivElement;
    expect(div.getAttribute("aria-live")).toBe("polite");
  });
});
