import { useSyncExternalStore } from "react";
import { GetSnapshot } from "../api/bridge";
import type { ResourcesSample } from "../api/resources";

let lastSample: ResourcesSample | null = null;
const listeners: Set<() => void> = new Set();
let subscriptionStarted = false;

function notifyListeners() {
  listeners.forEach((listener) => listener());
}

export function updateLiveSample(sample: ResourcesSample): void {
  lastSample = sample;
  notifyListeners();
}

function startSubscription() {
  if (subscriptionStarted) return;
  subscriptionStarted = true;

  GetSnapshot()
    .then((sample) => {
      lastSample = sample;
      notifyListeners();
    })
    .catch((err) => {
      console.error("Failed to fetch initial snapshot:", err);
    });
}

export function useLiveSampleStore() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      startSubscription();

      return () => {
        listeners.delete(listener);
      };
    },
    () => lastSample,
    () => null
  );
}
