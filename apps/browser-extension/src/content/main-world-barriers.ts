// main-world-barriers.ts — runs in the MAIN WORLD (manifest.json
// content_scripts[].world = "MAIN"), NOT the isolated world.
//
// Chrome content scripts normally run in an isolated JS world that shares
// the DOM with the page but does NOT expose window.customElements (it is
// null there) — so `customElements.define(...)` calls made from an
// isolated-world script silently cannot register elements the page can
// render. Custom-element-based UI (our @aua/web-components adapters) must
// run in the main world instead. This script therefore must NOT use any
// chrome.* extension API (those are unavailable/restricted in the main
// world) — that's content-script.ts's job, in the isolated world.
//
// Pocket demo: detect the "missing accessible name" barrier on form fields
// and resolve it with the inject_field_proxy skill
// (packages/skill-sdk/registry/inject_field_proxy.json), mounting the
// already-built <a11y-field-proxy> adapter next to the offending field.
// Hand-wired for the demo — the full pipeline (barrier-detection →
// agent-runtime → skill-sdk executor → verification-engine) is not yet
// connected end-to-end (see aua/docs/agent-prompts-v2/99-vertical-slice-integration.md).

import type { A11yFieldProxy, A11yLiveRegion } from "@aua/web-components";
import "@aua/web-components";

let liveRegion: A11yLiveRegion | null = null;
let proxyCounter = 0;

function ensureLiveRegion(): A11yLiveRegion {
  if (liveRegion && liveRegion.isConnected) return liveRegion;
  if (!document.body.id) document.body.id = "aua-body-anchor";
  const region = document.createElement("a11y-live-region") as A11yLiveRegion;
  region.targetElementId = document.body.id;
  document.body.appendChild(region);
  liveRegion = region;
  return region;
}

function hasAccessibleName(el: HTMLInputElement | HTMLTextAreaElement): boolean {
  if (el.getAttribute("aria-label")?.trim()) return true;
  const labelledBy = el.getAttribute("aria-labelledby");
  if (labelledBy && document.getElementById(labelledBy)?.textContent?.trim()) return true;
  if (el.labels) {
    for (const label of Array.from(el.labels)) {
      if (label.textContent?.trim()) return true;
    }
  }
  return false;
}

function guessLabel(el: HTMLInputElement | HTMLTextAreaElement): string {
  const placeholder = el.getAttribute("placeholder");
  if (placeholder?.trim()) return placeholder.trim();
  const name = el.getAttribute("name");
  if (name?.trim()) return name.trim().replace(/[-_]+/g, " ");
  return "Campo senza etichetta";
}

function resolveMissingLabelBarriers(): void {
  const fields = document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>(
    "input:not([type=hidden]):not([data-aua-proxied]), textarea:not([data-aua-proxied])"
  );

  fields.forEach((el) => {
    if (el.closest("a11y-field-proxy")) return;
    el.setAttribute("data-aua-proxied", "true");
    if (hasAccessibleName(el)) return;

    if (!el.id) el.id = `aua-field-${++proxyCounter}`;
    const label = guessLabel(el);

    const proxy = document.createElement("a11y-field-proxy") as A11yFieldProxy;
    proxy.targetElementId = el.id;
    proxy.setAttribute("label", label);
    if (el instanceof HTMLInputElement && el.type) {
      proxy.setAttribute("field-type", el.type);
    }
    proxy.setAttribute("value", el.value ?? "");

    proxy.addEventListener("a11y-value-change", (event) => {
      const detail = (event as CustomEvent<{ value: string }>).detail;
      el.value = detail.value;
      el.dispatchEvent(new Event("input", { bubbles: true }));
    });

    el.insertAdjacentElement("afterend", proxy);

    ensureLiveRegion().announce(
      `Barriera di accessibilità rilevata e risolta: campo "${label}" senza etichetta — aggiunta versione accessibile.`,
      6000
    );

    console.info(`[AUA] barrier resolved: unlabeled field "${label}" -> a11y-field-proxy mounted`, el);
  });
}

function init(): void {
  console.info("[AUA] main-world-barriers loaded on", window.location.href);
  resolveMissingLabelBarriers();

  const observer = new MutationObserver(() => {
    resolveMissingLabelBarriers();
  });

  observer.observe(document.body, {
    subtree: true,
    childList: true,
    attributes: true,
  });
}

init();
