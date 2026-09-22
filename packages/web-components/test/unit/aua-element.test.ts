import { describe, it, expect, beforeEach, vi } from "vitest";
import { AuaElement } from "../../src/index.js";

// ── Concrete test subclasses ────────────────────────────────────────────────

class ValidAdapter extends AuaElement {
  get accessibleRole() { return "region"; }
  get accessibleName() { return "Test Adapter"; }
  protected render(root: ShadowRoot): void {
    const btn = document.createElement("button");
    btn.textContent = "ok";
    root.appendChild(btn);
  }
}
customElements.define("test-valid-adapter", ValidAdapter);

class EmptyRoleAdapter extends AuaElement {
  get accessibleRole() { return ""; }
  get accessibleName() { return "name"; }
  protected render(_root: ShadowRoot): void { /* no-op */ }
}
customElements.define("test-empty-role-adapter", EmptyRoleAdapter);

class EmptyNameAdapter extends AuaElement {
  get accessibleRole() { return "region"; }
  get accessibleName() { return ""; }
  protected render(_root: ShadowRoot): void { /* no-op */ }
}
customElements.define("test-empty-name-adapter", EmptyNameAdapter);

// ── Helpers ─────────────────────────────────────────────────────────────────

function createTarget(id: string): HTMLElement {
  const el = document.createElement("div");
  el.id = id;
  document.body.appendChild(el);
  return el;
}

function createAdapter(tag: string, targetId: string): AuaElement {
  const adapter = document.createElement(tag) as AuaElement;
  adapter.targetElementId = targetId;
  return adapter;
}

function collectEvents(
  source: EventTarget,
  types: string[]
): CustomEvent[] {
  const events: CustomEvent[] = [];
  for (const type of types) {
    source.addEventListener(type, (e) => events.push(e as CustomEvent));
  }
  return events;
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe("AuaElement", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("emits aua:mount when connected with a valid targetElementId", () => {
    createTarget("t1");
    const adapter = createAdapter("test-valid-adapter", "t1");
    const events = collectEvents(document.body, ["aua:mount"]);

    document.body.appendChild(adapter);

    expect(events).toHaveLength(1);
    expect(events[0]?.detail.targetElementId).toBe("t1");
    expect(events[0]?.detail.elementTag).toBe("test-valid-adapter");
  });

  it("emits aua:unmount when disconnected", () => {
    createTarget("t2");
    const adapter = createAdapter("test-valid-adapter", "t2");
    document.body.appendChild(adapter);

    const events = collectEvents(document.body, ["aua:unmount"]);
    document.body.removeChild(adapter);

    expect(events).toHaveLength(1);
    expect(events[0]?.detail.targetElementId).toBe("t2");
  });

  it("does not mount (no throw, warn only) when targetElementId element is absent", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const adapter = createAdapter("test-valid-adapter", "nonexistent-id");
    const events = collectEvents(document.body, ["aua:mount"]);

    document.body.appendChild(adapter);

    expect(events).toHaveLength(0);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("nonexistent-id"),
    );
    warnSpy.mockRestore();
  });

  it("does not mount when targetElementId is empty string", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const adapter = document.createElement("test-valid-adapter") as AuaElement;
    // targetElementId defaults to ""
    const events = collectEvents(document.body, ["aua:mount"]);

    document.body.appendChild(adapter);

    expect(events).toHaveLength(0);
    warnSpy.mockRestore();
  });

  it("throws when accessibleRole is empty", () => {
    createTarget("t3");
    const adapter = createAdapter("test-empty-role-adapter", "t3");
    expect(() => document.body.appendChild(adapter)).toThrowError(
      /accessibleRole and accessibleName must be non-empty/
    );
  });

  it("throws when accessibleName is empty", () => {
    createTarget("t4");
    const adapter = createAdapter("test-empty-name-adapter", "t4");
    expect(() => document.body.appendChild(adapter)).toThrowError(
      /accessibleRole and accessibleName must be non-empty/
    );
  });

  it("emits aua:rebind and re-renders when rebind() is called", () => {
    createTarget("t5");
    createTarget("t5b");
    const adapter = createAdapter("test-valid-adapter", "t5");
    document.body.appendChild(adapter);

    const events = collectEvents(document.body, ["aua:rebind"]);
    (adapter as ValidAdapter).rebind("t5b");

    expect(events).toHaveLength(1);
    expect(events[0]?.detail.targetElementId).toBe("t5b");
    expect(adapter.targetElementId).toBe("t5b");
  });

  it("emits aua:rebind with warning when rebind() target is missing", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    createTarget("t6");
    const adapter = createAdapter("test-valid-adapter", "t6");
    document.body.appendChild(adapter);

    const events = collectEvents(document.body, ["aua:rebind"]);
    (adapter as ValidAdapter).rebind("missing");

    expect(events).toHaveLength(1);
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("missing"));
    warnSpy.mockRestore();
  });

  it("survives reconnect after disconnect", () => {
    createTarget("t7");
    const adapter = createAdapter("test-valid-adapter", "t7");

    const mountEvents = collectEvents(document.body, ["aua:mount"]);
    const unmountEvents = collectEvents(document.body, ["aua:unmount"]);

    document.body.appendChild(adapter);
    expect(mountEvents).toHaveLength(1);

    document.body.removeChild(adapter);
    expect(unmountEvents).toHaveLength(1);

    document.body.appendChild(adapter);
    expect(mountEvents).toHaveLength(2);
  });

  it("lifecycle event detail includes a numeric timestamp", () => {
    createTarget("t8");
    const adapter = createAdapter("test-valid-adapter", "t8");
    const events = collectEvents(document.body, ["aua:mount"]);

    document.body.appendChild(adapter);

    expect(typeof events[0]?.detail.timestamp).toBe("number");
    expect(events[0]?.detail.timestamp).toBeGreaterThan(0);
  });

  it("lifecycle events are composed (cross Shadow DOM boundary)", () => {
    createTarget("t9");
    const adapter = createAdapter("test-valid-adapter", "t9");
    const events = collectEvents(document.body, ["aua:mount"]);

    document.body.appendChild(adapter);

    expect(events[0]?.composed).toBe(true);
    expect(events[0]?.bubbles).toBe(true);
  });
});
