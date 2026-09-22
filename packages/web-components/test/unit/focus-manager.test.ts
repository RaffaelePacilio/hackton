import { describe, it, expect, beforeEach, vi } from "vitest";
import { trapFocus, restoreFocus } from "../../src/index.js";

// ── Helpers ──────────────────────────────────────────────────────────────────

function buildShadowWithButtons(count: number): {
  host: HTMLElement;
  shadow: ShadowRoot;
  buttons: HTMLButtonElement[];
} {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const shadow = host.attachShadow({ mode: "open" });

  const buttons: HTMLButtonElement[] = [];
  for (let i = 0; i < count; i++) {
    const btn = document.createElement("button");
    btn.textContent = `btn-${i}`;
    shadow.appendChild(btn);
    buttons.push(btn);
  }
  return { host, shadow, buttons };
}

function tab(target: ShadowRoot, shift = false): void {
  const event = new KeyboardEvent("keydown", {
    key: "Tab",
    shiftKey: shift,
    bubbles: true,
    cancelable: true,
  });
  target.dispatchEvent(event);
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe("trapFocus", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("returns a cleanup function", () => {
    const { shadow } = buildShadowWithButtons(2);
    const cleanup = trapFocus(shadow);
    expect(typeof cleanup).toBe("function");
    cleanup();
  });

  it("wraps Tab from last button back to first", () => {
    const { shadow, buttons } = buildShadowWithButtons(3);
    trapFocus(shadow);

    const last = buttons[2]!;
    last.focus();
    // Simulate activeElement being the last button
    Object.defineProperty(shadow, "activeElement", { get: () => last, configurable: true });

    const prevented: boolean[] = [];
    shadow.addEventListener("keydown", (e) => prevented.push(e.defaultPrevented), { once: true });

    tab(shadow, false);
    // first button should receive focus
    expect(prevented[0]).toBe(true);
  });

  it("wraps Shift-Tab from first button back to last", () => {
    const { shadow, buttons } = buildShadowWithButtons(3);
    trapFocus(shadow);

    const first = buttons[0]!;
    Object.defineProperty(shadow, "activeElement", { get: () => first, configurable: true });

    const prevented: boolean[] = [];
    shadow.addEventListener("keydown", (e) => prevented.push(e.defaultPrevented), { once: true });

    tab(shadow, true);
    expect(prevented[0]).toBe(true);
  });

  it("does not intercept non-Tab keys", () => {
    const { shadow } = buildShadowWithButtons(2);
    trapFocus(shadow);

    const event = new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true });
    shadow.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
  });

  it("cleanup removes the keydown listener", () => {
    const { shadow, buttons } = buildShadowWithButtons(2);
    const cleanup = trapFocus(shadow);

    const last = buttons[1]!;
    Object.defineProperty(shadow, "activeElement", { get: () => last, configurable: true });

    cleanup();

    const prevented: boolean[] = [];
    shadow.addEventListener("keydown", (e) => prevented.push(e.defaultPrevented), { once: true });
    tab(shadow, false);
    expect(prevented[0]).toBe(false);
  });

  it("no-ops when shadow root has no focusable elements", () => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    const shadow = host.attachShadow({ mode: "open" });
    shadow.appendChild(document.createElement("span"));

    trapFocus(shadow);
    // Should not throw
    expect(() => tab(shadow)).not.toThrow();
  });
});

describe("restoreFocus", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("calls .focus() on a connected HTMLElement", () => {
    const btn = document.createElement("button");
    document.body.appendChild(btn);
    const focusSpy = vi.spyOn(btn, "focus");

    restoreFocus(btn);

    expect(focusSpy).toHaveBeenCalledOnce();
  });

  it("no-ops when target is null", () => {
    expect(() => restoreFocus(null)).not.toThrow();
  });

  it("no-ops when target is disconnected", () => {
    const btn = document.createElement("button");
    // not appended to document — not connected
    const focusSpy = vi.spyOn(btn, "focus");

    restoreFocus(btn);

    expect(focusSpy).not.toHaveBeenCalled();
  });

  it("no-ops when target is a non-HTMLElement (e.g. SVGElement)", () => {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    document.body.appendChild(svg);
    // SVGElement is not an HTMLElement — should no-op without throwing
    expect(() => restoreFocus(svg)).not.toThrow();
  });
});
