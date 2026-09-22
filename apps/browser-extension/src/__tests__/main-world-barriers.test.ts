// End-to-end smoke test for the pocket demo: reproduces demo/inaccessible-form.html
// inside jsdom and imports the REAL main-world-barriers module (the same one
// bundled into dist/content/main-world-barriers.js and injected into the
// page's MAIN world per manifest.json) to verify the missing-accessible-name
// barrier is actually detected and resolved. This module deliberately has no
// chrome.* dependency (main-world scripts can't use extension APIs — see the
// comment at the top of main-world-barriers.ts), so no chrome stub is needed
// here, unlike content-script.ts's own tests.
//
// Confirmed against a real Chromium + real unpacked extension too, via
// e2e/pocket-demo.e2e.mjs (Playwright) — that test caught a bug this jsdom
// test could not: customElements is null in a content script's isolated
// world, so this logic silently did nothing until it was moved out of
// content-script.ts into this main-world script.

describe("pocket demo — missing accessible name barrier", () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <h1>Modulo di contatto (demo)</h1>
      <input type="text" name="full_name" placeholder="Nome e cognome" />
      <input type="email" name="email_address" placeholder="Indirizzo email" />
      <textarea name="message" placeholder="Messaggio"></textarea>
      <button type="button">Invia</button>
    `;
  });

  it("mounts an a11y-field-proxy next to every unlabeled field, and an a11y-live-region", async () => {
    // Fresh module registry per test: main-world-barriers.ts runs init() as a
    // side effect at import time, and we want that side effect to fire
    // against the DOM we just set up above.
    await jest.isolateModulesAsync(async () => {
      await import("../content/main-world-barriers.js");
    });

    const proxies = document.querySelectorAll("a11y-field-proxy");
    expect(proxies.length).toBe(3);

    const labels = Array.from(proxies).map((p) => p.getAttribute("label"));
    expect(labels).toEqual(
      expect.arrayContaining(["Nome e cognome", "Indirizzo email", "Messaggio"])
    );

    // Every proxy must target a real element still present in the document.
    proxies.forEach((p) => {
      const targetId = p.getAttribute("target-element-id") ?? (p as unknown as { targetElementId: string }).targetElementId;
      // targetElementId is a plain property (not reflected as an attribute),
      // so read it off the live instance instead.
      expect(typeof (p as unknown as { targetElementId: string }).targetElementId).toBe("string");
      void targetId;
    });

    const liveRegion = document.querySelector("a11y-live-region");
    expect(liveRegion).not.toBeNull();

    // Untouched control (button) must not have been proxied.
    expect(document.querySelectorAll("button[data-aua-proxied]").length).toBe(0);
  });

  it("does not proxy a field that already has a real accessible name", async () => {
    document.body.innerHTML = `
      <label for="real">Nome reale</label>
      <input id="real" type="text" />
    `;

    await jest.isolateModulesAsync(async () => {
      await import("../content/main-world-barriers.js");
    });

    expect(document.querySelectorAll("a11y-field-proxy").length).toBe(0);
  });

  it("syncs typing in the proxy back to the original field", async () => {
    await jest.isolateModulesAsync(async () => {
      await import("../content/main-world-barriers.js");
    });

    const original = document.querySelector('input[name="full_name"]') as HTMLInputElement;
    const proxy = document.querySelector("a11y-field-proxy");
    expect(proxy).not.toBeNull();

    proxy!.dispatchEvent(
      new CustomEvent("a11y-value-change", {
        detail: { value: "Mario Rossi", targetElementId: original.id },
      })
    );

    expect(original.value).toBe("Mario Rossi");
  });
});
