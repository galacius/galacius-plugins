import { useSyncExternalStore } from "react";
import { GetSnapshot } from "../api/bridge";
import type { ResourcesSample } from "../api/resources";

let lastSample: ResourcesSample | null = null;
const listeners: Set<() => void> = new Set();
let eventListenerRegistered = false;

function notifyListeners() {
  listeners.forEach((listener) => listener());
}

interface WailsWindow {
  go?: {
    Run?: (topic: string, handler: (event: WailsEvent) => void) => void;
  };
}

interface WailsEvent {
  payload?: {
    topic?: string;
    data?: ResourcesSample;
  };
}

function subscribeToEvents() {
  if (eventListenerRegistered) return;
  eventListenerRegistered = true;

  // Register event listener if available
  if (typeof window !== "undefined" && (window as WailsWindow).go?.Run) {
    const go = (window as WailsWindow).go;
    go.Run("plugin:event", (event: WailsEvent) => {
      if (event?.payload?.topic === "plugins.resources-monitor.metrics:sample") {
        try {
          lastSample = event.payload.data as ResourcesSample;
          notifyListeners();
        } catch (err) {
          console.error("Failed to parse metrics sample event:", err);
        }
      }
    });
  }
}

export function useLiveSampleStore() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      subscribeToEvents();

      // Fetch initial snapshot on mount
      GetSnapshot()
        .then((sample) => {
          lastSample = sample;
          notifyListeners();
        })
        .catch((err) => {
          console.error("Failed to fetch initial snapshot:", err);
        });

      return () => {
        listeners.delete(listener);
      };
    },
    () => lastSample,
    () => null
  );
}
