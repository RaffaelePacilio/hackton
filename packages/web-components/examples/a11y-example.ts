/**
 * Throwaway example component that proves the AuaElement lifecycle end-to-end.
 * DO NOT extend or reuse this component — it is for demonstration only.
 * Concrete product components are built in WP-011.
 */
import { AuaElement } from "../src/index.js";

export class A11yExample extends AuaElement {
  get accessibleRole(): string {
    return "region";
  }

  get accessibleName(): string {
    return "Accessible Example Adapter";
  }

  protected render(shadowRoot: ShadowRoot): void {
    const wrapper = document.createElement("div");
    wrapper.setAttribute("role", this.accessibleRole);
    wrapper.setAttribute("aria-label", this.accessibleName);

    const btn = document.createElement("button");
    btn.textContent = "Example action";
    btn.addEventListener("click", () => {
      this.dispatchEvent(new CustomEvent("aua:example-action", { bubbles: true }));
    });

    wrapper.appendChild(btn);
    shadowRoot.appendChild(wrapper);
  }
}

customElements.define("a11y-example", A11yExample);
