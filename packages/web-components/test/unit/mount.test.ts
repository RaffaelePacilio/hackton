import { describe, it, expect, beforeEach } from "vitest";
import { mountAdapter } from "../../src/adapters/mount.js";
import { A11yFieldProxy } from "../../src/adapters/a11y-field-proxy.js";
import { A11yLiveRegion } from "../../src/adapters/a11y-live-region.js";
import type { AccessibilityAdapter } from "../../src/types.js";

// ── Helpers ──────────────────────────────────────────────────────────────────

function createTarget(id: string): HTMLElement {
  const el = document.createElement("div");
  el.id = id;
  const parent = document.createElement("div");
  parent.appendChild(el);
  document.body.appendChild(parent);
  return el;
}

function fieldProxyConfig(targetId: string, mountPoint: "adjacent" | "overlay"): AccessibilityAdapter {
  return {
    targetElementId: targetId,
    semanticIntent: "collect-email",
    adaptationConfig: {
      skillId: "inject_field_proxy",
      mountPoint,
      zIndexStrategy: "isolated-stacking-context",
    },
  };
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe("mountAdapter", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("creates an <a11y-field-proxy> for skillId inject_field_proxy", () => {
    const target = createTarget("m1");
    const el = mountAdapter(target, fieldProxyConfig("m1", "adjacent"));

    expect(el.tagName.toLowerCase()).toBe("a11y-field-proxy");
    expect(el).toBeInstanceOf(A11yFieldProxy);
  });

  it("creates an <a11y-live-region> for skillId announce", () => {
    const target = createTarget("m2");
    const config: AccessibilityAdapter = {
      targetElementId: "m2",
      semanticIntent: "announce-cart-update",
      adaptationConfig: {
        skillId: "announce",
        mountPoint: "adjacent",
        zIndexStrategy: "isolated-stacking-context",
      },
    };

    const el = mountAdapter(target, config);

    expect(el.tagName.toLowerCase()).toBe("a11y-live-region");
    expect(el).toBeInstanceOf(A11yLiveRegion);
  });

  it("positions the element via insertAdjacentElement(afterend) for mountPoint: adjacent", () => {
    const target = createTarget("m3");
    const el = mountAdapter(target, fieldProxyConfig("m3", "adjacent"));

    expect(target.nextElementSibling).toBe(el);
    expect(el.parentElement).toBe(target.parentElement);
  });

  it("positions the element as an isolated overlay sibling for mountPoint: overlay", () => {
    const target = createTarget("m4");
    const el = mountAdapter(target, fieldProxyConfig("m4", "overlay"));

    expect(el.style.position).toBe("absolute");
    expect(el.style.isolation).toBe("isolate");
    expect(el.parentElement).toBe(target.parentElement);
  });

  it("sets targetElementId, semanticIntent, and adaptationConfig on the created element", () => {
    const target = createTarget("m5");
    const config = fieldProxyConfig("m5", "adjacent");
    const el = mountAdapter(target, config) as A11yFieldProxy;

    expect(el.targetElementId).toBe("m5");
    expect(el.semanticIntent).toBe("collect-email");
    expect(el.adaptationConfig).toEqual(config.adaptationConfig);
  });

  it("throws a clear Error for an unknown skillId", () => {
    const target = createTarget("m6");
    const config: AccessibilityAdapter = {
      targetElementId: "m6",
      semanticIntent: "unknown",
      adaptationConfig: {
        skillId: "not_a_real_skill",
        mountPoint: "adjacent",
        zIndexStrategy: "isolated-stacking-context",
      },
    };

    expect(() => mountAdapter(target, config)).toThrowError(/not_a_real_skill/);
  });
});
