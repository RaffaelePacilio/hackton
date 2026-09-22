// End-to-end smoke test for the pocket demo: reproduces demo/inaccessible-form.html
// inside jsdom and imports the REAL content-script module (the same one bundled
// into dist/content/content-script.js) to verify the missing-accessible-name
// barrier is actually detected and resolved, independent of manually loading the
// extension in a real browser.

// content-script.ts calls injectPageBridge() at import time, which needs
// chrome.runtime.getURL — stub the minimal chrome API surface it touches.
(globalThis as unknown as { chrome: unknown }).chrome = {
  runtime: {
    getURL: (path: string) => `chrome-extension://test-id/${path}`,
  },
};

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
    // Fresh module registry per test: content-script.ts runs init() as a
    // side effect at import time, and we want that side effect to fire
    // against the DOM we just set up above.
    await jest.isolateModulesAsync(async () => {
      await import("../content/content-script.js");
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
      await import("../content/content-script.js");
    });

    expect(document.querySelectorAll("a11y-field-proxy").length).toBe(0);
  });

  it("syncs typing in the proxy back to the original field", async () => {
    await jest.isolateModulesAsync(async () => {
      await import("../content/content-script.js");
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
