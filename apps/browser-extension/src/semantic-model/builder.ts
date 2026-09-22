// builder.ts — SemanticModelBuilder (WP-007 core).
//
// Implements ADR-003's lifecycle: full build on load/route change, incremental
// diff on MutationObserver batches, last-known-good retained across rebuilds,
// and graceful degradation on pathological pages (element-count cap + mutation
// rate limiter) rather than hanging the tab. Never throws — every public method
// catches internally and falls back to the last-known-good model.

import {
  SEMANTIC_MODEL_VERSION,
  type ElementId,
  type SemanticElement,
  type SemanticPageModel,
} from "@aua/contracts";
import { computeStructuralPath, makeElementId } from "./identity.js";
import { inferRole, inferAccessibleName } from "./role-inference.js";
import { inferRequiredCapabilities, isNativelyFocusable } from "./capability-inference.js";
import { isSensitive } from "./sensitivity.js";
import { extractRelationships } from "./relationships.js";
import { generateId } from "../shared/uuid.js";

type BucketName = "regions" | "forms" | "navigation" | "actions" | "dialogs" | "errors";
const BUCKET_NAMES: readonly BucketName[] = [
  "regions",
  "forms",
  "navigation",
  "actions",
  "dialogs",
  "errors",
];

const SKIP_TAGS = new Set(["script", "style", "template"]);

const NATIVE_SEMANTIC_TAGS = new Set([
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
  "h6",
]);

/**
 * Buckets an inferred role into exactly one of the model's six element arrays,
 * or `null` when the element isn't structurally significant enough to surface
 * (e.g. a plain, unlabelled `<div>`). An explicit author-declared `role`
 * attribute that doesn't match a specific bucket still counts as significant —
 * it falls back to `regions` rather than being dropped.
 */
export function classifyBucket(role: string, el: Element): BucketName | null {
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

function shouldSkipTag(el: Element): boolean {
  return SKIP_TAGS.has(el.tagName.toLowerCase());
}

function isElementNode(node: Node): node is Element {
  return node.nodeType === 1;
}

function isDisabled(el: Element): boolean {
  return el.hasAttribute("disabled") || el.getAttribute("aria-disabled") === "true";
}

function hasAriaAttributes(el: Element): boolean {
  for (const attr of Array.from(el.attributes)) {
    if (attr.name === "role" || attr.name.startsWith("aria-")) return true;
  }
  return false;
}

function isNativeSemanticTag(el: Element): boolean {
  return NATIVE_SEMANTIC_TAGS.has(el.tagName.toLowerCase());
}

// Defensive wrappers — pathological/detached fragments (no ownerDocument
// defaultView, jsdom quirks, etc.) must never throw out of the builder.
function safeBoundingRect(el: Element): { x: number; y: number; width: number; height: number } {
  try {
    const rect = el.getBoundingClientRect();
    return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
  } catch {
    return { x: 0, y: 0, width: 0, height: 0 };
  }
}

function safeComputedStyle(el: Element): CSSStyleDeclaration | null {
  try {
    const view = el.ownerDocument?.defaultView;
    return view ? view.getComputedStyle(el) : null;
  } catch {
    return null;
  }
}

function computeState(el: Element): Record<string, string | number | boolean> | undefined {
  const tag = el.tagName.toLowerCase();
  if (tag === "input") {
    const input = el as HTMLInputElement;
    const type = (input.type || "text").toLowerCase();
    if (type === "checkbox" || type === "radio") return { checked: input.checked };
    return { value: input.value };
  }
  if (tag === "textarea") return { value: (el as HTMLTextAreaElement).value };
  if (tag === "select") return { value: (el as HTMLSelectElement).value };
  if (el.hasAttribute("aria-expanded")) {
    return { expanded: el.getAttribute("aria-expanded") === "true" };
  }
  if (el.hasAttribute("aria-checked")) {
    return { checked: el.getAttribute("aria-checked") === "true" };
  }
  return undefined;
}

interface IdMeta {
  id: ElementId;
  key: string;
  disambiguator: number;
}

interface Core {
  path: string;
  role: string;
  name: string;
  bucket: BucketName;
}

type PartialElement = Omit<SemanticElement, "relationships">;

function emptyModel(route: string): SemanticPageModel {
  return {
    version: SEMANTIC_MODEL_VERSION,
    page: { url: "", title: "", route, capturedAt: new Date().toISOString() },
    regions: [],
    forms: [],
    navigation: [],
    actions: [],
    dialogs: [],
    errors: [],
    visibleElements: [],
    modelId: generateId(),
    generation: 0,
  };
}

export class SemanticModelBuilder {
  private static readonly MAX_ELEMENTS = 1500;
  private static readonly RATE_LIMIT_WINDOW_MS = 1000;
  private static readonly RATE_LIMIT_MAX_BATCHES = 50;
  private static readonly DEBOUNCE_MS = 150;

  private lastModel: SemanticPageModel | null = null;
  private lastDoc: Document | null = null;
  private lastRoute = "";

  // Identity bookkeeping — persists across builds so re-renders that don't
  // change (path, role, name) keep their id, and so removed elements free
  // their disambiguator slot for reuse.
  private idMeta = new WeakMap<Element, IdMeta>();
  private disambiguatorsInUse = new Map<string, Set<number>>();
  private liveElements = new Map<ElementId, Element>();

  // Mutation-rate limiter state.
  private mutationBatchTimestamps: number[] = [];
  private pendingMutations: MutationRecord[] = [];
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;

  /** Full rebuild — page load or SPA route change (ADR-003 "Lifecycle: Creation"). */
  buildFull(doc: Document, route: string): SemanticPageModel {
    try {
      this.lastDoc = doc;
      this.lastRoute = route;

      // A full rebuild recomputes the live disambiguator set from scratch;
      // `idMeta` itself is a WeakMap keyed by Element and is left untouched so
      // elements that persist across the rebuild (e.g. a nav bar surviving a
      // route change) keep their existing id via the `assignId` reuse path.
      this.disambiguatorsInUse = new Map();
      this.liveElements = new Map();

      const buckets: Record<BucketName, SemanticElement[]> = {
        regions: [],
        forms: [],
        navigation: [],
        actions: [],
        dialogs: [],
        errors: [],
      };
      const partials: { el: Element; id: ElementId; bucket: BucketName; semantic: PartialElement }[] =
        [];

      let visitedCount = 0;
      let truncated = false;

      const visit = (parent: Element): void => {
        for (const child of Array.from(parent.children)) {
          if (truncated) return;
          if (shouldSkipTag(child)) continue;

          if (visitedCount >= SemanticModelBuilder.MAX_ELEMENTS) {
            // Pathological-page guard (ADR-003 "Failure modes"): stop
            // descending rather than hang the tab on a huge DOM.
            truncated = true;
            return;
          }
          visitedCount++;

          // Defense in depth: a single hostile/pathological element (throwing
          // getter, exotic custom element, ...) must not blank the entire
          // model — skip just that element and keep walking its subtree.
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

      // Relationships are resolved in a second pass, after every considered
      // element has an id, so forward references (a label appearing before
      // the field it labels, etc.) resolve correctly.
      const idOf = (target: Element): ElementId | undefined => this.idMeta.get(target)?.id;
      const visibleElements: ElementId[] = [];
      for (const p of partials) {
        const relationships = extractRelationships(p.el, idOf);
        const finalEl: SemanticElement = relationships
          ? { ...p.semantic, relationships }
          : { ...p.semantic };
        buckets[p.bucket].push(finalEl);
        if (finalEl.visible) visibleElements.push(finalEl.id);
      }

      const model: SemanticPageModel = {
        version: SEMANTIC_MODEL_VERSION,
        page: {
          url: doc.URL ?? "",
          title: doc.title ?? "",
          route,
          capturedAt: new Date().toISOString(),
          ...(truncated ? { mainIntent: "truncated:element-cap-exceeded" } : {}),
        },
        regions: buckets.regions,
        forms: buckets.forms,
        navigation: buckets.navigation,
        actions: buckets.actions,
        dialogs: buckets.dialogs,
        errors: buckets.errors,
        visibleElements,
        modelId: generateId(),
        generation: 0,
      };

      this.lastModel = model;

      // A clean full rebuild is a natural point to reset mutation-storm
      // bookkeeping — whatever was in flight is superseded by this snapshot.
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
  buildIncremental(mutations: MutationRecord[]): SemanticPageModel {
    try {
      if (!this.lastModel || !this.lastDoc) {
        // No baseline to diff against yet — fall back to a full build.
        return this.buildFull(this.lastDoc ?? document, this.lastRoute);
      }

      const now = Date.now();
      this.mutationBatchTimestamps.push(now);
      this.mutationBatchTimestamps = this.mutationBatchTimestamps.filter(
        (t) => now - t <= SemanticModelBuilder.RATE_LIMIT_WINDOW_MS
      );

      if (this.mutationBatchTimestamps.length > SemanticModelBuilder.RATE_LIMIT_MAX_BATCHES) {
        // Mutation storm: coalesce into a single debounced rebuild instead of
        // doing diff work per batch, protecting the main thread. The storm's
        // eventual result lands asynchronously; callers get last-known-good
        // synchronously in the meantime (ADR-003 "last-known-good retained
        // during rebuild").
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
        }, SemanticModelBuilder.DEBOUNCE_MS);

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

  private computeCore(el: Element): Core | null {
    const role = inferRole(el);
    const bucket = classifyBucket(role, el);
    if (!bucket) return null;
    const name = inferAccessibleName(el);
    const path = computeStructuralPath(el);
    return { path, role, name, bucket };
  }

  private claimSlot(key: string): number {
    let set = this.disambiguatorsInUse.get(key);
    if (!set) {
      set = new Set();
      this.disambiguatorsInUse.set(key, set);
    }
    let n = 0;
    while (set.has(n)) n++;
    set.add(n);
    return n;
  }

  private markUsed(key: string, n: number): void {
    let set = this.disambiguatorsInUse.get(key);
    if (!set) {
      set = new Set();
      this.disambiguatorsInUse.set(key, set);
    }
    set.add(n);
  }

  private releaseSlot(key: string, n: number): void {
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
  private assignId(el: Element, core: Core): ElementId {
    const key = `${core.path}\u0000${core.role}\u0000${core.name}`;
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

  private releaseElement(el: Element): void {
    const meta = this.idMeta.get(el);
    if (!meta) return;
    this.releaseSlot(meta.key, meta.disambiguator);
    this.liveElements.delete(meta.id);
    this.idMeta.delete(el);
  }

  private buildSemanticFields(
    el: Element,
    id: ElementId,
    role: string,
    name: string
  ): PartialElement {
    const ariaHidden = el.getAttribute("aria-hidden") === "true";
    const style = safeComputedStyle(el);
    const displayNone = style?.display === "none";
    const visibilityHidden = style?.visibility === "hidden";
    // Hidden elements are kept in the model (not excluded) so barrier
    // detection can still reason about hidden-until-interaction patterns —
    // they're just marked `visible: false`.
    const visible = !ariaHidden && !displayNone && !visibilityHidden;

    const focusable = visible && isNativelyFocusable(el) && !isDisabled(el);
    const rect = safeBoundingRect(el);
    const sensitive = isSensitive(el);
    const requiredCapabilities = inferRequiredCapabilities(el);

    const provenance: SemanticElement["provenance"] = hasAriaAttributes(el)
      ? "aria"
      : isNativeSemanticTag(el)
        ? "dom"
        : "heuristic";
    const confidence = provenance === "aria" ? 0.95 : provenance === "dom" ? 0.9 : 0.6;

    const state = computeState(el);
    const validation =
      el.getAttribute("aria-invalid") === "true" ? { valid: false } : undefined;

    const semantic: PartialElement = {
      id,
      role,
      accessibleName: name,
      requiredCapabilities,
      visible,
      focusable,
      geometry: rect,
      sensitive,
      confidence,
      provenance,
    };
    if (state !== undefined) semantic.state = state;
    if (validation !== undefined) semantic.validation = validation;
    return semantic;
  }

  private removeById(
    id: ElementId,
    buckets: Record<BucketName, SemanticElement[]>,
    visibleSet: Set<ElementId>
  ): void {
    for (const bucket of BUCKET_NAMES) {
      const idx = buckets[bucket].findIndex((e) => e.id === id);
      if (idx !== -1) buckets[bucket].splice(idx, 1);
    }
    visibleSet.delete(id);
    this.liveElements.delete(id);
  }

  private removeSubtree(
    el: Element,
    buckets: Record<BucketName, SemanticElement[]>,
    visibleSet: Set<ElementId>
  ): void {
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
  private applyMutations(mutations: MutationRecord[]): SemanticPageModel {
    const base = this.lastModel as SemanticPageModel;
    const buckets: Record<BucketName, SemanticElement[]> = {
      regions: [...base.regions],
      forms: [...base.forms],
      navigation: [...base.navigation],
      actions: [...base.actions],
      dialogs: [...base.dialogs],
      errors: [...base.errors],
    };
    const visibleSet = new Set(base.visibleElements);

    const removedRoots = new Set<Element>();
    const addedRoots = new Set<Element>();
    const attrTargets = new Set<Element>();

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

    // 1. Tear down removed subtrees first — this frees disambiguator slots
    //    before any replacement node (a same-batch React-style swap) claims
    //    a slot, so the replacement can reclaim the same slot/id.
    for (const root of removedRoots) this.removeSubtree(root, buckets, visibleSet);

    // 2. Collect every element that needs (re)computation: attribute-changed
    //    elements, plus every element inside each added subtree.
    const toUpsert: Element[] = [];
    const collect = (el: Element): void => {
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

    // Phase A — assign/refresh ids up front (mirrors buildFull's two-pass
    // approach) so Phase B's relationship resolution can see forward
    // references within this same batch.
    const partials = new Map<
      Element,
      { id: ElementId; staleId: ElementId | undefined; bucket: BucketName; semantic: PartialElement }
    >();
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
        // The identity key includes accessibleName, so an attribute mutation
        // that changes the name (e.g. a live aria-label update) can
        // legitimately mint a new id for the same node — remember the old
        // one so Phase B can remove its now-stale bucket entry instead of
        // leaving a duplicate.
        const staleId = priorId !== undefined && priorId !== id ? priorId : undefined;
        const semantic = this.buildSemanticFields(el, id, core.role, core.name);
        partials.set(el, { id, staleId, bucket: core.bucket, semantic });
      } catch (err) {
        console.warn("[AUA][semantic-model] skipping element", err);
      }
    }

    // Phase B — finalize with relationships now that ids are all assigned.
    const idOf = (target: Element): ElementId | undefined => this.idMeta.get(target)?.id;
    for (const [el, { id, staleId, bucket, semantic }] of partials) {
      const relationships = extractRelationships(el, idOf);
      const finalEl: SemanticElement = relationships ? { ...semantic, relationships } : semantic;

      // Clear any stale prior placement (bucket may have changed, or the id
      // itself changed because the identity key changed) before re-inserting.
      if (staleId !== undefined) this.removeById(staleId, buckets, visibleSet);
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
      generation: base.generation + 1,
    };
  }
}
