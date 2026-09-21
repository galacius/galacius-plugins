import { useEffect, useState } from "react";
import { GetSettings, GetCapabilities, SaveSettings, ResetSettings } from "../api/bridge";
import type { Settings, Capabilities } from "../api/resources";
import { METRIC_CLASS_LABELS, DEFAULT_THRESHOLDS } from "../utils";
import { ResourcesFooterWidget } from "./ResourcesFooterWidget";
import { MetricOrderList } from "./settings/MetricOrderList";
import { ThresholdsSection } from "./settings/ThresholdsSection";

export function ResourcesMonitorSettingsTab() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [capabilities, setCapabilities] = useState<Capabilities | null>(null);
  const [intervalMs, setIntervalMs] = useState(2000);
  const [thresholds, setThresholds] =
    useState<Record<string, { warn: number; critical: number }>>(DEFAULT_THRESHOLDS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([GetSettings(), GetCapabilities()])
      .then(([s, c]) => {
        setSettings(s);
        setCapabilities(c);
        setIntervalMs(s.intervalMs);
      })
      .catch((err) => {
        console.error("Failed to load settings:", err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const handleSaveSettings = async () => {
    if (!settings) return;
    try {
      await SaveSettings(settings);
    } catch (err) {
      console.error("Failed to save settings:", err);
    }
  };

  const handleIntervalChange = async (newInterval: number) => {
    setIntervalMs(newInterval);
    if (!settings) return;
    const updated = { ...settings, intervalMs: newInterval };
    setSettings(updated);
    try {
      await SaveSettings(updated);
    } catch (err) {
      console.error("Failed to save interval:", err);
    }
  };

  const handleMetricToggle = async (metricClass: string, enabled: boolean) => {
    if (!settings) return;
    const updated = {
      ...settings,
      enabledMetrics: {
        ...settings.enabledMetrics,
        [metricClass]: enabled,
      },
    };
    setSettings(updated);
    try {
      await SaveSettings(updated);
    } catch (err) {
      console.error("Failed to toggle metric:", err);
    }
  };

  const handleReorderMetrics = async (newOrder: string[]) => {
    if (!settings) return;
    const updated = {
      ...settings,
      metricOrder: newOrder,
    };
    setSettings(updated);
    try {
      await SaveSettings(updated);
    } catch (err) {
      console.error("Failed to reorder metrics:", err);
    }
  };

  const handleResetSettings = async () => {
    if (window.confirm("Reset all settings to defaults?")) {
      try {
        await ResetSettings();
        const updated = await GetSettings();
        setSettings(updated);
        setIntervalMs(updated.intervalMs);
      } catch (err) {
        console.error("Failed to reset settings:", err);
      }
    }
  };

  if (loading || !settings || !capabilities) {
    return <div className="p-4">Loading...</div>;
  }

  const enabledMetrics = settings.metricOrder.filter(
    (m) => settings.enabledMetrics[m] && (capabilities as any)[m]
  );

  return (
    <div className="flex h-full flex-col">
      {/* Live preview bar */}
      <div className="sticky top-0 z-10 border-b border-neutral-200 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-950">
        <ResourcesFooterWidget />
      </div>

      {/* Scrollable settings sections */}
      <div className="flex-1 space-y-6 overflow-y-auto p-4">
        {/* Metrics section */}
        <div>
          <h3 className="mb-3 text-sm font-semibold">Metrics</h3>
          <MetricOrderList
            metricOrder={settings.metricOrder}
            enabledMetrics={settings.enabledMetrics}
            capabilities={capabilities}
            onToggle={handleMetricToggle}
            onReorder={handleReorderMetrics}
          />
        </div>

        {/* Refresh interval section */}
        <div>
          <h3 className="mb-3 text-sm font-semibold">Refresh Interval</h3>
          <div className="space-y-2">
            <input
              type="range"
              min="500"
              max="60000"
              step="500"
              value={intervalMs}
              onChange={(e) => handleIntervalChange(Number(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-neutral-500">
              <span>500ms</span>
              <span className="font-mono font-semibold text-neutral-700 dark:text-neutral-300">
                {intervalMs}ms
              </span>
              <span>60s</span>
            </div>
            <p className="mt-2 text-xs text-neutral-500">
              Shorter intervals increase CPU usage. Recommended: 2000ms.
            </p>
          </div>
        </div>

        {/* Thresholds section */}
        <ThresholdsSection thresholds={thresholds} enabledMetrics={enabledMetrics} />

        {/* Reset button */}
        <div className="border-t border-neutral-200 pt-4 dark:border-neutral-800">
          <button
            onClick={handleResetSettings}
            className="rounded bg-neutral-100 px-4 py-2 text-sm text-neutral-700 transition-colors hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700"
          >
            Reset to Defaults
          </button>
        </div>
      </div>
    </div>
  );
}
