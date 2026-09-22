"use strict";
(() => {
  // ../../packages/contracts/dist/semantic-page-model.js
  var SEMANTIC_MODEL_VERSION = "1.0.0";

  // src/semantic-model/identity.ts
  var LANDMARK_TAGS = /* @__PURE__ */ new Set([
    "nav",
    "main",
    "header",
    "footer",
    "aside",
    "form",
    "dialog",
    "section",
    "article"
  ]);
  var LANDMARK_ROLES = /* @__PURE__ */ new Set([
    "banner",
    "navigation",
    "main",
    "complementary",
    "contentinfo",
    "region",
    "form",
    "dialog",
    "search"
  ]);
  function computeStructuralPath(el) {
    let node = el.parentElement;
    while (node) {
      const id = node.getAttribute("id");
      if (id && id.trim()) return `#${id.trim()}`;
      const explicitRole = node.getAttribute("role");
      if (explicitRole && LANDMARK_ROLES.has(explicitRole.toLowerCase())) {
        return `role:${explicitRole.toLowerCase()}`;
      }
      const tag = node.tagName.toLowerCase();
      if (LANDMARK_TAGS.has(tag)) return `tag:${tag}`;
      node = node.parentElement;
    }
    return "root:body";
  }
  function fnv1a(input) {
    let hash = 2166136261;
    for (let i = 0; i < input.length; i++) {
      hash ^= input.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(16).padStart(8, "0");
  }
  function makeElementId(el, path, role, name, disambiguator) {
    const tag = el.tagName ? el.tagName.toLowerCase() : "unknown";
    const composite = [path, role, tag, name.trim().toLowerCase(), String(disambiguator)].join(
      ""
    );
    return `aua-${fnv1a(composite)}`;
  }

  // src/semantic-model/role-inference.ts
  var BUTTON_INPUT_TYPES = /* @__PURE__ */ new Set(["submit", "button", "reset", "image"]);
  var HEADING_TAGS = /* @__PURE__ */ new Set(["h1", "h2", "h3", "h4", "h5", "h6"]);
  function inferRole(el) {
    const explicit = el.getAttribute("role");
    if (explicit && explicit.trim()) return explicit.trim().toLowerCase();
    const tag = el.tagName.toLowerCase();
    if (tag === "button") return "button";
    if (tag === "input" && BUTTON_INPUT_TYPES.has((el.getAttribute("type") || "").toLowerCase())) {
      return "button";
    }
    if (tag === "a" && el.hasAttribute("href")) return "link";
    if (tag === "input" || tag === "textarea" || tag === "select") return "input";
    if (tag === "nav") return "navigation";
    if (tag === "form") return "form";
    if (tag === "dialog") return "dialog";
    if (HEADING_TAGS.has(tag)) return "heading";
    if (tag === "main") return "main";
    if (tag === "header") return "banner";
    if (tag === "footer") return "contentinfo";
    if (tag === "aside") return "complementary";
    if (tag === "article") return "article";
    const ariaLive = (el.getAttribute("aria-live") || "").toLowerCase();
    if (ariaLive === "polite" || ariaLive === "assertive") {
      const text = (el.textContent || "").trim();
      if (text) return "error";
    }
    if (tag === "section" && (el.getAttribute("aria-label") || el.getAttribute("aria-labelledby"))) {
      return "region";
    }
    const hasText = (el.textContent || "").trim().length > 0;
    const hasElementChildren = el.children.length > 0;
    if (hasText && !hasElementChildren) return "text";
    return "unknown";
  }
  function resolveLabelElement(el) {
    const doc = el.ownerDocument;
    const id = el.getAttribute("id");
    if (id) {
      const labels = doc.getElementsByTagName("label");
      for (const label of Array.from(labels)) {
        if (label.getAttribute("for") === id) return label;
      }
    }
    return el.closest("label");
  }
  var FORM_FIELD_TAGS = /* @__PURE__ */ new Set(["input", "textarea"]);
  var TEXT_FALLBACK_TAGS = /* @__PURE__ */ new Set(["button", "a"]);
  var TEXT_FALLBACK_ROLES = /* @__PURE__ */ new Set(["button", "link"]);
  function inferAccessibleName(el) {
    const ariaLabel = el.getAttribute("aria-label");
    if (ariaLabel && ariaLabel.trim()) return ariaLabel.trim();
    const labelledBy = el.getAttribute("aria-labelledby");
    if (labelledBy) {
      const doc = el.ownerDocument;
      const text = labelledBy.split(/\s+/).filter(Boolean).map((id) => doc.getElementById(id)?.textContent?.trim() ?? "").filter((s) => s.length > 0).join(" ");
      if (text) return text;
    }
    const label = resolveLabelElement(el);
    if (label) {
      const text = (label.textContent || "").trim();
      if (text) return text;
    }
    const tag = el.tagName.toLowerCase();
    if (FORM_FIELD_TAGS.has(tag)) {
      const placeholder = el.getAttribute("placeholder");
      if (placeholder && placeholder.trim()) return placeholder.trim();
    }
    const title = el.getAttribute("title");
    if (title && title.trim()) return title.trim();
    const role = (el.getAttribute("role") || "").toLowerCase();
    if (TEXT_FALLBACK_TAGS.has(tag) || TEXT_FALLBACK_ROLES.has(role)) {
      const text = (el.textContent || "").trim();
      if (text) return text;
    }
    return "";
  }

  // src/semantic-model/capability-inference.ts
  var CLICKABLE_TAGS = /* @__PURE__ */ new Set(["button", "a", "input", "select", "textarea"]);
  var INTERACTIVE_ROLES = /* @__PURE__ */ new Set([
    "button",
    "link",
    "menuitem",
    "tab",
    "checkbox",
    "radio",
    "switch",
    "option"
  ]);
  function isNativelyFocusable(el) {
    const tag = el.tagName.toLowerCase();
    if (tag === "input" || tag === "button" || tag === "select" || tag === "textarea") return true;
    if (tag === "a" && el.hasAttribute("href")) return true;
    const tabindex = el.getAttribute("tabindex");
    if (tabindex !== null) {
      const n = Number.parseInt(tabindex, 10);
      if (!Number.isNaN(n) && n >= 0) return true;
    }
    return false;
  }
  function isClickable(el) {
    const tag = el.tagName.toLowerCase();
    if (CLICKABLE_TAGS.has(tag)) return true;
    if (el.hasAttribute("onclick")) return true;
    const role = (el.getAttribute("role") || "").toLowerCase();
    return INTERACTIVE_ROLES.has(role);
  }
  function isDragLike(el) {
    if (el.getAttribute("draggable") === "true") return true;
    const className = typeof el.className === "string" ? el.className : "";
    if (/\b(drag|slider)\b/i.test(className)) return true;
    for (const attr of Array.from(el.attributes)) {
      if (attr.name.startsWith("data-") && /drag|slider/i.test(`${attr.name} ${attr.value}`)) {
        return true;
      }
    }
    return false;
  }
  function hasHoverHint(el) {
    const className = typeof el.className === "string" ? el.className : "";
    if (/hover/i.test(className)) return true;
    for (const attr of Array.from(el.attributes)) {
      if (attr.name.startsWith("data-") && /hover/i.test(attr.name)) return true;
    }
    return false;
  }
  function safeRect(el) {
    try {
      const rect = el.getBoundingClientRect();
      return { width: rect.width, height: rect.height };
    } catch {
      return { width: 0, height: 0 };
    }
  }
  function isHiddenByDefault(el) {
    const rect = safeRect(el);
    const view = el.ownerDocument?.defaultView;
    const style = view ? view.getComputedStyle(el) : null;
    const zeroBox = rect.width === 0 && rect.height === 0;
    const styledHidden = style ? style.display === "none" || style.visibility === "hidden" : false;
    return zeroBox || styledHidden;
  }
  function isHoverOnly(el) {
    return hasHoverHint(el) && !isNativelyFocusable(el) && isHiddenByDefault(el);
  }
  function hasSmallTarget(el) {
    const rect = safeRect(el);
    if (rect.width === 0 && rect.height === 0) return false;
    return rect.width < 24 || rect.height < 24;
  }
  function inferRequiredCapabilities(el) {
    const caps = /* @__PURE__ */ new Set();
    if (isClickable(el)) caps.add("pointer");
    if (isNativelyFocusable(el)) caps.add("keyboard");
    if (isDragLike(el)) {
      caps.add("pointer");
      caps.add("drag");
    }
    if (isHoverOnly(el)) {
      caps.add("pointer");
      caps.add("hover");
    }
    if (isClickable(el) && hasSmallTarget(el)) {
      caps.add("precision-targeting");
    }
    return Array.from(caps);
  }

  // src/semantic-model/sensitivity.ts
  var SENSITIVE_AUTOCOMPLETE_TOKENS = ["cc-", "current-password", "new-password", "one-time-code"];
  var SENSITIVE_NAME_PATTERN = /\b(password|ssn|card[-_ ]?number|cvv|cvc|pin)\b/i;
  function isSensitive(el) {
    const type = (el.getAttribute("type") || "").toLowerCase();
    const autocomplete = (el.getAttribute("autocomplete") || "").toLowerCase();
    const name = (el.getAttribute("name") || "").toLowerCase();
    const id = (el.getAttribute("id") || "").toLowerCase();
    if (type === "password") return true;
    if (SENSITIVE_AUTOCOMPLETE_TOKENS.some((token) => autocomplete.includes(token))) return true;
    const normalizedName = name.replace(/[-_]+/g, " ");
    const normalizedId = id.replace(/[-_]+/g, " ");
    if (SENSITIVE_NAME_PATTERN.test(normalizedName) || SENSITIVE_NAME_PATTERN.test(normalizedId)) {
      return true;
    }
    return false;
  }

  // src/semantic-model/relationships.ts
  function resolveIdRefs(attrValue, doc, idOf) {
    if (!attrValue) return [];
    return attrValue.split(/\s+/).filter(Boolean).map((refId) => doc.getElementById(refId)).filter((target) => target !== null).map((target) => idOf(target)).filter((id) => id !== void 0);
  }
  function resolveFormOwner(el) {
    const withForm = el;
    if (withForm.form) return withForm.form;
    return el.closest("form");
  }
  function extractRelationships(el, idOf) {
    const doc = el.ownerDocument;
    const labelledBy = resolveIdRefs(el.getAttribute("aria-labelledby"), doc, idOf);
    const describedBy = resolveIdRefs(el.getAttribute("aria-describedby"), doc, idOf);
    const controls = resolveIdRefs(el.getAttribute("aria-controls"), doc, idOf);
    const formOwnerEl = resolveFormOwner(el);
    const formOwner = formOwnerEl ? idOf(formOwnerEl) : void 0;
    const relationships = {};
    if (labelledBy.length) relationships.labelledBy = labelledBy;
    if (describedBy.length) relationships.describedBy = describedBy;
    if (controls.length) relationships.controls = controls;
    if (formOwner) relationships.formOwner = formOwner;
    return Object.keys(relationships).length > 0 ? relationships : void 0;
  }

  // src/shared/uuid.ts
  function generateId() {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === "x" ? r : r & 3 | 8;
      return v.toString(16);
    });
  }

  // src/semantic-model/builder.ts
  var BUCKET_NAMES = [
    "regions",
    "forms",
    "navigation",
    "actions",
    "dialogs",
    "errors"
  ];
  var SKIP_TAGS = /* @__PURE__ */ new Set(["script", "style", "template"]);
  var NATIVE_SEMANTIC_TAGS = /* @__PURE__ */ new Set([
    "button",
    "a",
    "input",
    "textarea",
    "select",
    "nav",
    "form",
    "dialog",
    "header",
    "footer",
    "aside",
    "main",
    "article",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6"
  ]);
  function classifyBucket(role, el) {
    switch (role) {
      case "button":
      case "link":
        return "actions";
      case "input":
      case "form":
        return "forms";
      case "navigation":
        return "navigation";
      case "dialog":
        return "dialogs";
      case "alert":
      case "error":
        return "errors";
      case "heading":
      case "region":
      case "banner":
      case "contentinfo":
      case "complementary":
      case "main":
      case "article":
        return "regions";
      default:
        return el.hasAttribute("role") ? "regions" : null;
    }
  }
  function shouldSkipTag(el) {
    return SKIP_TAGS.has(el.tagName.toLowerCase());
  }
  function isElementNode(node) {
    return node.nodeType === 1;
  }
  function isDisabled(el) {
    return el.hasAttribute("disabled") || el.getAttribute("aria-disabled") === "true";
  }
  function hasAriaAttributes(el) {
    for (const attr of Array.from(el.attributes)) {
      if (attr.name === "role" || attr.name.startsWith("aria-")) return true;
    }
    return false;
  }
  function isNativeSemanticTag(el) {
    return NATIVE_SEMANTIC_TAGS.has(el.tagName.toLowerCase());
  }
  function safeBoundingRect(el) {
    try {
      const rect = el.getBoundingClientRect();
      return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
    } catch {
      return { x: 0, y: 0, width: 0, height: 0 };
    }
  }
  function safeComputedStyle(el) {
    try {
      const view = el.ownerDocument?.defaultView;
      return view ? view.getComputedStyle(el) : null;
    } catch {
      return null;
    }
  }
  function computeState(el) {
    const tag = el.tagName.toLowerCase();
    if (tag === "input") {
      const input = el;
      const type = (input.type || "text").toLowerCase();
      if (type === "checkbox" || type === "radio") return { checked: input.checked };
      return { value: input.value };
    }
    if (tag === "textarea") return { value: el.value };
    if (tag === "select") return { value: el.value };
    if (el.hasAttribute("aria-expanded")) {
      return { expanded: el.getAttribute("aria-expanded") === "true" };
    }
    if (el.hasAttribute("aria-checked")) {
      return { checked: el.getAttribute("aria-checked") === "true" };
    }
    return void 0;
  }
  function emptyModel(route) {
    return {
      version: SEMANTIC_MODEL_VERSION,
      page: { url: "", title: "", route, capturedAt: (/* @__PURE__ */ new Date()).toISOString() },
      regions: [],
      forms: [],
      navigation: [],
      actions: [],
      dialogs: [],
      errors: [],
      visibleElements: [],
      modelId: generateId(),
      generation: 0
    };
  }
  var SemanticModelBuilder = class _SemanticModelBuilder {
    constructor() {
      this.lastModel = null;
      this.lastDoc = null;
      this.lastRoute = "";
      // Identity bookkeeping — persists across builds so re-renders that don't
      // change (path, role, name) keep their id, and so removed elements free
      // their disambiguator slot for reuse.
      this.idMeta = /* @__PURE__ */ new WeakMap();
      this.disambiguatorsInUse = /* @__PURE__ */ new Map();
      this.liveElements = /* @__PURE__ */ new Map();
      // Mutation-rate limiter state.
      this.mutationBatchTimestamps = [];
      this.pendingMutations = [];
      this.debounceTimer = null;
    }
    static {
      this.MAX_ELEMENTS = 1500;
    }
    static {
      this.RATE_LIMIT_WINDOW_MS = 1e3;
    }
    static {
      this.RATE_LIMIT_MAX_BATCHES = 50;
    }
    static {
      this.DEBOUNCE_MS = 150;
    }
    /** Full rebuild — page load or SPA route change (ADR-003 "Lifecycle: Creation"). */
    buildFull(doc, route) {
      try {
        this.lastDoc = doc;
        this.lastRoute = route;
        this.disambiguatorsInUse = /* @__PURE__ */ new Map();
        this.liveElements = /* @__PURE__ */ new Map();
        const buckets = {
          regions: [],
          forms: [],
          navigation: [],
          actions: [],
          dialogs: [],
          errors: []
        };
        const partials = [];
        let visitedCount = 0;
        let truncated = false;
        const visit = (parent) => {
          for (const child of Array.from(parent.children)) {
            if (truncated) return;
            if (shouldSkipTag(child)) continue;
            if (visitedCount >= _SemanticModelBuilder.MAX_ELEMENTS) {
              truncated = true;
              return;
            }
            visitedCount++;
            try {
              const core = this.computeCore(child);
              if (core) {
                const id = this.assignId(child, core);
                const semantic = this.buildSemanticFields(child, id, core.role, core.name);
                partials.push({ el: child, id, bucket: core.bucket, semantic });
              }
            } catch (err) {
              console.warn("[AUA][semantic-model] skipping element", err);
            }
            visit(child);
          }
        };
        const root = doc.body ?? doc.documentElement;
        if (root) visit(root);
        const idOf = (target) => this.idMeta.get(target)?.id;
        const visibleElements = [];
        for (const p of partials) {
          const relationships = extractRelationships(p.el, idOf);
          const finalEl = relationships ? { ...p.semantic, relationships } : { ...p.semantic };
          buckets[p.bucket].push(finalEl);
          if (finalEl.visible) visibleElements.push(finalEl.id);
        }
        const model = {
          version: SEMANTIC_MODEL_VERSION,
          page: {
            url: doc.URL ?? "",
            title: doc.title ?? "",
            route,
            capturedAt: (/* @__PURE__ */ new Date()).toISOString(),
            ...truncated ? { mainIntent: "truncated:element-cap-exceeded" } : {}
          },
          regions: buckets.regions,
          forms: buckets.forms,
          navigation: buckets.navigation,
          actions: buckets.actions,
          dialogs: buckets.dialogs,
          errors: buckets.errors,
          visibleElements,
          modelId: generateId(),
          generation: 0
        };
        this.lastModel = model;
        this.mutationBatchTimestamps = [];
        this.pendingMutations = [];
        if (this.debounceTimer) {
          clearTimeout(this.debounceTimer);
          this.debounceTimer = null;
        }
        return model;
      } catch (err) {
        console.warn("[AUA][semantic-model]", err);
        return this.lastModel ?? emptyModel(route);
      }
    }
    /** Incremental diff — MutationObserver batches (ADR-003 "Lifecycle: Update"). */
    buildIncremental(mutations) {
      try {
        if (!this.lastModel || !this.lastDoc) {
          return this.buildFull(this.lastDoc ?? document, this.lastRoute);
        }
        const now = Date.now();
        this.mutationBatchTimestamps.push(now);
        this.mutationBatchTimestamps = this.mutationBatchTimestamps.filter(
          (t) => now - t <= _SemanticModelBuilder.RATE_LIMIT_WINDOW_MS
        );
        if (this.mutationBatchTimestamps.length > _SemanticModelBuilder.RATE_LIMIT_MAX_BATCHES) {
          this.pendingMutations.push(...mutations);
          if (this.debounceTimer) clearTimeout(this.debounceTimer);
          this.debounceTimer = setTimeout(() => {
            const queued = this.pendingMutations;
            this.pendingMutations = [];
            this.debounceTimer = null;
            try {
              this.lastModel = this.applyMutations(queued);
            } catch (err) {
              console.warn("[AUA][semantic-model]", err);
            }
          }, _SemanticModelBuilder.DEBOUNCE_MS);
          return this.lastModel;
        }
        const updated = this.applyMutations(mutations);
        this.lastModel = updated;
        return updated;
      } catch (err) {
        console.warn("[AUA][semantic-model]", err);
        return this.lastModel ?? emptyModel(this.lastRoute);
      }
    }
    // ---- internals ---------------------------------------------------------
    computeCore(el) {
      const role = inferRole(el);
      const bucket = classifyBucket(role, el);
      if (!bucket) return null;
      const name = inferAccessibleName(el);
      const path = computeStructuralPath(el);
      return { path, role, name, bucket };
    }
    claimSlot(key) {
      let set = this.disambiguatorsInUse.get(key);
      if (!set) {
        set = /* @__PURE__ */ new Set();
        this.disambiguatorsInUse.set(key, set);
      }
      let n = 0;
      while (set.has(n)) n++;
      set.add(n);
      return n;
    }
    markUsed(key, n) {
      let set = this.disambiguatorsInUse.get(key);
      if (!set) {
        set = /* @__PURE__ */ new Set();
        this.disambiguatorsInUse.set(key, set);
      }
      set.add(n);
    }
    releaseSlot(key, n) {
      const set = this.disambiguatorsInUse.get(key);
      if (!set) return;
      set.delete(n);
      if (set.size === 0) this.disambiguatorsInUse.delete(key);
    }
    /**
     * Assigns (or reuses) the id for `el`. The same DOM node with an unchanged
     * (path, role, name) key always reuses its previous id/disambiguator slot —
     * this is what makes identity resilient to full rebuilds. A brand new node,
     * or a node whose key changed enough that it's no longer "the same logical
     * element", claims the smallest free slot for its new key.
     */
    assignId(el, core) {
      const key = `${core.path}\0${core.role}\0${core.name}`;
      const existing = this.idMeta.get(el);
      if (existing && existing.key === key) {
        this.markUsed(key, existing.disambiguator);
        this.liveElements.set(existing.id, el);
        return existing.id;
      }
      if (existing) this.releaseSlot(existing.key, existing.disambiguator);
      const disambiguator = this.claimSlot(key);
      const id = makeElementId(el, core.path, core.role, core.name, disambiguator);
      this.idMeta.set(el, { id, key, disambiguator });
      this.liveElements.set(id, el);
      return id;
    }
    releaseElement(el) {
      const meta = this.idMeta.get(el);
      if (!meta) return;
      this.releaseSlot(meta.key, meta.disambiguator);
      this.liveElements.delete(meta.id);
      this.idMeta.delete(el);
    }
    buildSemanticFields(el, id, role, name) {
      const ariaHidden = el.getAttribute("aria-hidden") === "true";
      const style = safeComputedStyle(el);
      const displayNone = style?.display === "none";
      const visibilityHidden = style?.visibility === "hidden";
      const visible = !ariaHidden && !displayNone && !visibilityHidden;
      const focusable = visible && isNativelyFocusable(el) && !isDisabled(el);
      const rect = safeBoundingRect(el);
      const sensitive = isSensitive(el);
      const requiredCapabilities = inferRequiredCapabilities(el);
      const provenance = hasAriaAttributes(el) ? "aria" : isNativeSemanticTag(el) ? "dom" : "heuristic";
      const confidence = provenance === "aria" ? 0.95 : provenance === "dom" ? 0.9 : 0.6;
      const state = computeState(el);
      const validation = el.getAttribute("aria-invalid") === "true" ? { valid: false } : void 0;
      const semantic = {
        id,
        role,
        accessibleName: name,
        requiredCapabilities,
        visible,
        focusable,
        geometry: rect,
        sensitive,
        confidence,
        provenance
      };
      if (state !== void 0) semantic.state = state;
      if (validation !== void 0) semantic.validation = validation;
      return semantic;
    }
    removeById(id, buckets, visibleSet) {
      for (const bucket of BUCKET_NAMES) {
        const idx = buckets[bucket].findIndex((e) => e.id === id);
        if (idx !== -1) buckets[bucket].splice(idx, 1);
      }
      visibleSet.delete(id);
      this.liveElements.delete(id);
    }
    removeSubtree(el, buckets, visibleSet) {
      const meta = this.idMeta.get(el);
      if (meta) this.removeById(meta.id, buckets, visibleSet);
      this.releaseElement(el);
      for (const child of Array.from(el.children)) this.removeSubtree(child, buckets, visibleSet);
    }
    /**
     * Applies a batch of MutationRecords to `this.lastModel`, splicing only the
     * affected SemanticElements into/out of the correct buckets rather than
     * rebuilding the whole page (ADR-003 "incremental diff on mutation").
     */
    applyMutations(mutations) {
      const base = this.lastModel;
      const buckets = {
        regions: [...base.regions],
        forms: [...base.forms],
        navigation: [...base.navigation],
        actions: [...base.actions],
        dialogs: [...base.dialogs],
        errors: [...base.errors]
      };
      const visibleSet = new Set(base.visibleElements);
      const removedRoots = /* @__PURE__ */ new Set();
      const addedRoots = /* @__PURE__ */ new Set();
      const attrTargets = /* @__PURE__ */ new Set();
      for (const record of mutations) {
        if (record.type === "attributes" && isElementNode(record.target)) {
          attrTargets.add(record.target);
        } else if (record.type === "childList") {
          record.removedNodes.forEach((n) => {
            if (isElementNode(n)) removedRoots.add(n);
          });
          record.addedNodes.forEach((n) => {
            if (isElementNode(n)) addedRoots.add(n);
          });
        }
      }
      for (const root of removedRoots) this.removeSubtree(root, buckets, visibleSet);
      const toUpsert = [];
      const collect = (el) => {
        if (shouldSkipTag(el)) return;
        toUpsert.push(el);
        for (const child of Array.from(el.children)) collect(child);
      };
      attrTargets.forEach((el) => {
        if (el.isConnected) toUpsert.push(el);
      });
      addedRoots.forEach((el) => {
        if (el.isConnected && !shouldSkipTag(el)) collect(el);
      });
      const partials = /* @__PURE__ */ new Map();
      for (const el of toUpsert) {
        try {
          const core = this.computeCore(el);
          const priorId = this.idMeta.get(el)?.id;
          if (!core) {
            const stale = this.idMeta.get(el);
            if (stale) this.removeSubtree(el, buckets, visibleSet);
            continue;
          }
          const id = this.assignId(el, core);
          const staleId = priorId !== void 0 && priorId !== id ? priorId : void 0;
          const semantic = this.buildSemanticFields(el, id, core.role, core.name);
          partials.set(el, { id, staleId, bucket: core.bucket, semantic });
        } catch (err) {
          console.warn("[AUA][semantic-model] skipping element", err);
        }
      }
      const idOf = (target) => this.idMeta.get(target)?.id;
      for (const [el, { id, staleId, bucket, semantic }] of partials) {
        const relationships = extractRelationships(el, idOf);
        const finalEl = relationships ? { ...semantic, relationships } : semantic;
        if (staleId !== void 0) this.removeById(staleId, buckets, visibleSet);
        this.removeById(id, buckets, visibleSet);
        buckets[bucket].push(finalEl);
        this.liveElements.set(id, el);
        if (finalEl.visible) visibleSet.add(id);
        else visibleSet.delete(id);
      }
      return {
        ...base,
        page: { ...base.page },
        regions: buckets.regions,
        forms: buckets.forms,
        navigation: buckets.navigation,
        actions: buckets.actions,
        dialogs: buckets.dialogs,
        errors: buckets.errors,
        visibleElements: Array.from(visibleSet),
        generation: base.generation + 1
      };
    }
  };

  // src/content/content-script.ts
  var AUA_VERSION = "1";
  var builder = new SemanticModelBuilder();
  var currentModel = null;
  function injectPageBridge() {
    const bridgeUrl = chrome.runtime.getURL("dist/content/page-bridge.js");
    const script = document.createElement("script");
    script.src = bridgeUrl;
    script.type = "module";
    (document.head ?? document.documentElement).appendChild(script);
  }
  function handleBridgeMessage(event) {
    if (event.origin !== window.location.origin) return;
    const data = event.data;
    if (typeof data !== "object" || data === null || data["auaVersion"] !== AUA_VERSION) {
      return;
    }
    if (data["type"] === "AUA_ROUTE_CHANGE") {
      currentModel = builder.buildFull(document, window.location.pathname);
    }
  }
  function init() {
    console.info("[AUA] content-script loaded on", window.location.href);
    injectPageBridge();
    window.addEventListener("message", handleBridgeMessage);
    currentModel = builder.buildFull(document, window.location.pathname);
    const observer = new MutationObserver((mutations) => {
      currentModel = builder.buildIncremental(mutations);
    });
    observer.observe(document.body, {
      subtree: true,
      childList: true,
      attributes: true
    });
  }
  init();
})();
//# sourceMappingURL=content-script.js.map
