// src/shared/interaction-contract.ts
var INTERACTION_CONTRACT_VERSION = "1.0.0";
var DEFAULT_CONTRACT = {
  version: INTERACTION_CONTRACT_VERSION,
  contractId: "",
  updatedAt: "",
  input: {
    keyboard: "unknown",
    pointer: "unknown",
    touch: "unknown",
    voice: "unknown",
    switch: "unknown"
  },
  actions: {
    drag: "unknown",
    precisionTargeting: "unknown",
    complexShortcuts: "unknown"
  },
  perception: {
    smallText: "unknown"
  },
  preferences: {
    largeTargets: false,
    linearNavigation: false,
    reducedMotion: false,
    spokenFeedback: false,
    confirmBeforeAction: true
  }
};
function isAvailability(value) {
  return value === "available" || value === "unavailable" || value === "unknown" || value === "difficult";
}
function isValidContract(raw) {
  if (typeof raw !== "object" || raw === null) return false;
  const c = raw;
  if (c["version"] !== INTERACTION_CONTRACT_VERSION) return false;
  if (typeof c["contractId"] !== "string") return false;
  if (typeof c["updatedAt"] !== "string") return false;
  const input = c["input"];
  if (!input) return false;
  for (const key of ["keyboard", "pointer", "touch", "voice", "switch"]) {
    if (!isAvailability(input[key])) return false;
  }
  const actions = c["actions"];
  if (!actions) return false;
  for (const key of ["drag", "precisionTargeting", "complexShortcuts"]) {
    if (!isAvailability(actions[key])) return false;
  }
  const perception = c["perception"];
  if (!perception) return false;
  if (!isAvailability(perception["smallText"])) return false;
  if ("colorContrast" in perception && !isAvailability(perception["colorContrast"])) return false;
  if ("motion" in perception && !isAvailability(perception["motion"])) return false;
  const prefs = c["preferences"];
  if (!prefs) return false;
  for (const key of ["largeTargets", "linearNavigation", "reducedMotion", "spokenFeedback"]) {
    if (typeof prefs[key] !== "boolean") return false;
  }
  return true;
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

// src/shared/storage.ts
var STORAGE_KEY = "aua_contract";
var memoryStore = /* @__PURE__ */ new Map();
function isChromeStorageAvailable() {
  return typeof chrome !== "undefined" && chrome.storage !== void 0 && chrome.storage.local !== void 0;
}
async function loadContract() {
  if (isChromeStorageAvailable()) {
    return new Promise((resolve) => {
      chrome.storage.local.get(STORAGE_KEY, (result) => {
        const raw2 = result[STORAGE_KEY];
        if (isValidContract(raw2)) {
          resolve(raw2);
        } else {
          resolve(freshDefault());
        }
      });
    });
  }
  const raw = memoryStore.get(STORAGE_KEY);
  return isValidContract(raw) ? raw : freshDefault();
}
async function saveContract(contract) {
  if (!isValidContract(contract)) {
    return Promise.reject(
      new Error("Invalid InteractionContract: failed validation before save")
    );
  }
  const toSave = {
    ...contract,
    version: INTERACTION_CONTRACT_VERSION,
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  if (isChromeStorageAvailable()) {
    return new Promise((resolve, reject) => {
      chrome.storage.local.set({ [STORAGE_KEY]: toSave }, () => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve();
        }
      });
    });
  }
  memoryStore.set(STORAGE_KEY, toSave);
}
function freshDefault() {
  return {
    ...DEFAULT_CONTRACT,
    contractId: generateId(),
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
}

// src/bootstrap/popup.ts
function getSelect(id) {
  return document.getElementById(id);
}
function getCheck(id) {
  return document.getElementById(id);
}
function selectValue(id) {
  const val = getSelect(id).value;
  return isAvailability(val) ? val : "unknown";
}
function checkValue(id) {
  return getCheck(id).checked;
}
function populateForm(contract) {
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
function readForm(existing) {
  return {
    ...existing,
    input: {
      keyboard: selectValue("input-keyboard"),
      pointer: selectValue("input-pointer"),
      touch: selectValue("input-touch"),
      voice: selectValue("input-voice"),
      switch: selectValue("input-switch")
    },
    actions: {
      drag: selectValue("actions-drag"),
      precisionTargeting: selectValue("actions-precision"),
      complexShortcuts: selectValue("actions-shortcuts")
    },
    perception: {
      smallText: selectValue("perception-smalltext"),
      colorContrast: selectValue("perception-contrast"),
      motion: selectValue("perception-motion")
    },
    preferences: {
      largeTargets: checkValue("pref-largetargets"),
      linearNavigation: checkValue("pref-linear"),
      reducedMotion: checkValue("pref-reducedmotion"),
      spokenFeedback: checkValue("pref-spoken"),
      confirmBeforeAction: checkValue("pref-confirm")
    }
  };
}
function setStatus(message, type) {
  const el = document.getElementById("status");
  if (!el) return;
  el.textContent = message;
  el.className = type;
}
async function init() {
  let currentContract = await loadContract();
  populateForm(currentContract);
  const form = document.getElementById("contract-form");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    setStatus("", "");
    const updated = readForm(currentContract);
    try {
      await saveContract(updated);
      currentContract = await loadContract();
      setStatus("Settings saved.", "success");
      console.info("[AUA] InteractionContract updated", (/* @__PURE__ */ new Date()).toISOString());
    } catch (err) {
      setStatus(`Save failed: ${err instanceof Error ? err.message : String(err)}`, "error");
    }
  });
}
document.addEventListener("DOMContentLoaded", () => {
  void init();
});
//# sourceMappingURL=popup.js.map
