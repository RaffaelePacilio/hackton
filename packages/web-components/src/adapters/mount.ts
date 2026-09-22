import type { AccessibilityAdapter } from "../types.js";
import { A11yFieldProxy } from "./a11y-field-proxy.js";
import { A11yLiveRegion } from "./a11y-live-region.js";

/**
 * Creates and mounts the concrete adapter for `config.adaptationConfig.skillId`,
 * positioning it relative to `targetEl` per `config.adaptationConfig.mountPoint`
 * (ADR-009: injected alongside the original element, never replacing it).
 */
export function mountAdapter(targetEl: Element, config: AccessibilityAdapter): HTMLElement {
  const { skillId, mountPoint } = config.adaptationConfig;

  let el: A11yFieldProxy | A11yLiveRegion;
  switch (skillId) {
    case "inject_field_proxy":
      el = document.createElement("a11y-field-proxy") as A11yFieldProxy;
      break;
    case "announce":
      el = document.createElement("a11y-live-region") as A11yLiveRegion;
      break;
    default:
      throw new Error(
        `[AUA] mountAdapter: no adapter registered for skillId "${skillId}".`
      );
  }

  el.targetElementId = config.targetElementId;
  el.semanticIntent = config.semanticIntent;
  el.adaptationConfig = config.adaptationConfig;

  if (mountPoint === "adjacent") {
    targetEl.insertAdjacentElement("afterend", el);
  } else if (mountPoint === "overlay") {
    el.style.position = "absolute";
    el.style.isolation = "isolate";
    const parent = targetEl.parentElement ?? document.body;
    parent.appendChild(el);
  } else {
    throw new Error(`[AUA] mountAdapter: unknown mountPoint "${mountPoint as string}".`);
  }

  return el;
}
