import { ConfirmationModal } from "@galacius/design-system";
import { FC, useEffect, useRef, useState } from "react";
import type { Settings } from "../api/resources";
import { useGetCapabilities } from "../hooks/data-access/useGetCapabilities";
import { useGetSettings } from "../hooks/data-access/useGetSettings";
import { useResetSettings } from "../hooks/data-mutation/useResetSettings";
import { useSaveSettings } from "../hooks/data-mutation/useSaveSettings";
import { getSupportedEnabledMetrics, isKnownMetricClass } from "../utils";
import { DisplaySection } from "./settings/DisplaySection";
import { MetricOrderList } from "./settings/MetricOrderList";
import { ThresholdsSection } from "./settings/ThresholdsSection";

export const ResourcesMonitorSettingsTab: FC = () => {
  const { data: settings } = useGetSettings();
  const { data: capabilities } = useGetCapabilities();
  const saveSettings = useSaveSettings();
  const resetSettings = useResetSettings();

  const [intervalMs, setIntervalMs] = useState(2000);
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const intervalInitialized = useRef(false);

  useEffect(() => {
    if (settings && !intervalInitialized.current) {
      intervalInitialized.current = true;
      setIntervalMs(settings.intervalMs);
    }
  }, [settings]);

  const handleIntervalChange = (newInterval: number) => {
    setIntervalMs(newInterval);
  };

  const handleIntervalRelease = async () => {
    if (!settings) return;
    const updated = { ...settings, intervalMs };
    try {
      await saveSettings.mutateAsync(updated);
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
    try {
      await saveSettings.mutateAsync(updated);
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
    try {
      await saveSettings.mutateAsync(updated);
    } catch (err) {
      console.error("Failed to reorder metrics:", err);
    }
  };

  const handleSettingsChange = async (updated: Settings) => {
    try {
      await saveSettings.mutateAsync(updated);
    } catch (err) {
      console.error("Failed to save settings:", err);
    }
  };

  const handleResetConfirm = async () => {
    try {
      const updated = await resetSettings.mutateAsync();
      setIntervalMs(updated.intervalMs);
      setResetModalOpen(false);
    } catch (err) {
      console.error("Failed to reset settings:", err);
    }
  };

  if (!settings || !capabilities) {
    return <div className="p-4">Loading...</div>;
  }

  const knownMetricOrder = settings.metricOrder.filter(isKnownMetricClass);
  const enabledMetrics = getSupportedEnabledMetrics(
    settings.metricOrder,
    settings.enabledMetrics,
    capabilities
  );

  return (
    <div className="flex h-full flex-col">
      {/* Scrollable settings sections */}
      <div className="flex-1 space-y-6 overflow-y-auto">
        {/* Metrics section */}
        <div>
          <h3 className="mb-3 text-sm font-semibold">Metrics</h3>
          <MetricOrderList
            metricOrder={knownMetricOrder}
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
              onPointerUp={handleIntervalRelease}
              onMouseUp={handleIntervalRelease}
              onTouchEnd={handleIntervalRelease}
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

        {/* Display section */}
        <DisplaySection
          settings={settings}
          enabledMetrics={enabledMetrics}
          onSettingsChange={handleSettingsChange}
        />

        {/* Thresholds section */}
        <ThresholdsSection
          settings={settings}
          enabledMetrics={enabledMetrics}
          onSettingsChange={handleSettingsChange}
        />

        {/* Reset button */}
        <div className="border-t border-neutral-200 pt-4 dark:border-neutral-800">
          <button
            onClick={() => setResetModalOpen(true)}
            className="rounded bg-neutral-100 px-4 py-2 text-sm text-neutral-700 transition-colors hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700"
          >
            Reset to Defaults
          </button>
        </div>
      </div>

      {/* Reset confirmation modal */}
      <ConfirmationModal
        open={resetModalOpen}
        title="Reset to Defaults"
        description="This will reset all settings to their default values. This action cannot be undone."
        confirmLabel="Reset"
        confirmVariant="destructive"
        isPending={resetSettings.isPending}
        onClose={() => setResetModalOpen(false)}
        onConfirm={handleResetConfirm}
      />
    </div>
  );
};
