import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { A11yFieldProxy } from "../../src/adapters/a11y-field-proxy.js";

// ── Helpers ──────────────────────────────────────────────────────────────────

// AuaElement always attaches a CLOSED shadow root (ADR-009), so `el.shadowRoot`
// is null from outside by design. To assert on rendered content we temporarily
// force attachShadow() to open mode — production code is unaffected since only
// tests install this patch, and AuaElement itself doesn't care about the mode.
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

function mountProxy(
  targetId: string,
  attrs: Record<string, string> = {}
): A11yFieldProxy {
  const el = document.createElement("a11y-field-proxy") as A11yFieldProxy;
  el.targetElementId = targetId;
  for (const [name, value] of Object.entries(attrs)) {
    el.setAttribute(name, value);
  }
  document.body.appendChild(el);
  return el;
}

function shadowOf(el: A11yFieldProxy): ShadowRoot {
  const root = el.shadowRoot;
  if (!root) throw new Error("expected an accessible shadow root (did forceOpenShadow run?)");
  return root;
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe("A11yFieldProxy", () => {
  let restoreShadow: () => void;

  beforeEach(() => {
    document.body.innerHTML = "";
    restoreShadow = forceOpenShadow();
  });

  afterEach(() => {
    restoreShadow();
  });

  it("renders label, input, and error span on mount", () => {
    createTarget("f1");
    const el = mountProxy("f1", { label: "Email address", "field-type": "email" });

    const root = shadowOf(el);
    const label = root.getElementById("proxy-label");
    const input = root.querySelector("input");
    const error = root.querySelector('[part="error"]');

    expect(label?.textContent).toBe("Email address");
    expect(input).not.toBeNull();
    expect(input?.type).toBe("email");
    expect(input?.getAttribute("aria-labelledby")).toBe("proxy-label");
    expect(error).not.toBeNull();
    expect(error?.getAttribute("role")).toBe("alert");
    expect(error?.textContent).toBe("");
  });

  it("defaults field-type to text when omitted", () => {
    createTarget("f2");
    const el = mountProxy("f2", { label: "Name" });
    const input = shadowOf(el).querySelector("input");
    expect(input?.type).toBe("text");
  });

  it("updates the shadow input when the value attribute changes externally", () => {
    createTarget("f3");
    const el = mountProxy("f3", { label: "Name", value: "initial" });
    const input = shadowOf(el).querySelector("input") as HTMLInputElement;
    expect(input.value).toBe("initial");

    el.setAttribute("value", "updated");

    expect(input.value).toBe("updated");
  });

  it("does not dispatch a11y-value-change when the value attribute is set externally", () => {
    createTarget("f4");
    const el = mountProxy("f4", { label: "Name", value: "initial" });

    const handler = vi.fn();
    el.addEventListener("a11y-value-change", handler);

    el.setAttribute("value", "updated-externally");

    expect(handler).not.toHaveBeenCalled();
  });

  it("dispatches a11y-value-change with correct detail on the host when the shadow input is typed in", () => {
    createTarget("f5");
    const el = mountProxy("f5", { label: "Name" });
    el.targetElementId = "f5";
    const input = shadowOf(el).querySelector("input") as HTMLInputElement;

    let receivedDetail: { value: string; targetElementId: string } | null = null;
    el.addEventListener("a11y-value-change", (e) => {
      receivedDetail = (e as CustomEvent).detail;
    });

    input.value = "typed value";
    input.dispatchEvent(new Event("input", { bubbles: true }));

    expect(receivedDetail).toEqual({ value: "typed value", targetElementId: "f5" });
  });

  it("a11y-value-change is composed so it crosses the shadow boundary", () => {
    createTarget("f6");
    const el = mountProxy("f6", { label: "Name" });
    const input = shadowOf(el).querySelector("input") as HTMLInputElement;

    let received: CustomEvent | null = null;
    el.addEventListener("a11y-value-change", (e) => {
      received = e as CustomEvent;
    });

    input.dispatchEvent(new Event("input", { bubbles: true }));

    expect(received).not.toBeNull();
    expect(received!.composed).toBe(true);
    expect(received!.bubbles).toBe(true);
  });

  it("error-message attribute sets aria-invalid and populates the error span", () => {
    createTarget("f7");
    const el = mountProxy("f7", { label: "Name" });
    const root = shadowOf(el);
    const input = root.querySelector("input") as HTMLInputElement;
    const error = root.querySelector('[part="error"]') as HTMLElement;

    expect(input.getAttribute("aria-invalid")).toBeNull();

    el.setAttribute("error-message", "This field is required");

    expect(input.getAttribute("aria-invalid")).toBe("true");
    expect(error.textContent).toBe("This field is required");

    el.setAttribute("error-message", "");

    expect(input.getAttribute("aria-invalid")).toBeNull();
    expect(error.textContent).toBe("");
  });

  it("required attribute reflects onto the shadow input", () => {
    createTarget("f8");
    const el = mountProxy("f8", { label: "Name" });
    const input = shadowOf(el).querySelector("input") as HTMLInputElement;
    expect(input.required).toBe(false);

    el.setAttribute("required", "");

    expect(input.required).toBe(true);
  });

  it("falls back to a non-empty accessible name and warns when label is empty", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    createTarget("f9");
    const el = mountProxy("f9");

    expect(el.accessibleName).toBe("Field");
    expect(el.accessibleName.length).toBeGreaterThan(0);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("Empty"),
      expect.anything()
    );

    warnSpy.mockRestore();
  });

  it("uses the label attribute as the accessible name when non-empty", () => {
    createTarget("f10");
    const el = mountProxy("f10", { label: "Phone number" });
    expect(el.accessibleName).toBe("Phone number");
  });

  it("accessibleRole is textbox", () => {
    createTarget("f11");
    const el = mountProxy("f11", { label: "Name" });
    expect(el.accessibleRole).toBe("textbox");
  });
});
