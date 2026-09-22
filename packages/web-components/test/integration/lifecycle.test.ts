/**
 * Integration: simulates a SPA re-render scenario.
 * A fixture DOM has a target element; the adapter mounts, survives a rebind,
 * and unmounts cleanly with no detached listeners.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { AuaElement } from "../../src/index.js";

// ── Fixture component ────────────────────────────────────────────────────────

class A11yIntegrationTest extends AuaElement {
  renderCount = 0;

  get accessibleRole() { return "region"; }
  get accessibleName() { return "Integration Test Adapter"; }

  protected render(root: ShadowRoot): void {
    this.renderCount++;
    const label = document.createElement("p");
    label.textContent = `Render #${this.renderCount} → target: ${this.targetElementId}`;
    root.appendChild(label);
  }
}
customElements.define("a11y-integration-test", A11yIntegrationTest);

// ── Helpers ──────────────────────────────────────────────────────────────────

type RecordedEvent = { type: string; detail: Record<string, unknown> };

function listenAll(target: EventTarget, types: string[]): RecordedEvent[] {
  const log: RecordedEvent[] = [];
  for (const type of types) {
    target.addEventListener(type, (e) => {
      log.push({ type, detail: (e as CustomEvent).detail as Record<string, unknown> });
    });
  }
  return log;
}

const LIFECYCLE_EVENTS = ["aua:mount", "aua:unmount", "aua:rebind"];

// ── Tests ────────────────────────────────────────────────────────────────────

describe("SPA lifecycle integration", () => {
  let log: RecordedEvent[];
  let adapter: A11yIntegrationTest;

  beforeEach(() => {
    document.body.innerHTML = "";
    log = listenAll(document.body, LIFECYCLE_EVENTS);

    // Fixture: a target element the adapter will proxy
    const target = document.createElement("div");
    target.id = "spa-target";
    document.body.appendChild(target);

    adapter = document.createElement("a11y-integration-test") as A11yIntegrationTest;
    adapter.targetElementId = "spa-target";
    adapter.semanticIntent = "show-price-control";
    adapter.adaptationConfig = {
      skillId: "inject_stepper",
      mountPoint: "adjacent",
      zIndexStrategy: "isolated-stacking-context",
    };
  });

  it("emits aua:mount when connected", () => {
    document.body.appendChild(adapter);

    const mounts = log.filter((e) => e.type === "aua:mount");
    expect(mounts).toHaveLength(1);
    expect(mounts[0]?.detail["targetElementId"]).toBe("spa-target");
  });

  it("calls render() exactly once on initial mount", () => {
    document.body.appendChild(adapter);
    expect(adapter.renderCount).toBe(1);
  });

  it("emits aua:rebind and re-renders when SPA swaps target element", () => {
    document.body.appendChild(adapter);
    expect(adapter.renderCount).toBe(1);

    // SPA removes old target and creates a new one (new id)
    document.getElementById("spa-target")?.remove();
    const newTarget = document.createElement("div");
    newTarget.id = "spa-target-v2";
    document.body.appendChild(newTarget);

    adapter.rebind("spa-target-v2");

    const rebinds = log.filter((e) => e.type === "aua:rebind");
    expect(rebinds).toHaveLength(1);
    expect(rebinds[0]?.detail["targetElementId"]).toBe("spa-target-v2");
    expect(adapter.targetElementId).toBe("spa-target-v2");
    expect(adapter.renderCount).toBe(2);
  });

  it("emits aua:unmount when disconnected", () => {
    document.body.appendChild(adapter);
    document.body.removeChild(adapter);

    const unmounts = log.filter((e) => e.type === "aua:unmount");
    expect(unmounts).toHaveLength(1);
    expect(unmounts[0]?.detail["targetElementId"]).toBe("spa-target");
  });

  it("full lifecycle: mount → rebind → unmount emits events in correct order", () => {
    document.body.appendChild(adapter);

    const newTarget = document.createElement("div");
    newTarget.id = "spa-target-final";
    document.body.appendChild(newTarget);
    adapter.rebind("spa-target-final");

    document.body.removeChild(adapter);

    expect(log.map((e) => e.type)).toEqual(["aua:mount", "aua:rebind", "aua:unmount"]);
  });

  it("survives SPA re-render: re-mount after disconnect works cleanly", () => {
    document.body.appendChild(adapter);
    document.body.removeChild(adapter);

    // Re-add the original target in case it was removed
    if (!document.getElementById("spa-target")) {
      const t = document.createElement("div");
      t.id = "spa-target";
      document.body.appendChild(t);
    }

    document.body.appendChild(adapter);

    const mounts = log.filter((e) => e.type === "aua:mount");
    expect(mounts).toHaveLength(2);
    expect(adapter.renderCount).toBe(2);
  });

  it("no aua:mount fired when target element is absent", () => {
    document.getElementById("spa-target")?.remove();

    adapter.targetElementId = "definitely-missing";
    document.body.appendChild(adapter);

    const mounts = log.filter((e) => e.type === "aua:mount");
    expect(mounts).toHaveLength(0);
  });

  it("adaptationConfig fields are set before mount", () => {
    document.body.appendChild(adapter);
    expect(adapter.adaptationConfig.skillId).toBe("inject_stepper");
    expect(adapter.adaptationConfig.mountPoint).toBe("adjacent");
    expect(adapter.adaptationConfig.zIndexStrategy).toBe("isolated-stacking-context");
  });
});
