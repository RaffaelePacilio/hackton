import { SemanticModelBuilder } from "../semantic-model/builder.js";
import { inferRole, inferAccessibleName } from "../semantic-model/role-inference.js";
import { isSensitive } from "../semantic-model/sensitivity.js";
import { makeElementId, computeStructuralPath } from "../semantic-model/identity.js";

beforeEach(() => {
  document.body.innerHTML = "";
});

describe("role-inference — inferRole", () => {
  it("infers button role for <button>", () => {
    const el = document.createElement("button");
    expect(inferRole(el)).toBe("button");
  });

  it("infers button role for input[type=submit]", () => {
    const el = document.createElement("input");
    el.setAttribute("type", "submit");
    expect(inferRole(el)).toBe("button");
  });

  it("infers link role for a[href]", () => {
    const el = document.createElement("a");
    el.setAttribute("href", "/somewhere");
    expect(inferRole(el)).toBe("link");
  });

  it("does not treat a bare <a> (no href) as a link", () => {
    const el = document.createElement("a");
    expect(inferRole(el)).not.toBe("link");
  });

  it("infers input role for text inputs, textarea, select", () => {
    const input = document.createElement("input");
    const textarea = document.createElement("textarea");
    const select = document.createElement("select");
    expect(inferRole(input)).toBe("input");
    expect(inferRole(textarea)).toBe("input");
    expect(inferRole(select)).toBe("input");
  });

  it("infers navigation role for <nav>", () => {
    expect(inferRole(document.createElement("nav"))).toBe("navigation");
  });

  it("infers form role for <form>", () => {
    expect(inferRole(document.createElement("form"))).toBe("form");
  });

  it("infers heading role for h1..h6", () => {
    for (const tag of ["h1", "h2", "h3", "h4", "h5", "h6"]) {
      expect(inferRole(document.createElement(tag))).toBe("heading");
    }
  });

  it("explicit role attribute always wins over tag inference", () => {
    const el = document.createElement("div");
    el.setAttribute("role", "dialog");
    expect(inferRole(el)).toBe("dialog");
  });

  it("infers error role for a live region carrying text", () => {
    const el = document.createElement("div");
    el.setAttribute("aria-live", "assertive");
    el.textContent = "This field is required";
    expect(inferRole(el)).toBe("error");
  });

  it("does not infer error role for an empty live region", () => {
    const el = document.createElement("div");
    el.setAttribute("aria-live", "polite");
    expect(inferRole(el)).not.toBe("error");
  });
});

describe("role-inference — inferAccessibleName", () => {
  it("prefers aria-label over everything else", () => {
    const el = document.createElement("button");
    el.setAttribute("aria-label", "Close dialog");
    el.textContent = "X";
    expect(inferAccessibleName(el)).toBe("Close dialog");
  });

  it("resolves aria-labelledby by concatenating referenced element text", () => {
    document.body.innerHTML = `
      <span id="lbl1">Phone</span>
      <span id="lbl2">number</span>
      <input id="phone" aria-labelledby="lbl1 lbl2" />
    `;
    const input = document.getElementById("phone") as HTMLInputElement;
    expect(inferAccessibleName(input)).toBe("Phone number");
  });

  it("resolves accessible name via label[for]", () => {
    document.body.innerHTML = `
      <label for="email">Email address</label>
      <input id="email" type="email" />
    `;
    const input = document.getElementById("email") as HTMLInputElement;
    expect(inferAccessibleName(input)).toBe("Email address");
  });

  it("resolves accessible name via a wrapping <label>", () => {
    document.body.innerHTML = `<label>Username <input type="text" /></label>`;
    const input = document.querySelector("input") as HTMLInputElement;
    expect(inferAccessibleName(input)).toContain("Username");
  });

  it("falls back to placeholder only for form fields, as a last resort", () => {
    const input = document.createElement("input");
    input.setAttribute("placeholder", "Search products");
    expect(inferAccessibleName(input)).toBe("Search products");
  });

  it("falls back to trimmed visible text content for buttons/links", () => {
    const button = document.createElement("button");
    button.textContent = "  Submit order  ";
    expect(inferAccessibleName(button)).toBe("Submit order");
  });

  it("returns empty string when nothing resolves a name", () => {
    const div = document.createElement("div");
    expect(inferAccessibleName(div)).toBe("");
  });
});

describe("sensitivity — isSensitive", () => {
  it("flags password fields as sensitive", () => {
    const el = document.createElement("input");
    el.setAttribute("type", "password");
    expect(isSensitive(el)).toBe(true);
  });

  it("does not flag a plain text field as sensitive", () => {
    const el = document.createElement("input");
    el.setAttribute("type", "text");
    el.setAttribute("name", "first-name");
    expect(isSensitive(el)).toBe(false);
  });

  it("flags credit-card autocomplete tokens as sensitive", () => {
    const el = document.createElement("input");
    el.setAttribute("autocomplete", "cc-number");
    expect(isSensitive(el)).toBe(true);
  });

  it("flags name/id credential patterns even without type=password", () => {
    const el = document.createElement("input");
    el.setAttribute("name", "user_ssn");
    expect(isSensitive(el)).toBe(true);
  });

  it("does not flag type=email combined with autocomplete=username", () => {
    const el = document.createElement("input");
    el.setAttribute("type", "email");
    el.setAttribute("autocomplete", "username");
    expect(isSensitive(el)).toBe(false);
  });
});

describe("identity — makeElementId / computeStructuralPath", () => {
  it("is deterministic for identical inputs", () => {
    const el = document.createElement("button");
    const id1 = makeElementId(el, "root:body", "button", "Submit", 0);
    const id2 = makeElementId(el, "root:body", "button", "Submit", 0);
    expect(id1).toBe(id2);
  });

  it("changes when the disambiguator changes", () => {
    const el = document.createElement("button");
    const id0 = makeElementId(el, "root:body", "button", "Submit", 0);
    const id1 = makeElementId(el, "root:body", "button", "Submit", 1);
    expect(id0).not.toBe(id1);
  });

  it("anchors the structural path on the nearest ancestor id", () => {
    document.body.innerHTML = `<section id="checkout"><button>Pay</button></section>`;
    const button = document.querySelector("button") as HTMLButtonElement;
    expect(computeStructuralPath(button)).toBe("#checkout");
  });

  it("falls back to root:body when no stable ancestor exists", () => {
    document.body.innerHTML = `<span><button>Pay</button></span>`;
    const button = document.querySelector("button") as HTMLButtonElement;
    expect(computeStructuralPath(button)).toBe("root:body");
  });
});

describe("SemanticModelBuilder — buildFull bucket classification", () => {
  it("buckets elements into the correct arrays", () => {
    document.body.innerHTML = `
      <nav aria-label="Main"><a href="/a">A</a></nav>
      <form>
        <label for="email">Email</label>
        <input id="email" type="email" />
        <button type="submit">Submit</button>
      </form>
      <div role="dialog" aria-label="Confirm"><button>OK</button></div>
      <div role="alert">Something went wrong</div>
      <main><h1>Title</h1><p>body text</p></main>
    `;

    const builder = new SemanticModelBuilder();
    const model = builder.buildFull(document, "/checkout");

    expect(model.navigation).toHaveLength(1);
    expect(model.forms).toHaveLength(2); // <form> + <input>
    expect(model.actions).toHaveLength(3); // <a href>, submit button, OK button
    expect(model.dialogs).toHaveLength(1);
    expect(model.errors).toHaveLength(1);
    expect(model.regions).toHaveLength(2); // <main> + <h1>

    expect(model.version).toBe("1.0.0");
    expect(model.generation).toBe(0);
    expect(typeof model.modelId).toBe("string");
    expect(model.modelId.length).toBeGreaterThan(0);
    expect(model.page.route).toBe("/checkout");
  });

  it("populates visibleElements only with visible ids", () => {
    document.body.innerHTML = `
      <button id="visible-btn">Visible</button>
      <button id="hidden-btn" aria-hidden="true">Hidden</button>
    `;
    const builder = new SemanticModelBuilder();
    const model = builder.buildFull(document, "/");

    const visibleBtn = model.actions.find((e) => e.accessibleName === "Visible");
    const hiddenBtn = model.actions.find((e) => e.accessibleName === "Hidden");

    expect(visibleBtn).toBeDefined();
    expect(hiddenBtn).toBeDefined();
    expect(hiddenBtn?.visible).toBe(false);
    expect(model.visibleElements).toContain(visibleBtn?.id);
    expect(model.visibleElements).not.toContain(hiddenBtn?.id);
  });

  it("never throws on a pathological/malformed fragment", () => {
    document.body.innerHTML = `
      <input />
      <button></button>
      <div role="dialog"><div role="dialog"><button aria-labelledby="nope"></button></div></div>
    `;
    const brokenRectEl = document.createElement("button");
    brokenRectEl.textContent = "Broken";
    brokenRectEl.getBoundingClientRect = () => {
      throw new Error("boom");
    };
    document.body.appendChild(brokenRectEl);

    const builder = new SemanticModelBuilder();
    expect(() => builder.buildFull(document, "/weird")).not.toThrow();

    const model = builder.buildFull(document, "/weird");
    const broken = model.actions.find((e) => e.accessibleName === "Broken");
    expect(broken?.geometry).toEqual({ x: 0, y: 0, width: 0, height: 0 });
  });

  it("degrades gracefully and caps element count on pathological huge pages", () => {
    const frag = document.createDocumentFragment();
    for (let i = 0; i < 2000; i++) {
      const btn = document.createElement("button");
      btn.textContent = `Item ${i}`;
      frag.appendChild(btn);
    }
    document.body.appendChild(frag);

    const builder = new SemanticModelBuilder();
    let model;
    expect(() => {
      model = builder.buildFull(document, "/huge");
    }).not.toThrow();

    expect(model).toBeDefined();
    expect(model!.actions.length).toBeLessThanOrEqual(1500);
    expect(model!.page.mainIntent).toBe("truncated:element-cap-exceeded");
  }, 20000);
});

describe("SemanticModelBuilder — identity stability", () => {
  it("assigns the same id across two builds with no DOM change", () => {
    document.body.innerHTML = `<button>Save</button>`;
    const builder = new SemanticModelBuilder();

    const first = builder.buildFull(document, "/");
    const second = builder.buildFull(document, "/");

    expect(first.actions[0].id).toBe(second.actions[0].id);
  });

  it("no longer surfaces the id once the element is genuinely removed", () => {
    document.body.innerHTML = `<button id="save-btn">Save</button>`;
    const builder = new SemanticModelBuilder();

    const first = builder.buildFull(document, "/");
    const savedId = first.actions[0].id;

    document.getElementById("save-btn")?.remove();
    const second = builder.buildFull(document, "/");

    expect(second.actions.find((e) => e.id === savedId)).toBeUndefined();
  });
});

describe("SemanticModelBuilder — buildIncremental", () => {
  it("falls back to buildFull when there is no prior model", () => {
    document.body.innerHTML = `<button>Only</button>`;
    const builder = new SemanticModelBuilder();
    const model = builder.buildIncremental([]);
    expect(model.actions).toHaveLength(1);
    expect(model.generation).toBe(0);
  });

  it("an attribute mutation only touches the affected element", () => {
    document.body.innerHTML = `
      <button id="btn1">One</button>
      <button id="btn2">Two</button>
    `;
    const builder = new SemanticModelBuilder();
    const base = builder.buildFull(document, "/");
    expect(base.actions).toHaveLength(2);

    const btn2 = document.getElementById("btn2") as HTMLButtonElement;
    const oneBefore = base.actions.find((e) => e.accessibleName === "One")!;

    btn2.setAttribute("aria-label", "Two updated");

    const fakeRecord = {
      type: "attributes",
      target: btn2,
      attributeName: "aria-label",
      oldValue: null,
      addedNodes: [] as unknown as NodeList,
      removedNodes: [] as unknown as NodeList,
      previousSibling: null,
      nextSibling: null,
    } as unknown as MutationRecord;

    const updated = builder.buildIncremental([fakeRecord]);

    expect(updated.generation).toBe(base.generation + 1);
    expect(updated.actions).toHaveLength(2);

    const updatedTwo = updated.actions.find((e) => e.accessibleName === "Two updated");
    expect(updatedTwo).toBeDefined();

    // The untouched element's SemanticElement is carried over unchanged.
    const carriedOne = updated.actions.find((e) => e.accessibleName === "One");
    expect(carriedOne).toEqual(oneBefore);
  });

  it("removes the element from its bucket on a childList removal", () => {
    document.body.innerHTML = `
      <div id="container">
        <button id="a">A</button>
        <button id="b">B</button>
      </div>
    `;
    const builder = new SemanticModelBuilder();
    const base = builder.buildFull(document, "/");
    expect(base.actions).toHaveLength(2);

    const container = document.getElementById("container") as HTMLElement;
    const b = document.getElementById("b") as HTMLButtonElement;
    container.removeChild(b);

    const fakeRecord = {
      type: "childList",
      target: container,
      addedNodes: [] as unknown as NodeList,
      removedNodes: [b] as unknown as NodeList,
      attributeName: null,
      oldValue: null,
      previousSibling: null,
      nextSibling: null,
    } as unknown as MutationRecord;

    const updated = builder.buildIncremental([fakeRecord]);
    expect(updated.actions).toHaveLength(1);
    expect(updated.actions[0].accessibleName).toBe("A");
  });

  it("never throws under a mutation-rate storm and keeps returning a valid model", () => {
    document.body.innerHTML = `<button id="storm-btn">Storm</button>`;
    const builder = new SemanticModelBuilder();
    builder.buildFull(document, "/");

    const btn = document.getElementById("storm-btn") as HTMLButtonElement;

    let lastModel;
    expect(() => {
      for (let i = 0; i < 80; i++) {
        btn.setAttribute("data-i", String(i));
        const record = {
          type: "attributes",
          target: btn,
          attributeName: "data-i",
          oldValue: null,
          addedNodes: [] as unknown as NodeList,
          removedNodes: [] as unknown as NodeList,
          previousSibling: null,
          nextSibling: null,
        } as unknown as MutationRecord;
        lastModel = builder.buildIncremental([record]);
      }
    }).not.toThrow();

    expect(lastModel).toBeDefined();
    expect(lastModel!.actions).toHaveLength(1);
  });
});
