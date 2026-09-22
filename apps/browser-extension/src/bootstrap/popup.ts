// popup.ts — Universal Accessibility Bootstrap controller.
// Reads/writes chrome.storage.local directly so it works even when the
// service worker has been killed (MV3 SW lifecycle).
// No postMessage to SW; no network calls; zero LLM dependency.

import { InteractionContract, Availability, isAvailability } from "../shared/interaction-contract.js";
import { loadContract, saveContract } from "../shared/storage.js";

type SelectEl = HTMLSelectElement;
type CheckEl = HTMLInputElement;

function getSelect(id: string): SelectEl {
  return document.getElementById(id) as SelectEl;
}

function getCheck(id: string): CheckEl {
  return document.getElementById(id) as CheckEl;
}

function selectValue(id: string): Availability {
  const val = getSelect(id).value;
  return isAvailability(val) ? val : "unknown";
}

function checkValue(id: string): boolean {
  return getCheck(id).checked;
}

function populateForm(contract: InteractionContract): void {
  getSelect("input-keyboard").value = contract.input.keyboard;
  getSelect("input-pointer").value = contract.input.pointer;
  getSelect("input-touch").value = contract.input.touch;
  getSelect("input-voice").value = contract.input.voice;
  getSelect("input-switch").value = contract.input.switch;

  getSelect("actions-drag").value = contract.actions.drag;
  getSelect("actions-precision").value = contract.actions.precisionTargeting;
  getSelect("actions-shortcuts").value = contract.actions.complexShortcuts;

  getSelect("perception-smalltext").value = contract.perception.smallText;
  getSelect("perception-contrast").value = contract.perception.colorContrast ?? "unknown";
  getSelect("perception-motion").value = contract.perception.motion ?? "unknown";

  getCheck("pref-largetargets").checked = contract.preferences.largeTargets;
  getCheck("pref-linear").checked = contract.preferences.linearNavigation;
  getCheck("pref-reducedmotion").checked = contract.preferences.reducedMotion;
  getCheck("pref-spoken").checked = contract.preferences.spokenFeedback;
  getCheck("pref-confirm").checked = contract.preferences.confirmBeforeAction ?? true;
}

function readForm(existing: InteractionContract): InteractionContract {
  return {
    ...existing,
    input: {
      keyboard: selectValue("input-keyboard"),
      pointer: selectValue("input-pointer"),
      touch: selectValue("input-touch"),
      voice: selectValue("input-voice"),
      switch: selectValue("input-switch"),
    },
    actions: {
      drag: selectValue("actions-drag"),
      precisionTargeting: selectValue("actions-precision"),
      complexShortcuts: selectValue("actions-shortcuts"),
    },
    perception: {
      smallText: selectValue("perception-smalltext"),
      colorContrast: selectValue("perception-contrast"),
      motion: selectValue("perception-motion"),
    },
    preferences: {
      largeTargets: checkValue("pref-largetargets"),
      linearNavigation: checkValue("pref-linear"),
      reducedMotion: checkValue("pref-reducedmotion"),
      spokenFeedback: checkValue("pref-spoken"),
      confirmBeforeAction: checkValue("pref-confirm"),
    },
  };
}

function setStatus(message: string, type: "success" | "error" | ""): void {
  const el = document.getElementById("status");
  if (!el) return;
  el.textContent = message;
  el.className = type;
}

async function init(): Promise<void> {
  let currentContract = await loadContract();
  populateForm(currentContract);

  const form = document.getElementById("contract-form") as HTMLFormElement;
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    setStatus("", "");

    const updated = readForm(currentContract);
    try {
      await saveContract(updated);
      currentContract = await loadContract(); // reload to confirm persisted
      setStatus("Settings saved.", "success");

      // Log locally (no telemetry — WP-006 integrates later)
      console.info("[AUA] InteractionContract updated", new Date().toISOString());
    } catch (err) {
      setStatus(`Save failed: ${err instanceof Error ? err.message : String(err)}`, "error");
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  void init();
});
