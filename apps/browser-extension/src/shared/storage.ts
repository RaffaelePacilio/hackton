import {
  DEFAULT_CONTRACT,
  InteractionContract,
  isValidContract,
  INTERACTION_CONTRACT_VERSION,
} from "./interaction-contract.js";
import { generateId } from "./uuid.js";

const STORAGE_KEY = "aua_contract";

// In-memory fallback used when chrome.storage is unavailable (test environments)
const memoryStore = new Map<string, unknown>();

function isChromeStorageAvailable(): boolean {
  return (
    typeof chrome !== "undefined" &&
    chrome.storage !== undefined &&
    chrome.storage.local !== undefined
  );
}

export async function loadContract(): Promise<InteractionContract> {
  if (isChromeStorageAvailable()) {
    return new Promise((resolve) => {
      chrome.storage.local.get(STORAGE_KEY, (result) => {
        const raw = result[STORAGE_KEY];
        if (isValidContract(raw)) {
          resolve(raw);
        } else {
          resolve(freshDefault());
        }
      });
    });
  }

  const raw = memoryStore.get(STORAGE_KEY);
  return isValidContract(raw) ? raw : freshDefault();
}

export async function saveContract(contract: InteractionContract): Promise<void> {
  if (!isValidContract(contract)) {
    return Promise.reject(
      new Error("Invalid InteractionContract: failed validation before save")
    );
  }

  const toSave: InteractionContract = {
    ...contract,
    version: INTERACTION_CONTRACT_VERSION,
    updatedAt: new Date().toISOString(),
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

function freshDefault(): InteractionContract {
  return {
    ...DEFAULT_CONTRACT,
    contractId: generateId(),
    updatedAt: new Date().toISOString(),
  };
}
